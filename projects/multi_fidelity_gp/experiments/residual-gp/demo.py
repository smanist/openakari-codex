from __future__ import annotations

import csv
from pathlib import Path
import sys

import numpy as np

from models import HighFidelityGPModel, LowFidelityOnlyModel, ResidualGPCorrectionModel


def _load_xy(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        xs: list[float] = []
        ys: list[float] = []
        for row in reader:
            xs.append(float(row["x"]))
            ys.append(float(row["y_hf"]))
    return np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float).reshape(-1)
    y_pred = np.asarray(y_pred, dtype=float).reshape(-1)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def _import_benchmark_f_lf() -> object:
    this_dir = Path(__file__).resolve().parent
    bench_dir = (this_dir.parent / "synthetic-benchmark").resolve()
    sys.path.insert(0, str(bench_dir))
    try:
        from benchmark import f_lf  # type: ignore
    finally:
        sys.path.pop(0)
    return f_lf


def main() -> int:
    project_dir = Path(__file__).resolve().parents[2]
    train_csv = project_dir / "experiments" / "synthetic-benchmark" / "data" / "high_fidelity_train.csv"
    test_csv = project_dir / "experiments" / "synthetic-benchmark" / "data" / "high_fidelity_test.csv"

    x_train, y_train = _load_xy(train_csv)
    x_test, y_test = _load_xy(test_csv)

    f_lf = _import_benchmark_f_lf()

    lf = LowFidelityOnlyModel(f_lf).predict(x_test)
    hf = HighFidelityGPModel().fit(x_train, y_train).predict(x_test)
    mf = ResidualGPCorrectionModel(f_lf).fit(x_train, y_train).predict(x_test)

    print("Residual-GP demo (synthetic benchmark)")
    print(f"- Train points: {x_train.size}, test points: {x_test.size}")
    print(f"- Low-fidelity-only RMSE: { _rmse(y_test, lf.mean):.6f}")
    print(f"- High-fidelity-only GP RMSE: { _rmse(y_test, hf.mean):.6f}")
    print(f"- Residual correction GP RMSE: { _rmse(y_test, mf.mean):.6f}")

    if np.any(hf.std < 0) or np.any(mf.std < 0):
        raise RuntimeError("Predicted std contains negative values (should be clipped).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

