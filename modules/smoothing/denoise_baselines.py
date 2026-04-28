from __future__ import annotations

from typing import Literal

import numpy as np
from scipy.signal import savgol_filter


KernelType = Literal["gaussian", "compact_polynomial"]


def _as_signal_array(signal: np.ndarray) -> np.ndarray:
    array = np.asarray(signal, dtype=np.float64)
    if array.ndim != 2:
        raise ValueError("signal must have shape (n_samples, n_coordinates)")
    if array.shape[0] == 0:
        raise ValueError("signal must be non-empty along the sample axis")
    return array


def savitzky_golay_denoise(
    signal: np.ndarray,
    *,
    window_length: int,
    polyorder: int,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    return np.asarray(
        savgol_filter(
            signal_array,
            window_length=window_length,
            polyorder=polyorder,
            deriv=0,
            delta=1.0,
            axis=0,
            mode="interp",
        ),
        dtype=np.float64,
    )


def _kernel_basis(
    *,
    n_samples: int,
    n_anchors: int,
    bandwidth: float,
    kernel: KernelType,
    degree: int | None = None,
) -> np.ndarray:
    if n_anchors < 2:
        raise ValueError("n_anchors must be at least 2")
    if n_anchors > n_samples:
        raise ValueError("n_anchors must be less than or equal to n_samples")
    if bandwidth <= 0:
        raise ValueError("bandwidth must be positive")
    if kernel == "compact_polynomial" and (degree is None or degree < 1):
        raise ValueError("compact_polynomial kernel requires degree >= 1")
    if kernel == "gaussian" and degree is not None:
        raise ValueError("gaussian kernel does not use degree")

    sample_index = np.arange(n_samples, dtype=np.float64)
    anchors = np.linspace(0.0, float(n_samples - 1), num=n_anchors, dtype=np.float64)
    scaled_distance = (sample_index[:, None] - anchors[None, :]) / bandwidth

    if kernel == "gaussian":
        return np.exp(-0.5 * scaled_distance**2)

    basis = np.zeros((n_samples, n_anchors), dtype=np.float64)
    support = np.abs(scaled_distance) <= 1.0
    basis[support] = (1.0 - scaled_distance[support] ** 2) ** int(degree)
    return basis


def kernel_denoise(
    signal: np.ndarray,
    *,
    n_anchors: int,
    bandwidth: float,
    kernel: KernelType,
    degree: int | None = None,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    basis = _kernel_basis(
        n_samples=signal_array.shape[0],
        n_anchors=n_anchors,
        bandwidth=bandwidth,
        kernel=kernel,
        degree=degree,
    )
    coefficients = np.linalg.pinv(basis) @ signal_array
    return basis @ coefficients


def gaussian_kernel_denoise(
    signal: np.ndarray,
    *,
    n_anchors: int,
    bandwidth: float,
) -> np.ndarray:
    return kernel_denoise(
        signal,
        n_anchors=n_anchors,
        bandwidth=bandwidth,
        kernel="gaussian",
    )


def compact_polynomial_kernel_denoise(
    signal: np.ndarray,
    *,
    n_anchors: int,
    bandwidth: float,
    degree: int,
) -> np.ndarray:
    return kernel_denoise(
        signal,
        n_anchors=n_anchors,
        bandwidth=bandwidth,
        kernel="compact_polynomial",
        degree=degree,
    )
