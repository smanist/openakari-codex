from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def rbf_kernel_1d(
    x1: np.ndarray, x2: np.ndarray, *, length_scale: float, signal_variance: float
) -> np.ndarray:
    x1 = np.asarray(x1, dtype=float).reshape(-1, 1)
    x2 = np.asarray(x2, dtype=float).reshape(1, -1)
    sqdist = (x1 - x2) ** 2
    return signal_variance * np.exp(-0.5 * sqdist / (length_scale**2))


def _median_pairwise_distance_1d(x: np.ndarray) -> float:
    x = np.asarray(x, dtype=float).reshape(-1)
    if x.size < 2:
        return 1.0
    diffs = np.abs(x.reshape(-1, 1) - x.reshape(1, -1))
    iu = np.triu_indices(x.size, 1)
    med = float(np.median(diffs[iu]))
    return med if np.isfinite(med) and med > 0 else 1.0


@dataclass(frozen=True)
class GPHyperparams:
    length_scale: float
    signal_variance: float
    noise_variance: float


class GaussianProcessRegressor1D:
    def __init__(
        self,
        *,
        length_scale: float | None = None,
        signal_variance: float | None = None,
        noise_variance: float = 1e-6,
        jitter: float = 1e-10,
    ) -> None:
        self._user_length_scale = length_scale
        self._user_signal_variance = signal_variance
        self._user_noise_variance = noise_variance
        self._jitter = jitter

        self.x_train: np.ndarray | None = None
        self.y_train: np.ndarray | None = None
        self.hyperparams: GPHyperparams | None = None
        self._L: np.ndarray | None = None
        self._alpha: np.ndarray | None = None

    def fit(self, x: np.ndarray, y: np.ndarray) -> "GaussianProcessRegressor1D":
        x = np.asarray(x, dtype=float).reshape(-1)
        y = np.asarray(y, dtype=float).reshape(-1)
        if x.size != y.size:
            raise ValueError(f"x and y must have same length (got {x.size} vs {y.size})")
        if x.size == 0:
            raise ValueError("Cannot fit GP with zero training points")

        length_scale = (
            float(self._user_length_scale)
            if self._user_length_scale is not None
            else _median_pairwise_distance_1d(x)
        )
        if not np.isfinite(length_scale) or length_scale <= 0:
            raise ValueError(f"Invalid length_scale: {length_scale}")

        if self._user_signal_variance is None:
            signal_variance = float(np.var(y))
            if not np.isfinite(signal_variance) or signal_variance <= 0:
                signal_variance = 1.0
        else:
            signal_variance = float(self._user_signal_variance)

        noise_variance = float(self._user_noise_variance)
        if not np.isfinite(noise_variance) or noise_variance < 0:
            raise ValueError(f"Invalid noise_variance: {noise_variance}")

        K = rbf_kernel_1d(x, x, length_scale=length_scale, signal_variance=signal_variance)
        K = K + (noise_variance + self._jitter) * np.eye(x.size)

        L = np.linalg.cholesky(K)
        alpha = np.linalg.solve(L.T, np.linalg.solve(L, y))

        self.x_train = x
        self.y_train = y
        self.hyperparams = GPHyperparams(
            length_scale=length_scale,
            signal_variance=signal_variance,
            noise_variance=noise_variance,
        )
        self._L = L
        self._alpha = alpha
        return self

    def predict(
        self, x: np.ndarray, *, return_std: bool = False
    ) -> np.ndarray | tuple[np.ndarray, np.ndarray]:
        if self.x_train is None or self.hyperparams is None or self._L is None or self._alpha is None:
            raise RuntimeError("Call fit() before predict().")

        x = np.asarray(x, dtype=float).reshape(-1)
        x_train = self.x_train
        hp = self.hyperparams
        L = self._L
        alpha = self._alpha

        K_star = rbf_kernel_1d(
            x, x_train, length_scale=hp.length_scale, signal_variance=hp.signal_variance
        )
        mean = K_star @ alpha

        if not return_std:
            return mean

        v = np.linalg.solve(L, K_star.T)
        prior_var = np.full(x.shape, hp.signal_variance, dtype=float)
        var = prior_var - np.sum(v * v, axis=0)
        var = np.maximum(var, 0.0)
        std = np.sqrt(var)
        return mean, std

