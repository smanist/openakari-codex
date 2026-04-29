from __future__ import annotations

from typing import Literal

import numpy as np
from scipy.interpolate import UnivariateSpline


KernelType = Literal["gaussian", "tricube"]


def _as_signal_array(signal: np.ndarray) -> np.ndarray:
    array = np.asarray(signal, dtype=np.float64)
    if array.ndim != 2:
        raise ValueError("signal must have shape (n_samples, n_coordinates)")
    if array.shape[0] == 0:
        raise ValueError("signal must be non-empty along the sample axis")
    return array


def span_to_radius(span: int) -> int:
    if span < 3 or span % 2 == 0:
        raise ValueError("span must be an odd integer >= 3")
    return (int(span) - 1) // 2


def _kernel_weights(offsets: np.ndarray, *, kernel: KernelType, radius: int) -> np.ndarray:
    if radius < 1:
        raise ValueError("radius must be at least 1")

    offsets_array = np.asarray(offsets, dtype=np.float64)
    if kernel == "gaussian":
        bandwidth = float(radius) / 3.0
        weights = np.exp(-0.5 * (offsets_array / bandwidth) ** 2)
        return np.where(np.abs(offsets_array) <= radius, weights, 0.0)

    scaled = offsets_array / float(radius)
    weights = np.zeros_like(scaled, dtype=np.float64)
    support = np.abs(scaled) <= 1.0
    weights[support] = (1.0 - np.abs(scaled[support]) ** 3) ** 3
    return weights


def normalized_kernel_regression_denoise(
    signal: np.ndarray,
    *,
    kernel: KernelType,
    span: int,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    n_samples = signal_array.shape[0]
    radius = span_to_radius(span)
    sample_index = np.arange(n_samples, dtype=np.float64)
    denoised = np.empty_like(signal_array)

    for target in range(n_samples):
        start = max(0, target - radius)
        stop = min(n_samples, target + radius + 1)
        local_index = sample_index[start:stop]
        offsets = local_index - float(target)
        weights = _kernel_weights(offsets, kernel=kernel, radius=radius)
        weight_sum = float(np.sum(weights))
        if weight_sum <= 0.0:
            raise ValueError(f"Kernel weights vanished at target index {target}")
        denoised[target] = (weights[:, None] * signal_array[start:stop]).sum(axis=0) / weight_sum

    return denoised


def local_linear_regression_denoise(
    signal: np.ndarray,
    *,
    kernel: KernelType,
    span: int,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    n_samples = signal_array.shape[0]
    radius = span_to_radius(span)
    sample_index = np.arange(n_samples, dtype=np.float64)
    denoised = np.empty_like(signal_array)

    for target in range(n_samples):
        start = max(0, target - radius)
        stop = min(n_samples, target + radius + 1)
        local_index = sample_index[start:stop]
        centered = local_index - float(target)
        weights = _kernel_weights(centered, kernel=kernel, radius=radius)
        design = np.column_stack([np.ones_like(centered), centered])
        weighted_design = design * weights[:, None]
        gram = design.T @ weighted_design
        rhs = weighted_design.T @ signal_array[start:stop]
        coefficients = np.linalg.pinv(gram) @ rhs
        denoised[target] = coefficients[0]

    return denoised


def spline_smoothing_factors(
    signal: np.ndarray,
    *,
    alpha: float,
    lambda_rel: float,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    if alpha < 0.0:
        raise ValueError("alpha must be non-negative")
    if lambda_rel <= 0.0:
        raise ValueError("lambda_rel must be positive")
    observable_scale = np.mean(np.abs(signal_array), axis=0)
    return float(lambda_rel) * signal_array.shape[0] * (float(alpha) * observable_scale) ** 2


def cubic_smoothing_spline_denoise(
    signal: np.ndarray,
    *,
    alpha: float,
    lambda_rel: float,
) -> np.ndarray:
    signal_array = _as_signal_array(signal)
    n_samples = signal_array.shape[0]
    if n_samples < 4:
        raise ValueError("cubic_smoothing_spline_denoise requires at least 4 samples")

    x_values = np.arange(n_samples, dtype=np.float64)
    smoothing_factors = spline_smoothing_factors(signal_array, alpha=alpha, lambda_rel=lambda_rel)
    denoised = np.empty_like(signal_array)

    for coordinate in range(signal_array.shape[1]):
        spline = UnivariateSpline(
            x_values,
            signal_array[:, coordinate],
            k=3,
            s=float(smoothing_factors[coordinate]),
        )
        denoised[:, coordinate] = np.asarray(spline(x_values), dtype=np.float64)

    return denoised
