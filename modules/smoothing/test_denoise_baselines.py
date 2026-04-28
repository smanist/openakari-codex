from __future__ import annotations

import numpy as np
from scipy.signal import savgol_filter

from modules.smoothing.denoise_baselines import (
    compact_polynomial_kernel_denoise,
    gaussian_kernel_denoise,
    savitzky_golay_denoise,
)


def _gaussian_projection(signal: np.ndarray, *, n_anchors: int, bandwidth: float) -> np.ndarray:
    n_samples = signal.shape[0]
    sample_index = np.arange(n_samples, dtype=np.float64)
    anchors = np.linspace(0.0, float(n_samples - 1), num=n_anchors, dtype=np.float64)
    basis = np.exp(-0.5 * ((sample_index[:, None] - anchors[None, :]) / bandwidth) ** 2)
    return basis @ np.linalg.pinv(basis) @ signal


def _compact_polynomial_projection(
    signal: np.ndarray,
    *,
    n_anchors: int,
    bandwidth: float,
    degree: int,
) -> np.ndarray:
    n_samples = signal.shape[0]
    sample_index = np.arange(n_samples, dtype=np.float64)
    anchors = np.linspace(0.0, float(n_samples - 1), num=n_anchors, dtype=np.float64)
    scaled_distance = (sample_index[:, None] - anchors[None, :]) / bandwidth
    basis = np.zeros((n_samples, n_anchors), dtype=np.float64)
    support = np.abs(scaled_distance) <= 1.0
    basis[support] = (1.0 - scaled_distance[support] ** 2) ** degree
    return basis @ np.linalg.pinv(basis) @ signal


def test_savitzky_golay_denoise_matches_scipy_interp_mode() -> None:
    signal = np.array(
        [
            [0.0, 2.0, -1.0],
            [1.0, 1.0, -0.5],
            [2.0, 0.0, 0.0],
            [3.0, -1.0, 0.5],
            [4.0, -2.0, 1.0],
            [5.0, -1.0, 1.5],
            [6.0, 0.0, 2.0],
        ],
        dtype=np.float64,
    )

    expected = savgol_filter(signal, window_length=5, polyorder=2, axis=0, mode="interp")
    actual = savitzky_golay_denoise(signal, window_length=5, polyorder=2)

    assert actual.shape == signal.shape
    np.testing.assert_allclose(actual, expected, atol=1e-12)


def test_gaussian_kernel_denoise_matches_anchor_basis_projection() -> None:
    signal = np.array(
        [
            [1.0, 0.0, -1.0],
            [0.5, 1.0, -0.5],
            [0.0, 2.0, 0.0],
            [-0.5, 1.0, 0.5],
            [-1.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )

    expected = _gaussian_projection(signal, n_anchors=3, bandwidth=1.5)
    actual = gaussian_kernel_denoise(signal, n_anchors=3, bandwidth=1.5)

    assert actual.shape == signal.shape
    np.testing.assert_allclose(actual, expected, atol=1e-12)


def test_compact_polynomial_kernel_denoise_matches_anchor_basis_projection() -> None:
    signal = np.array(
        [
            [2.0, -1.0, 0.0],
            [1.5, -0.5, 0.5],
            [1.0, 0.0, 1.0],
            [0.5, 0.5, 1.5],
            [0.0, 1.0, 2.0],
        ],
        dtype=np.float64,
    )

    expected = _compact_polynomial_projection(signal, n_anchors=3, bandwidth=2.0, degree=2)
    actual = compact_polynomial_kernel_denoise(signal, n_anchors=3, bandwidth=2.0, degree=2)

    assert actual.shape == signal.shape
    np.testing.assert_allclose(actual, expected)
