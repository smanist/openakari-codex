from __future__ import annotations

import numpy as np

X_MIN = -4.0
X_MAX = 4.0


def f_true(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    return np.sin(1.7 * x) + 0.25 * x + 0.55 * np.exp(-0.9 * (x - 1.1) ** 2)


def f_lf(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    return (
        0.82 * np.sin(1.45 * x + 0.2)
        + 0.20 * x
        + 0.30 * np.exp(-0.55 * (x - 0.6) ** 2)
        - 0.12
    )


def make_default_splits() -> tuple[np.ndarray, np.ndarray]:
    train_x = np.linspace(-3.8, 3.8, 12)
    test_x = np.linspace(X_MIN, X_MAX, 80)
    return train_x, test_x
