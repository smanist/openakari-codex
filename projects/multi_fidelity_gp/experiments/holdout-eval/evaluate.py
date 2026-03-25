from __future__ import annotations

import csv
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
import sys
from typing import Any

import numpy as np


@dataclass(frozen=True)
class Metrics:
    rmse: float
    mae: float


@dataclass(frozen=True)
class UncertaintyMetrics:
    nll: float
    coverage_68: float
    mean_width_68: float
    coverage_95: float
    mean_width_95: float


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


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float).reshape(-1)
    y_pred = np.asarray(y_pred, dtype=float).reshape(-1)
    return float(np.mean(np.abs(y_true - y_pred)))


def _gaussian_nll(y_true: np.ndarray, mean: np.ndarray, std: np.ndarray, *, var_floor: float = 1e-12) -> float:
    y_true = np.asarray(y_true, dtype=float).reshape(-1)
    mean = np.asarray(mean, dtype=float).reshape(-1)
    std = np.asarray(std, dtype=float).reshape(-1)
    var = np.maximum(std * std, var_floor)
    return float(0.5 * np.mean(np.log(2 * math.pi * var) + ((y_true - mean) ** 2) / var))


def _interval_coverage_and_width(
    y_true: np.ndarray, mean: np.ndarray, std: np.ndarray, *, z: float = 1.959963984540054
) -> tuple[float, float]:
    y_true = np.asarray(y_true, dtype=float).reshape(-1)
    mean = np.asarray(mean, dtype=float).reshape(-1)
    std = np.asarray(std, dtype=float).reshape(-1)
    lo = mean - z * std
    hi = mean + z * std
    coverage = float(np.mean((y_true >= lo) & (y_true <= hi)))
    width = float(np.mean(hi - lo))
    return coverage, width


def _import_benchmark_and_models(project_dir: Path) -> tuple[Any, Any]:
    bench_dir = (project_dir / "experiments" / "synthetic-benchmark").resolve()
    model_dir = (project_dir / "experiments" / "residual-gp").resolve()

    sys.path.insert(0, str(bench_dir))
    sys.path.insert(0, str(model_dir))
    try:
        from benchmark import f_lf  # type: ignore
        from models import (  # type: ignore
            HighFidelityGPModel,
            LowFidelityOnlyModel,
            ResidualGPCorrectionModel,
        )
    finally:
        sys.path.pop(0)
        sys.path.pop(0)

    return f_lf, (LowFidelityOnlyModel, HighFidelityGPModel, ResidualGPCorrectionModel)


def _jsonable(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_jsonable(v) for v in obj]
    if hasattr(obj, "__dict__"):
        return _jsonable(vars(obj))
    return str(obj)


def main() -> int:
    this_dir = Path(__file__).resolve().parent
    project_dir = this_dir.parents[1]

    train_csv = project_dir / "experiments" / "synthetic-benchmark" / "data" / "high_fidelity_train.csv"
    test_csv = project_dir / "experiments" / "synthetic-benchmark" / "data" / "high_fidelity_test.csv"
    out_md = this_dir / "results.md"
    out_json = this_dir / "results.json"

    x_train, y_train = _load_xy(train_csv)
    x_test, y_test = _load_xy(test_csv)

    f_lf, (LowFidelityOnlyModel, HighFidelityGPModel, ResidualGPCorrectionModel) = _import_benchmark_and_models(
        project_dir
    )

    lf_pred = LowFidelityOnlyModel(f_lf).predict(x_test)

    hf_model = HighFidelityGPModel().fit(x_train, y_train)
    mf_model = ResidualGPCorrectionModel(f_lf).fit(x_train, y_train)

    point_metrics: dict[str, Metrics] = {
        "low_fidelity_only": Metrics(rmse=_rmse(y_test, lf_pred.mean), mae=_mae(y_test, lf_pred.mean))
    }

    hf_pred = hf_model.predict(x_test)
    point_metrics["high_fidelity_gp"] = Metrics(rmse=_rmse(y_test, hf_pred.mean), mae=_mae(y_test, hf_pred.mean))

    mf_pred = mf_model.predict(x_test)
    point_metrics["residual_gp_correction"] = Metrics(
        rmse=_rmse(y_test, mf_pred.mean),
        mae=_mae(y_test, mf_pred.mean),
    )

    uncertainty_metrics: dict[str, dict[str, UncertaintyMetrics]] = {
        "high_fidelity_gp": {},
        "residual_gp_correction": {},
    }

    def _uncertainty(mean: np.ndarray, std: np.ndarray) -> UncertaintyMetrics:
        cov_68, width_68 = _interval_coverage_and_width(y_test, mean, std, z=1.0)
        cov_95, width_95 = _interval_coverage_and_width(y_test, mean, std, z=1.959963984540054)
        return UncertaintyMetrics(
            nll=_gaussian_nll(y_test, mean, std),
            coverage_68=cov_68,
            mean_width_68=width_68,
            coverage_95=cov_95,
            mean_width_95=width_95,
        )

    hf_latent = hf_model.predict_latent(x_test)
    hf_obs = hf_model.predict_observation(x_test)
    mf_latent = mf_model.predict_latent(x_test)
    mf_obs = mf_model.predict_observation(x_test)

    uncertainty_metrics["high_fidelity_gp"]["latent"] = _uncertainty(hf_latent.mean, hf_latent.std)
    uncertainty_metrics["high_fidelity_gp"]["observation"] = _uncertainty(hf_obs.mean, hf_obs.std)
    uncertainty_metrics["residual_gp_correction"]["latent"] = _uncertainty(mf_latent.mean, mf_latent.std)
    uncertainty_metrics["residual_gp_correction"]["observation"] = _uncertainty(mf_obs.mean, mf_obs.std)

    target_cov = 0.95
    prefer_residual = (
        point_metrics["residual_gp_correction"].rmse < point_metrics["high_fidelity_gp"].rmse
        and abs(uncertainty_metrics["residual_gp_correction"]["observation"].coverage_95 - target_cov)
        < abs(uncertainty_metrics["high_fidelity_gp"]["observation"].coverage_95 - target_cov)
    )

    hf_hp = getattr(hf_model, "_gp", None).hyperparams if getattr(hf_model, "_gp", None) is not None else None
    mf_hp = getattr(mf_model, "_gp", None).hyperparams if getattr(mf_model, "_gp", None) is not None else None

    lines: list[str] = []
    lines.append("# Holdout evaluation (synthetic benchmark)")
    lines.append("")
    lines.append(f"- Train points: {x_train.size}, test points: {x_test.size}")
    lines.append("")
    lines.append("## Accuracy (point metrics)")
    lines.append("")
    lines.append("| Model | RMSE | MAE |")
    lines.append("|---|---:|---:|")

    def _fmt(x: float | None) -> str:
        if x is None:
            return "n/a"
        return f"{x:.6f}"

    order = [
        ("Low-fidelity only", "low_fidelity_only"),
        ("High-fidelity GP", "high_fidelity_gp"),
        ("Residual GP correction", "residual_gp_correction"),
    ]
    for label, key in order:
        m = point_metrics[key]
        lines.append(f"| {label} | {_fmt(m.rmse)} | {_fmt(m.mae)} |")

    lines.append("")
    lines.append("## Uncertainty metrics (GP-based models)")
    lines.append("")
    lines.append("Two predictive distributions are reported for each GP model:")
    lines.append("- **Latent**: predictive variance from the GP posterior (no observation noise).")
    lines.append("- **Observation**: latent variance + fitted noise variance (`include_noise=True`).")
    lines.append("")
    lines.append("### Latent predictive distribution")
    lines.append("")
    lines.append("| Model | NLL | 68% coverage | 68% width | 95% coverage | 95% width |")
    lines.append("|---|---:|---:|---:|---:|---:|")
    for label, key in (("High-fidelity GP", "high_fidelity_gp"), ("Residual GP correction", "residual_gp_correction")):
        u = uncertainty_metrics[key]["latent"]
        lines.append(
            f"| {label} | {_fmt(u.nll)} | {_fmt(u.coverage_68)} | {_fmt(u.mean_width_68)}"
            f" | {_fmt(u.coverage_95)} | {_fmt(u.mean_width_95)} |"
        )
    lines.append("")
    lines.append("### Observation predictive distribution")
    lines.append("")
    lines.append("| Model | NLL | 68% coverage | 68% width | 95% coverage | 95% width |")
    lines.append("|---|---:|---:|---:|---:|---:|")
    for label, key in (("High-fidelity GP", "high_fidelity_gp"), ("Residual GP correction", "residual_gp_correction")):
        u = uncertainty_metrics[key]["observation"]
        lines.append(
            f"| {label} | {_fmt(u.nll)} | {_fmt(u.coverage_68)} | {_fmt(u.mean_width_68)}"
            f" | {_fmt(u.coverage_95)} | {_fmt(u.mean_width_95)} |"
        )
    lines.append("")
    lines.append("## GP hyperparameters")
    lines.append("")
    lines.append(f"- High-fidelity GP: {_jsonable(hf_hp)}")
    lines.append(f"- Residual GP: {_jsonable(mf_hp)}")
    lines.append("")
    lines.append("## Preference rule (initial)")
    lines.append("")
    lines.append(
        "Residual GP preferred if it beats the high-fidelity GP on RMSE and has 95% interval coverage closer to 0.95."
    )
    lines.append(f"- Preferred: {'yes' if prefer_residual else 'no'}")
    lines.append("")

    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    payload = {
        "train_points": int(x_train.size),
        "test_points": int(x_test.size),
        "point_metrics": {k: asdict(v) for k, v in point_metrics.items()},
        "uncertainty_metrics": {
            model: {dist: asdict(u) for dist, u in dist_map.items()}
            for model, dist_map in uncertainty_metrics.items()
        },
        "gp_hyperparams": {
            "high_fidelity_gp": _jsonable(hf_hp),
            "residual_gp": _jsonable(mf_hp),
        },
        "preference": {"rule": "rmse + observation_coverage", "preferred": bool(prefer_residual)},
    }
    out_json.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(f"Wrote {out_md}")
    print(f"Wrote {out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
