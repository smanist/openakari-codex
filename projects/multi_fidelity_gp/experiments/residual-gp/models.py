from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from gp import GaussianProcessRegressor1D


PredictFn = Callable[[np.ndarray], np.ndarray]


@dataclass(frozen=True)
class PredictiveDistribution:
    mean: np.ndarray
    std: np.ndarray


class LowFidelityOnlyModel:
    def __init__(self, f_lf: PredictFn) -> None:
        self._f_lf = f_lf

    def predict(self, x: np.ndarray) -> PredictiveDistribution:
        mean = np.asarray(self._f_lf(x), dtype=float).reshape(-1)
        std = np.zeros_like(mean)
        return PredictiveDistribution(mean=mean, std=std)


class HighFidelityGPModel:
    def __init__(self, *, gp: GaussianProcessRegressor1D | None = None) -> None:
        self._gp = gp or GaussianProcessRegressor1D()

    def fit(self, x_hf: np.ndarray, y_hf: np.ndarray) -> "HighFidelityGPModel":
        self._gp.fit(x_hf, y_hf)
        return self

    def predict(self, x: np.ndarray) -> PredictiveDistribution:
        mean, std = self._gp.predict(x, return_std=True)
        return PredictiveDistribution(mean=mean, std=std)


class ResidualGPCorrectionModel:
    def __init__(self, f_lf: PredictFn, *, gp: GaussianProcessRegressor1D | None = None) -> None:
        self._f_lf = f_lf
        self._gp = gp or GaussianProcessRegressor1D()

    def fit(self, x_hf: np.ndarray, y_hf: np.ndarray) -> "ResidualGPCorrectionModel":
        x_hf = np.asarray(x_hf, dtype=float).reshape(-1)
        y_hf = np.asarray(y_hf, dtype=float).reshape(-1)
        residual = y_hf - np.asarray(self._f_lf(x_hf), dtype=float).reshape(-1)
        self._gp.fit(x_hf, residual)
        return self

    def predict(self, x: np.ndarray) -> PredictiveDistribution:
        x = np.asarray(x, dtype=float).reshape(-1)
        lf = np.asarray(self._f_lf(x), dtype=float).reshape(-1)
        r_mean, r_std = self._gp.predict(x, return_std=True)
        return PredictiveDistribution(mean=lf + r_mean, std=r_std)

