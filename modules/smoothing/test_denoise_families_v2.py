from __future__ import annotations

import numpy as np

from modules.smoothing.denoise_families_v2 import (
    cubic_smoothing_spline_denoise,
    local_linear_regression_denoise,
    normalized_kernel_regression_denoise,
    spline_smoothing_factors,
)


def test_normalized_kernel_regression_preserves_constant_signal() -> None:
    signal = np.tile(np.array([[1.5, -2.0, 0.75]], dtype=np.float64), (17, 1))

    for kernel in ("gaussian", "tricube"):
        denoised = normalized_kernel_regression_denoise(signal, kernel=kernel, span=11)
        np.testing.assert_allclose(denoised, signal, atol=1e-10)


def test_local_linear_regression_reproduces_linear_signal() -> None:
    x = np.arange(17, dtype=np.float64)[:, None]
    signal = np.concatenate(
        [
            2.0 * x + 1.0,
            -0.5 * x + 3.0,
            0.25 * x - 7.0,
        ],
        axis=1,
    )

    for kernel in ("gaussian", "tricube"):
        denoised = local_linear_regression_denoise(signal, kernel=kernel, span=11)
        np.testing.assert_allclose(denoised, signal, atol=1e-10)


def test_spline_smoothing_factors_follow_observable_scale_contract() -> None:
    signal = np.array(
        [
            [1.0, -2.0, 0.5],
            [2.0, -1.0, 0.0],
            [3.0, 0.0, -0.5],
            [4.0, 1.0, -1.0],
            [5.0, 2.0, -1.5],
            [6.0, 3.0, -2.0],
        ],
        dtype=np.float64,
    )
    alpha = 0.1
    lambda_rel = 2.0

    expected = lambda_rel * signal.shape[0] * (alpha * np.mean(np.abs(signal), axis=0)) ** 2
    np.testing.assert_allclose(spline_smoothing_factors(signal, alpha=alpha, lambda_rel=lambda_rel), expected)

    denoised = cubic_smoothing_spline_denoise(signal, alpha=alpha, lambda_rel=lambda_rel)
    assert denoised.shape == signal.shape
    assert np.isfinite(denoised).all()
