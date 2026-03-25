from __future__ import annotations

import argparse
import csv
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from benchmark import X_MAX, X_MIN, f_lf, f_true, make_default_splits


def _write_csv(path: Path, x: np.ndarray, y_hf: np.ndarray) -> None:
    y_lf = f_lf(x)
    rows = [
        {
            "x": float(xi),
            "y_hf": float(yi),
            "y_lf": float(yli),
            "residual": float(yi - yli),
        }
        for xi, yi, yli in zip(x, y_hf, y_lf, strict=True)
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=list(rows[0].keys()), lineterminator="\n"
        )
        writer.writeheader()
        writer.writerows(rows)


def _strip_trailing_whitespace(path: Path) -> None:
    lines = path.read_text(encoding="utf-8").splitlines()
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for line in lines:
            f.write(line.rstrip() + "\n")


def _make_functions_plot(path: Path) -> None:
    x = np.linspace(X_MIN, X_MAX, 400)
    plt.figure(figsize=(7.5, 4.5))
    plt.plot(x, f_true(x), label="f(x) (high-fidelity truth)", linewidth=2.0)
    plt.plot(x, f_lf(x), label="f_LF(x) (low-fidelity)", linewidth=2.0)
    plt.xlabel("x")
    plt.ylabel("y")
    plt.title("Synthetic multi-fidelity benchmark functions")
    plt.grid(True, alpha=0.25)
    plt.legend()
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path, format="svg")
    plt.close()
    _strip_trailing_whitespace(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate the synthetic multi-fidelity benchmark splits and plot."
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Directory to write data/ and plots/ into (default: this script's folder).",
    )
    args = parser.parse_args()

    out_dir: Path = args.out_dir
    train_x, test_x = make_default_splits()

    min_dist = np.min(np.abs(train_x.reshape(-1, 1) - test_x.reshape(1, -1)))
    if min_dist < 1e-12:
        raise RuntimeError(
            "Train/test x grids overlap; expected disjoint splits. "
            f"Minimum distance: {min_dist}"
        )

    _write_csv(out_dir / "data" / "high_fidelity_train.csv", train_x, f_true(train_x))
    _write_csv(out_dir / "data" / "high_fidelity_test.csv", test_x, f_true(test_x))
    _make_functions_plot(out_dir / "plots" / "functions.svg")

    print(f"Wrote {out_dir / 'data' / 'high_fidelity_train.csv'}")
    print(f"Wrote {out_dir / 'data' / 'high_fidelity_test.csv'}")
    print(f"Wrote {out_dir / 'plots' / 'functions.svg'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
