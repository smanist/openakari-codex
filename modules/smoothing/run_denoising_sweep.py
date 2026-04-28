#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Sequence

import matplotlib.pyplot as plt
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from modules.smoothing.denoise_baselines import _kernel_basis, savitzky_golay_denoise
from modules.smoothing.generate_lorenz63_dataset import (
    DEFAULT_BETA,
    DEFAULT_BURN_IN_STEPS,
    DEFAULT_DT,
    DEFAULT_NOISE_LEVELS,
    DEFAULT_RECORD_STEPS,
    DEFAULT_REPLICATE_IDS,
    DEFAULT_RHO,
    DEFAULT_SIGMA,
    DEFAULT_TRAJECTORY_SEEDS,
    build_dataset,
)


DEFAULT_WINDOW_LENGTHS = (7, 11, 21, 41)
DEFAULT_POLYORDERS = (2, 3, 5)
DEFAULT_KERNEL_ANCHORS = (32, 64, 128)
DEFAULT_BANDWIDTH_MULTIPLIERS = (1.0, 2.0, 4.0)
DEFAULT_KERNEL_TYPES = ("gaussian", "compact_polynomial")
DEFAULT_KERNEL_DEGREES = (2, 3, 4)

RAW_FIELDNAMES = [
    "sample_index",
    "clean_index",
    "trajectory_seed",
    "replicate_id",
    "noise_seed",
    "alpha",
    "method",
    "setting_id",
    "window_length",
    "polyorder",
    "n_anchors",
    "bandwidth_multiplier",
    "bandwidth",
    "kernel_type",
    "kernel_degree",
    "rmse",
    "relative_rmse",
    "denoising_gain",
    "rmse_x",
    "rmse_y",
    "rmse_z",
]

SUMMARY_FIELDNAMES = [
    "alpha",
    "method",
    "setting_id",
    "window_length",
    "polyorder",
    "n_anchors",
    "bandwidth_multiplier",
    "bandwidth",
    "kernel_type",
    "kernel_degree",
    "mean_rmse",
    "variance_cluster_rmse",
    "mean_relative_rmse",
    "variance_cluster_relative_rmse",
    "mean_denoising_gain",
    "variance_cluster_denoising_gain",
    "mean_rmse_x",
    "variance_cluster_rmse_x",
    "mean_rmse_y",
    "variance_cluster_rmse_y",
    "mean_rmse_z",
    "variance_cluster_rmse_z",
    "n_realizations",
    "n_clusters",
    "eligible_for_ranking",
]

ROBUST_FIELDNAMES = [
    "method",
    "alpha",
    "setting_id",
    "window_length",
    "polyorder",
    "n_anchors",
    "bandwidth_multiplier",
    "bandwidth",
    "kernel_type",
    "kernel_degree",
    "mean_rmse",
    "variance_cluster_rmse",
    "mean_relative_rmse",
    "variance_cluster_relative_rmse",
    "mean_denoising_gain",
    "variance_cluster_denoising_gain",
    "n_realizations",
    "n_clusters",
    "robust_mean_relative_rmse_across_noise",
    "positive_gain_noise_levels",
    "required_positive_gain_noise_levels",
]


@dataclass(frozen=True)
class SweepSetting:
    method: str
    setting_id: str
    window_length: int | None = None
    polyorder: int | None = None
    n_anchors: int | None = None
    bandwidth_multiplier: float | None = None
    bandwidth: float | None = None
    kernel_type: str | None = None
    kernel_degree: int | None = None

    def to_row_fields(self) -> dict[str, Any]:
        return {
            "method": self.method,
            "setting_id": self.setting_id,
            "window_length": self.window_length,
            "polyorder": self.polyorder,
            "n_anchors": self.n_anchors,
            "bandwidth_multiplier": self.bandwidth_multiplier,
            "bandwidth": self.bandwidth,
            "kernel_type": self.kernel_type,
            "kernel_degree": self.kernel_degree,
        }


def _float_text(value: float) -> str:
    return f"{value:g}"


def _write_table(path: Path, fieldnames: Sequence[str], rows: Sequence[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _save_dataset_artifacts(dataset: dict[str, Any], out_dir: Path, *, overwrite: bool) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    clean_path = out_dir / "clean_trajectories.npz"
    noisy_path = out_dir / "noisy_observations.npz"
    metadata_path = out_dir / "metadata.json"
    if not overwrite and any(path.exists() for path in (clean_path, noisy_path, metadata_path)):
        raise FileExistsError(f"Refusing to overwrite existing dataset outputs in {out_dir}")

    np.savez_compressed(
        clean_path,
        trajectories=dataset["clean_trajectories"],
        trajectory_seeds=dataset["trajectory_seeds"],
        initial_states=dataset["initial_states"],
        coordinate_scales=dataset["coordinate_scales"],
    )
    np.savez_compressed(
        noisy_path,
        observations=dataset["noisy_observations"],
        clean_index=dataset["sample_clean_indices"],
        trajectory_seeds=dataset["sample_trajectory_seeds"],
        replicate_id=dataset["sample_replicate_ids"],
        alpha=dataset["sample_noise_levels"],
        noise_seed=dataset["sample_noise_seeds"],
        noise_scales=dataset["noise_scales"],
    )

    metadata = dict(dataset["metadata"])
    metadata["artifacts"] = {
        "clean_trajectories": clean_path.name,
        "noisy_observations": noisy_path.name,
        "metadata": metadata_path.name,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {
        "clean_path": str(clean_path),
        "noisy_path": str(noisy_path),
        "metadata_path": str(metadata_path),
    }


def enumerate_settings(
    *,
    n_samples: int,
    window_lengths: Sequence[int],
    polyorders: Sequence[int],
    kernel_anchors: Sequence[int],
    bandwidth_multipliers: Sequence[float],
    kernel_types: Sequence[str],
    kernel_degrees: Sequence[int],
) -> list[SweepSetting]:
    settings: list[SweepSetting] = []

    for window_length in window_lengths:
        if window_length > n_samples or window_length % 2 == 0 or window_length < 3:
            continue
        for polyorder in polyorders:
            if polyorder >= window_length:
                continue
            settings.append(
                SweepSetting(
                    method="savitzky_golay",
                    setting_id=f"savgol|w={window_length}|p={polyorder}",
                    window_length=int(window_length),
                    polyorder=int(polyorder),
                )
            )

    for n_anchors in kernel_anchors:
        if n_anchors < 2 or n_anchors > n_samples:
            continue
        for bandwidth_multiplier in bandwidth_multipliers:
            bandwidth = float(bandwidth_multiplier) * float(n_samples - 1) / float(n_anchors - 1)
            for kernel_type in kernel_types:
                if kernel_type == "gaussian":
                    settings.append(
                        SweepSetting(
                            method="kernel_smoothing",
                            setting_id=(
                                f"kernel|type=gaussian|M={n_anchors}|"
                                f"ch={_float_text(float(bandwidth_multiplier))}"
                            ),
                            n_anchors=int(n_anchors),
                            bandwidth_multiplier=float(bandwidth_multiplier),
                            bandwidth=float(bandwidth),
                            kernel_type="gaussian",
                        )
                    )
                    continue
                if kernel_type != "compact_polynomial":
                    raise ValueError(f"Unsupported kernel_type: {kernel_type}")
                for kernel_degree in kernel_degrees:
                    settings.append(
                        SweepSetting(
                            method="kernel_smoothing",
                            setting_id=(
                                f"kernel|type=compact_polynomial|M={n_anchors}|"
                                f"ch={_float_text(float(bandwidth_multiplier))}|degree={kernel_degree}"
                            ),
                            n_anchors=int(n_anchors),
                            bandwidth_multiplier=float(bandwidth_multiplier),
                            bandwidth=float(bandwidth),
                            kernel_type="compact_polynomial",
                            kernel_degree=int(kernel_degree),
                        )
                    )

    if not settings:
        raise ValueError("No valid denoising settings remain after applying the requested grids.")
    return settings


def expected_total_rows(n_samples: int, n_settings: int) -> int:
    return int(n_samples * n_settings)


def _build_setting_evaluator(setting: SweepSetting, n_samples: int) -> Callable[[np.ndarray], np.ndarray]:
    if setting.method == "savitzky_golay":
        assert setting.window_length is not None
        assert setting.polyorder is not None
        return lambda signal: savitzky_golay_denoise(
            signal,
            window_length=setting.window_length,
            polyorder=setting.polyorder,
        )

    assert setting.n_anchors is not None
    assert setting.bandwidth is not None
    assert setting.kernel_type is not None
    basis = _kernel_basis(
        n_samples=n_samples,
        n_anchors=setting.n_anchors,
        bandwidth=setting.bandwidth,
        kernel=setting.kernel_type,  # type: ignore[arg-type]
        degree=setting.kernel_degree,
    )
    pseudoinverse = np.linalg.pinv(basis)

    def evaluate(signal: np.ndarray) -> np.ndarray:
        signal_array = np.asarray(signal, dtype=np.float64)
        return basis @ (pseudoinverse @ signal_array)

    return evaluate


def _compute_metrics(clean: np.ndarray, noisy: np.ndarray, denoised: np.ndarray) -> dict[str, float]:
    residual = denoised - clean
    rmse = float(np.sqrt(np.mean(residual**2)))
    signal_scale = float(np.sqrt(np.mean(clean**2)))
    noisy_rmse = float(np.sqrt(np.mean((noisy - clean) ** 2)))
    coordinate_rmse = np.sqrt(np.mean(residual**2, axis=0))
    return {
        "rmse": rmse,
        "relative_rmse": rmse / signal_scale if signal_scale > 0 else float("nan"),
        "denoising_gain": 1.0 - (rmse / noisy_rmse) if noisy_rmse > 0 else float("nan"),
        "rmse_x": float(coordinate_rmse[0]),
        "rmse_y": float(coordinate_rmse[1]),
        "rmse_z": float(coordinate_rmse[2]),
    }


def _cluster_variance(rows: Sequence[dict[str, Any]], metric_name: str) -> tuple[float, int]:
    by_seed: dict[int, list[float]] = {}
    for row in rows:
        seed = int(row["trajectory_seed"])
        by_seed.setdefault(seed, []).append(float(row[metric_name]))
    cluster_means = np.asarray([np.mean(values) for _, values in sorted(by_seed.items())], dtype=np.float64)
    if cluster_means.size <= 1:
        return float("nan"), int(cluster_means.size)
    return float(np.var(cluster_means, ddof=1)), int(cluster_means.size)


def summarize_rows(
    raw_rows: Sequence[dict[str, Any]],
    *,
    expected_realizations: int,
    expected_clusters: int,
) -> list[dict[str, Any]]:
    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for row in raw_rows:
        key = tuple(row[field] for field in RAW_FIELDNAMES[5:15])
        groups.setdefault(key, []).append(row)

    summaries: list[dict[str, Any]] = []
    metric_names = ("rmse", "relative_rmse", "denoising_gain", "rmse_x", "rmse_y", "rmse_z")
    for key, rows in sorted(groups.items(), key=lambda item: (float(item[0][0]), str(item[0][1]), str(item[0][2]))):
        example = rows[0]
        summary: dict[str, Any] = {
            "alpha": float(example["alpha"]),
            "method": example["method"],
            "setting_id": example["setting_id"],
            "window_length": example["window_length"],
            "polyorder": example["polyorder"],
            "n_anchors": example["n_anchors"],
            "bandwidth_multiplier": example["bandwidth_multiplier"],
            "bandwidth": example["bandwidth"],
            "kernel_type": example["kernel_type"],
            "kernel_degree": example["kernel_degree"],
            "n_realizations": len(rows),
        }
        for metric_name in metric_names:
            metric_values = np.asarray([float(row[metric_name]) for row in rows], dtype=np.float64)
            variance_cluster, n_clusters = _cluster_variance(rows, metric_name)
            summary[f"mean_{metric_name}"] = float(np.mean(metric_values))
            summary[f"variance_cluster_{metric_name}"] = variance_cluster
            summary["n_clusters"] = n_clusters
        summary["eligible_for_ranking"] = (
            int(summary["n_realizations"]) == expected_realizations
            and int(summary["n_clusters"]) == expected_clusters
        )
        summaries.append(summary)
    return summaries


def _hyperparameter_tiebreak_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        -1 if row["window_length"] in ("", None) else int(row["window_length"]),
        -1 if row["polyorder"] in ("", None) else int(row["polyorder"]),
        -1 if row["n_anchors"] in ("", None) else int(row["n_anchors"]),
        "" if row["kernel_type"] in ("", None) else str(row["kernel_type"]),
        -1 if row["kernel_degree"] in ("", None) else int(row["kernel_degree"]),
        -1.0 if row["bandwidth_multiplier"] in ("", None) else float(row["bandwidth_multiplier"]),
    )


def select_best_by_noise(summary_rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: dict[tuple[float, str], list[dict[str, Any]]] = {}
    for row in summary_rows:
        if not row["eligible_for_ranking"]:
            continue
        key = (float(row["alpha"]), str(row["method"]))
        candidates.setdefault(key, []).append(row)

    winners: list[dict[str, Any]] = []
    for key, rows in sorted(candidates.items()):
        winner = min(
            rows,
            key=lambda row: (
                float(row["mean_rmse"]),
                float(row["mean_relative_rmse"]),
                float(row["variance_cluster_rmse"]),
                _hyperparameter_tiebreak_key(row),
            ),
        )
        winners.append(dict(winner))
    return winners


def select_robust_settings(
    summary_rows: Sequence[dict[str, Any]],
    *,
    noise_levels: Sequence[float],
) -> list[dict[str, Any]]:
    eligible_rows = [row for row in summary_rows if row["eligible_for_ranking"]]
    if not eligible_rows:
        return []

    sorted_noise_levels = tuple(sorted(float(alpha) for alpha in noise_levels))
    required_positive_gains = max(1, len(sorted_noise_levels) - 1)

    by_method_setting: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in eligible_rows:
        key = (str(row["method"]), str(row["setting_id"]))
        by_method_setting.setdefault(key, []).append(row)

    winners_by_method: dict[str, tuple[dict[str, Any], list[dict[str, Any]]]] = {}
    for (method, _setting_id), rows in by_method_setting.items():
        alpha_map = {float(row["alpha"]): row for row in rows}
        if tuple(sorted(alpha_map)) != sorted_noise_levels:
            continue
        ordered_rows = [alpha_map[alpha] for alpha in sorted_noise_levels]
        positive_gain_levels = sum(float(row["mean_denoising_gain"]) > 0.0 for row in ordered_rows)
        if positive_gain_levels < required_positive_gains:
            continue
        average_relative_rmse = float(np.mean([float(row["mean_relative_rmse"]) for row in ordered_rows]))
        aggregate = {
            "method": method,
            "setting_id": ordered_rows[0]["setting_id"],
            "mean_relative_rmse_across_noise": average_relative_rmse,
            "positive_gain_noise_levels": positive_gain_levels,
            "required_positive_gain_noise_levels": required_positive_gains,
        }
        current = winners_by_method.get(method)
        if current is None:
            winners_by_method[method] = (aggregate, ordered_rows)
            continue
        current_aggregate, current_rows = current
        if (
            average_relative_rmse,
            _hyperparameter_tiebreak_key(ordered_rows[0]),
        ) < (
            float(current_aggregate["mean_relative_rmse_across_noise"]),
            _hyperparameter_tiebreak_key(current_rows[0]),
        ):
            winners_by_method[method] = (aggregate, ordered_rows)

    robust_rows: list[dict[str, Any]] = []
    for method in sorted(winners_by_method):
        aggregate, ordered_rows = winners_by_method[method]
        for row in ordered_rows:
            robust_row = {field: row.get(field, "") for field in ROBUST_FIELDNAMES}
            robust_row["robust_mean_relative_rmse_across_noise"] = aggregate["mean_relative_rmse_across_noise"]
            robust_row["positive_gain_noise_levels"] = aggregate["positive_gain_noise_levels"]
            robust_row["required_positive_gain_noise_levels"] = aggregate["required_positive_gain_noise_levels"]
            robust_rows.append(robust_row)
    return robust_rows


def render_plots(best_rows: Sequence[dict[str, Any]], *, plots_dir: Path) -> list[str]:
    plots_dir.mkdir(parents=True, exist_ok=True)
    methods = sorted({str(row["method"]) for row in best_rows})
    metric_specs = [
        ("rmse", "rmse_vs_noise.png", "RMSE"),
        ("relative_rmse", "relative_rmse_vs_noise.png", "Relative RMSE"),
        ("denoising_gain", "denoising_gain_vs_noise.png", "Denoising Gain"),
    ]
    written_paths: list[str] = []
    for metric_name, filename, ylabel in metric_specs:
        plt.figure(figsize=(7, 4.5))
        for method in methods:
            rows = sorted(
                [row for row in best_rows if str(row["method"]) == method],
                key=lambda row: float(row["alpha"]),
            )
            if not rows:
                continue
            x_values = np.asarray([float(row["alpha"]) for row in rows], dtype=np.float64)
            y_values = np.asarray([float(row[f"mean_{metric_name}"]) for row in rows], dtype=np.float64)
            y_error = np.sqrt(
                np.asarray([float(row[f"variance_cluster_{metric_name}"]) for row in rows], dtype=np.float64)
            )
            plt.errorbar(x_values, y_values, yerr=y_error, marker="o", capsize=4, label=method)
        plt.xlabel("Relative noise level alpha")
        plt.ylabel(ylabel)
        plt.title(f"{ylabel} vs noise")
        plt.grid(True, alpha=0.3)
        plt.legend()
        plot_path = plots_dir / filename
        plt.tight_layout()
        plt.savefig(plot_path, dpi=150)
        plt.close()
        written_paths.append(str(plot_path))
    return written_paths


def run_sweep(
    *,
    out_dir: Path,
    trajectory_seeds: Sequence[int],
    replicate_ids: Sequence[int],
    noise_levels: Sequence[float],
    dt: float,
    burn_in_steps: int,
    record_steps: int,
    sigma: float,
    rho: float,
    beta: float,
    window_lengths: Sequence[int],
    polyorders: Sequence[int],
    kernel_anchors: Sequence[int],
    bandwidth_multipliers: Sequence[float],
    kernel_types: Sequence[str],
    kernel_degrees: Sequence[int],
    overwrite: bool,
    make_plots: bool,
) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    metrics_raw_path = out_dir / "metrics_raw.csv"
    summary_path = out_dir / "summary_by_setting.csv"
    best_by_noise_path = out_dir / "best_by_noise.csv"
    robust_settings_path = out_dir / "robust_settings.csv"
    plots_dir = out_dir / "plots"
    manifest_path = out_dir / "run_manifest.json"
    dataset_dir = out_dir / "dataset"

    output_paths = [
        metrics_raw_path,
        summary_path,
        best_by_noise_path,
        robust_settings_path,
        manifest_path,
    ]
    if not overwrite and any(path.exists() for path in output_paths):
        raise FileExistsError(f"Refusing to overwrite existing sweep outputs in {out_dir}")

    dataset = build_dataset(
        trajectory_seeds=trajectory_seeds,
        replicate_ids=replicate_ids,
        noise_levels=noise_levels,
        dt=dt,
        burn_in_steps=burn_in_steps,
        record_steps=record_steps,
        sigma=sigma,
        rho=rho,
        beta=beta,
    )
    dataset_outputs = _save_dataset_artifacts(dataset, dataset_dir, overwrite=overwrite)

    settings = enumerate_settings(
        n_samples=record_steps,
        window_lengths=window_lengths,
        polyorders=polyorders,
        kernel_anchors=kernel_anchors,
        bandwidth_multipliers=bandwidth_multipliers,
        kernel_types=kernel_types,
        kernel_degrees=kernel_degrees,
    )
    total_rows = expected_total_rows(dataset["noisy_observations"].shape[0], len(settings))

    sample_contexts: list[dict[str, Any]] = []
    for sample_index in range(dataset["noisy_observations"].shape[0]):
        clean_index = int(dataset["sample_clean_indices"][sample_index])
        sample_contexts.append(
            {
                "sample_index": sample_index,
                "clean_index": clean_index,
                "trajectory_seed": int(dataset["sample_trajectory_seeds"][sample_index]),
                "replicate_id": int(dataset["sample_replicate_ids"][sample_index]),
                "noise_seed": int(dataset["sample_noise_seeds"][sample_index]),
                "alpha": float(dataset["sample_noise_levels"][sample_index]),
                "clean": dataset["clean_trajectories"][clean_index],
                "noisy": dataset["noisy_observations"][sample_index],
            }
        )

    raw_rows: list[dict[str, Any]] = []
    with metrics_raw_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_FIELDNAMES)
        writer.writeheader()
        handle.flush()
        completed_rows = 0
        for setting in settings:
            evaluator = _build_setting_evaluator(setting, record_steps)
            for sample in sample_contexts:
                denoised = evaluator(sample["noisy"])
                row = {
                    "sample_index": sample["sample_index"],
                    "clean_index": sample["clean_index"],
                    "trajectory_seed": sample["trajectory_seed"],
                    "replicate_id": sample["replicate_id"],
                    "noise_seed": sample["noise_seed"],
                    "alpha": sample["alpha"],
                    **setting.to_row_fields(),
                    **_compute_metrics(sample["clean"], sample["noisy"], denoised),
                }
                writer.writerow(row)
                raw_rows.append(row)
                completed_rows += 1
            handle.flush()
            print(
                json.dumps(
                    {
                        "status": "setting-complete",
                        "setting_id": setting.setting_id,
                        "rows_written": completed_rows,
                        "total_rows": total_rows,
                    },
                    sort_keys=True,
                )
            )

    expected_realizations = len(tuple(trajectory_seeds)) * len(tuple(replicate_ids))
    expected_clusters = len(tuple(trajectory_seeds))
    summary_rows = summarize_rows(
        raw_rows,
        expected_realizations=expected_realizations,
        expected_clusters=expected_clusters,
    )
    best_rows = select_best_by_noise(summary_rows)
    robust_rows = select_robust_settings(summary_rows, noise_levels=noise_levels)
    plot_paths = render_plots(best_rows, plots_dir=plots_dir) if make_plots and best_rows else []

    _write_table(summary_path, SUMMARY_FIELDNAMES, summary_rows)
    _write_table(best_by_noise_path, SUMMARY_FIELDNAMES, best_rows)
    _write_table(robust_settings_path, ROBUST_FIELDNAMES, robust_rows)

    manifest = {
        "dataset": dataset_outputs,
        "paths": {
            "metrics_raw": str(metrics_raw_path),
            "summary_by_setting": str(summary_path),
            "best_by_noise": str(best_by_noise_path),
            "robust_settings": str(robust_settings_path),
            "plots_dir": str(plots_dir),
        },
        "settings": {
            "window_lengths": list(window_lengths),
            "polyorders": list(polyorders),
            "kernel_anchors": list(kernel_anchors),
            "bandwidth_multipliers": list(bandwidth_multipliers),
            "kernel_types": list(kernel_types),
            "kernel_degrees": list(kernel_degrees),
        },
        "counts": {
            "n_samples": int(dataset["noisy_observations"].shape[0]),
            "n_settings": int(len(settings)),
            "n_rows_expected": int(total_rows),
            "n_rows_written": int(len(raw_rows)),
            "n_summary_rows": int(len(summary_rows)),
            "n_best_rows": int(len(best_rows)),
            "n_robust_rows": int(len(robust_rows)),
        },
        "plots": plot_paths,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Lorenz63 denoising hyperparameter sweep.")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--trajectory-seeds", type=int, nargs="+", default=list(DEFAULT_TRAJECTORY_SEEDS))
    parser.add_argument("--replicate-ids", type=int, nargs="+", default=list(DEFAULT_REPLICATE_IDS))
    parser.add_argument("--noise-levels", type=float, nargs="+", default=list(DEFAULT_NOISE_LEVELS))
    parser.add_argument("--dt", type=float, default=DEFAULT_DT)
    parser.add_argument("--burn-in-steps", type=int, default=DEFAULT_BURN_IN_STEPS)
    parser.add_argument("--record-steps", type=int, default=DEFAULT_RECORD_STEPS)
    parser.add_argument("--sigma", type=float, default=DEFAULT_SIGMA)
    parser.add_argument("--rho", type=float, default=DEFAULT_RHO)
    parser.add_argument("--beta", type=float, default=DEFAULT_BETA)
    parser.add_argument("--window-lengths", type=int, nargs="+", default=list(DEFAULT_WINDOW_LENGTHS))
    parser.add_argument("--polyorders", type=int, nargs="+", default=list(DEFAULT_POLYORDERS))
    parser.add_argument("--kernel-anchors", type=int, nargs="+", default=list(DEFAULT_KERNEL_ANCHORS))
    parser.add_argument(
        "--bandwidth-multipliers",
        type=float,
        nargs="+",
        default=list(DEFAULT_BANDWIDTH_MULTIPLIERS),
    )
    parser.add_argument("--kernel-types", nargs="+", default=list(DEFAULT_KERNEL_TYPES))
    parser.add_argument("--kernel-degrees", type=int, nargs="+", default=list(DEFAULT_KERNEL_DEGREES))
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--skip-plots", action="store_true")
    args = parser.parse_args(argv)

    manifest = run_sweep(
        out_dir=args.out_dir,
        trajectory_seeds=args.trajectory_seeds,
        replicate_ids=args.replicate_ids,
        noise_levels=args.noise_levels,
        dt=args.dt,
        burn_in_steps=args.burn_in_steps,
        record_steps=args.record_steps,
        sigma=args.sigma,
        rho=args.rho,
        beta=args.beta,
        window_lengths=args.window_lengths,
        polyorders=args.polyorders,
        kernel_anchors=args.kernel_anchors,
        bandwidth_multipliers=args.bandwidth_multipliers,
        kernel_types=args.kernel_types,
        kernel_degrees=args.kernel_degrees,
        overwrite=args.overwrite,
        make_plots=not args.skip_plots,
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
