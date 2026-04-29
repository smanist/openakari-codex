#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Literal, Sequence

import matplotlib.pyplot as plt
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from modules.smoothing.denoise_baselines import _kernel_basis, savitzky_golay_denoise
from modules.smoothing.denoise_families_v2 import (
    cubic_smoothing_spline_denoise,
    local_linear_regression_denoise,
    normalized_kernel_regression_denoise,
)
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


Stage = Literal["pilot", "confirmatory"]
KernelType = Literal["gaussian", "tricube", "compact_polynomial"]

# Confirmatory runs should use a fresh larger seed set rather than reusing pilot clusters.
DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS = tuple(
    range(max(DEFAULT_TRAJECTORY_SEEDS) + 1, max(DEFAULT_TRAJECTORY_SEEDS) + 1 + 8)
)
DEFAULT_SAVGOL_REFERENCES = ((11, 3), (21, 3), (21, 5), (41, 5))
DEFAULT_ANCHOR_REFERENCES = (
    {"kernel_type": "gaussian", "n_anchors": 128, "bandwidth_multiplier": 1.0},
    {"kernel_type": "gaussian", "n_anchors": 128, "bandwidth_multiplier": 2.0},
    {"kernel_type": "gaussian", "n_anchors": 128, "bandwidth_multiplier": 4.0},
    {
        "kernel_type": "compact_polynomial",
        "n_anchors": 128,
        "bandwidth_multiplier": 2.0,
        "kernel_degree": 3,
    },
)
DEFAULT_NORMALIZED_KERNELS = ("gaussian", "tricube")
DEFAULT_NORMALIZED_SPANS = (11, 21, 41, 81)
DEFAULT_LOCAL_LINEAR_KERNELS = ("gaussian", "tricube")
DEFAULT_LOCAL_LINEAR_SPANS = (11, 21, 41, 81)
DEFAULT_SPLINE_LAMBDAS = (0.25, 0.5, 1.0, 2.0, 4.0)

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
    "family",
    "span",
    "lambda_rel",
    "rmse",
    "relative_rmse",
    "denoising_gain",
    "derivative_rmse",
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
    "family",
    "span",
    "lambda_rel",
    "mean_rmse",
    "variance_cluster_rmse",
    "mean_relative_rmse",
    "variance_cluster_relative_rmse",
    "mean_denoising_gain",
    "variance_cluster_denoising_gain",
    "mean_derivative_rmse",
    "variance_cluster_derivative_rmse",
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

FAMILY_SCREEN_FIELDNAMES = [
    "family",
    "setting_id",
    "kernel_type",
    "span",
    "lambda_rel",
    "mean_relative_rmse_across_noise",
    "positive_gain_noise_levels",
    "required_positive_gain_noise_levels",
    "eligible_by_gain_rule",
    "selected_for_confirmatory",
    "selection_reason",
]

ROBUST_FIELDNAMES = [
    "method",
    "family",
    "alpha",
    "setting_id",
    "window_length",
    "polyorder",
    "n_anchors",
    "bandwidth_multiplier",
    "bandwidth",
    "kernel_type",
    "kernel_degree",
    "span",
    "lambda_rel",
    "mean_rmse",
    "variance_cluster_rmse",
    "mean_relative_rmse",
    "variance_cluster_relative_rmse",
    "mean_denoising_gain",
    "variance_cluster_denoising_gain",
    "mean_derivative_rmse",
    "variance_cluster_derivative_rmse",
    "n_realizations",
    "n_clusters",
    "robust_mean_relative_rmse_across_noise",
    "positive_gain_noise_levels",
    "required_positive_gain_noise_levels",
]


@dataclass(frozen=True)
class V2SweepSetting:
    method: str
    family: str
    setting_id: str
    window_length: int | None = None
    polyorder: int | None = None
    n_anchors: int | None = None
    bandwidth_multiplier: float | None = None
    bandwidth: float | None = None
    kernel_type: str | None = None
    kernel_degree: int | None = None
    span: int | None = None
    lambda_rel: float | None = None
    is_reference: bool = False

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
            "family": self.family,
            "span": self.span,
            "lambda_rel": self.lambda_rel,
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


def _write_output_log(output_log_path: Path, manifest: dict[str, Any]) -> None:
    progress_lines: list[str] = []
    if output_log_path.exists():
        for line in output_log_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            try:
                payload = json.loads(stripped)
            except json.JSONDecodeError:
                break
            if payload.get("status") != "setting-complete":
                break
            progress_lines.append(stripped)

    output_log_path.parent.mkdir(parents=True, exist_ok=True)
    rendered_manifest = json.dumps(manifest, indent=2, sort_keys=True)
    log_body = "\n".join(progress_lines + [rendered_manifest]) if progress_lines else rendered_manifest
    output_log_path.write_text(log_body + "\n", encoding="utf-8")


def _portable_dataset_paths(dataset_dir: Path) -> dict[str, str]:
    return {
        "clean_path": str(dataset_dir / "clean_trajectories.npz"),
        "noisy_path": str(dataset_dir / "noisy_observations.npz"),
        "metadata_path": str(dataset_dir / "metadata.json"),
    }


def _derivative_rmse(clean: np.ndarray, denoised: np.ndarray, *, dt: float) -> float:
    clean_derivative = (clean[2:] - clean[:-2]) / (2.0 * dt)
    denoised_derivative = (denoised[2:] - denoised[:-2]) / (2.0 * dt)
    return float(np.sqrt(np.mean((denoised_derivative - clean_derivative) ** 2)))


def _compute_metrics(clean: np.ndarray, noisy: np.ndarray, denoised: np.ndarray, *, dt: float) -> dict[str, float]:
    residual = denoised - clean
    rmse = float(np.sqrt(np.mean(residual**2)))
    signal_scale = float(np.sqrt(np.mean(clean**2)))
    noisy_rmse = float(np.sqrt(np.mean((noisy - clean) ** 2)))
    coordinate_rmse = np.sqrt(np.mean(residual**2, axis=0))
    return {
        "rmse": rmse,
        "relative_rmse": rmse / signal_scale if signal_scale > 0 else float("nan"),
        "denoising_gain": 1.0 - (rmse / noisy_rmse) if noisy_rmse > 0 else float("nan"),
        "derivative_rmse": _derivative_rmse(clean, denoised, dt=dt),
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
    grouping_fields = (
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
        "family",
        "span",
        "lambda_rel",
    )
    groups: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for row in raw_rows:
        key = tuple(row[field] for field in grouping_fields)
        groups.setdefault(key, []).append(row)

    metric_names = ("rmse", "relative_rmse", "denoising_gain", "derivative_rmse", "rmse_x", "rmse_y", "rmse_z")
    summaries: list[dict[str, Any]] = []
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
            "family": example["family"],
            "span": example["span"],
            "lambda_rel": example["lambda_rel"],
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


def _tiebreak_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        -1 if row["window_length"] in ("", None) else int(row["window_length"]),
        -1 if row["polyorder"] in ("", None) else int(row["polyorder"]),
        -1 if row["n_anchors"] in ("", None) else int(row["n_anchors"]),
        "" if row["kernel_type"] in ("", None) else str(row["kernel_type"]),
        -1 if row["kernel_degree"] in ("", None) else int(row["kernel_degree"]),
        -1.0 if row["bandwidth_multiplier"] in ("", None) else float(row["bandwidth_multiplier"]),
        -1 if row["span"] in ("", None) else int(row["span"]),
        -1.0 if row["lambda_rel"] in ("", None) else float(row["lambda_rel"]),
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
                _tiebreak_key(row),
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
        if current is None or (
            average_relative_rmse,
            _tiebreak_key(ordered_rows[0]),
        ) < (
            float(current[0]["mean_relative_rmse_across_noise"]),
            _tiebreak_key(current[1][0]),
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


def build_family_screen(
    summary_rows: Sequence[dict[str, Any]],
    *,
    noise_levels: Sequence[float],
) -> list[dict[str, Any]]:
    finalist_families = {
        "normalized_kernel_regression",
        "local_linear_regression",
        "cubic_smoothing_spline",
    }
    eligible_rows = [row for row in summary_rows if row["eligible_for_ranking"] and row["family"] in finalist_families]
    sorted_noise_levels = tuple(sorted(float(alpha) for alpha in noise_levels))
    required_positive_gains = max(1, len(sorted_noise_levels) - 1)

    by_family_setting: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in eligible_rows:
        key = (str(row["family"]), str(row["setting_id"]))
        by_family_setting.setdefault(key, []).append(row)

    candidates_by_family: dict[str, list[dict[str, Any]]] = {}
    for (family, setting_id), rows in by_family_setting.items():
        alpha_map = {float(row["alpha"]): row for row in rows}
        if tuple(sorted(alpha_map)) != sorted_noise_levels:
            continue
        ordered_rows = [alpha_map[alpha] for alpha in sorted_noise_levels]
        positive_gain_levels = sum(float(row["mean_denoising_gain"]) > 0.0 for row in ordered_rows)
        candidate = {
            "family": family,
            "setting_id": setting_id,
            "kernel_type": ordered_rows[0]["kernel_type"] if ordered_rows[0]["kernel_type"] not in (None, "") else "",
            "span": ordered_rows[0]["span"] if ordered_rows[0]["span"] not in (None, "") else "",
            "lambda_rel": (
                ordered_rows[0]["lambda_rel"] if ordered_rows[0]["lambda_rel"] not in (None, "") else ""
            ),
            "mean_relative_rmse_across_noise": float(
                np.mean([float(row["mean_relative_rmse"]) for row in ordered_rows])
            ),
            "positive_gain_noise_levels": positive_gain_levels,
            "required_positive_gain_noise_levels": required_positive_gains,
            "eligible_by_gain_rule": "true" if positive_gain_levels >= required_positive_gains else "false",
            "selected_for_confirmatory": "false",
            "selection_reason": "",
        }
        candidates_by_family.setdefault(family, []).append(candidate)

    output_rows: list[dict[str, Any]] = []
    for family in sorted(candidates_by_family):
        candidates = sorted(
            candidates_by_family[family],
            key=lambda row: (float(row["mean_relative_rmse_across_noise"]), str(row["setting_id"])),
        )
        eligible = [row for row in candidates if row["eligible_by_gain_rule"] == "true"]
        selected_ids: set[str]
        fallback = not eligible
        if fallback:
            selected_ids = {candidates[0]["setting_id"]} if candidates else set()
        else:
            selected_ids = {row["setting_id"] for row in eligible[:2]}

        for row in candidates:
            rendered = dict(row)
            if row["setting_id"] in selected_ids:
                rendered["selected_for_confirmatory"] = "true"
                rendered["selection_reason"] = (
                    "fallback_best_average_relative_rmse" if fallback else "eligible_top_average_relative_rmse"
                )
            output_rows.append(rendered)
    return output_rows


def render_plots(best_rows: Sequence[dict[str, Any]], *, plots_dir: Path, include_derivative: bool) -> list[str]:
    plots_dir.mkdir(parents=True, exist_ok=True)
    methods = sorted({str(row["method"]) for row in best_rows})
    metric_specs = [
        ("rmse", "rmse_vs_noise.png", "RMSE"),
        ("relative_rmse", "relative_rmse_vs_noise.png", "Relative RMSE"),
        ("denoising_gain", "denoising_gain_vs_noise.png", "Denoising Gain"),
    ]
    if include_derivative:
        metric_specs.append(("derivative_rmse", "derivative_rmse_vs_noise.png", "Derivative RMSE"))

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


def _family_comparison_rows(best_rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    return [dict(row) for row in sorted(best_rows, key=lambda row: (float(row["alpha"]), str(row["family"])))]


def enumerate_pilot_settings(
    *,
    n_samples: int,
    savgol_references: Sequence[tuple[int, int]],
    anchor_references: Sequence[dict[str, Any]],
    normalized_kernel_kernels: Sequence[str],
    normalized_kernel_spans: Sequence[int],
    local_linear_kernels: Sequence[str],
    local_linear_spans: Sequence[int],
    spline_lambda_rels: Sequence[float],
) -> list[V2SweepSetting]:
    settings: list[V2SweepSetting] = []

    for window_length, polyorder in savgol_references:
        if window_length > n_samples or window_length % 2 == 0 or window_length < 3:
            continue
        if polyorder >= window_length:
            continue
        settings.append(
            V2SweepSetting(
                method="savitzky_golay",
                family="savitzky_golay",
                setting_id=f"savgol|w={window_length}|p={polyorder}",
                window_length=int(window_length),
                polyorder=int(polyorder),
                is_reference=True,
            )
        )

    for reference in anchor_references:
        n_anchors = int(reference["n_anchors"])
        if n_anchors < 2 or n_anchors > n_samples:
            continue
        kernel_type = str(reference["kernel_type"])
        bandwidth_multiplier = float(reference["bandwidth_multiplier"])
        bandwidth = bandwidth_multiplier * float(n_samples - 1) / float(n_anchors - 1)
        kernel_degree = reference.get("kernel_degree")
        if kernel_type == "gaussian":
            setting_id = f"anchor|type=gaussian|M={n_anchors}|ch={_float_text(bandwidth_multiplier)}"
        elif kernel_type == "compact_polynomial":
            setting_id = (
                f"anchor|type=compact_polynomial|M={n_anchors}|"
                f"ch={_float_text(bandwidth_multiplier)}|degree={int(kernel_degree)}"
            )
        else:
            raise ValueError(f"Unsupported anchor kernel_type: {kernel_type}")
        settings.append(
            V2SweepSetting(
                method="anchor_basis_kernel",
                family="anchor_basis_kernel",
                setting_id=setting_id,
                n_anchors=n_anchors,
                bandwidth_multiplier=bandwidth_multiplier,
                bandwidth=bandwidth,
                kernel_type=kernel_type,
                kernel_degree=None if kernel_degree is None else int(kernel_degree),
                is_reference=True,
            )
        )

    for kernel_type in normalized_kernel_kernels:
        for span in normalized_kernel_spans:
            if span > n_samples or span % 2 == 0 or span < 3:
                continue
            settings.append(
                V2SweepSetting(
                    method="normalized_kernel_regression",
                    family="normalized_kernel_regression",
                    setting_id=f"normalized|type={kernel_type}|span={span}",
                    kernel_type=str(kernel_type),
                    span=int(span),
                )
            )

    for kernel_type in local_linear_kernels:
        for span in local_linear_spans:
            if span > n_samples or span % 2 == 0 or span < 3:
                continue
            settings.append(
                V2SweepSetting(
                    method="local_linear_regression",
                    family="local_linear_regression",
                    setting_id=f"local_linear|type={kernel_type}|span={span}",
                    kernel_type=str(kernel_type),
                    span=int(span),
                )
            )

    for lambda_rel in spline_lambda_rels:
        settings.append(
            V2SweepSetting(
                method="cubic_smoothing_spline",
                family="cubic_smoothing_spline",
                setting_id=f"spline|lambda_rel={_float_text(float(lambda_rel))}",
                lambda_rel=float(lambda_rel),
            )
        )

    if not settings:
        raise ValueError("No valid v2 denoising settings remain after applying the requested grids.")
    return settings


def _load_confirmatory_settings(path: Path) -> list[V2SweepSetting]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("confirmatory settings JSON must contain a list of setting objects")
    settings: list[V2SweepSetting] = []
    for item in payload:
        if not isinstance(item, dict):
            raise ValueError("confirmatory setting entries must be objects")
        if "selected_for_confirmatory" in item and not _optional_bool(
            item.get("selected_for_confirmatory")
        ):
            continue
        settings.append(_coerce_confirmatory_setting(item))
    return settings


def _coerce_confirmatory_setting(item: dict[str, Any]) -> V2SweepSetting:
    method = _optional_text(item.get("method")) or _optional_text(item.get("family"))
    family = _optional_text(item.get("family")) or method
    setting_id = _optional_text(item.get("setting_id"))
    if method is None or family is None or setting_id is None:
        raise ValueError("confirmatory setting entries must include method/family and setting_id")

    return V2SweepSetting(
        method=method,
        family=family,
        setting_id=setting_id,
        window_length=_optional_int(item.get("window_length")),
        polyorder=_optional_int(item.get("polyorder")),
        n_anchors=_optional_int(item.get("n_anchors")),
        bandwidth_multiplier=_optional_float(item.get("bandwidth_multiplier")),
        bandwidth=_optional_float(item.get("bandwidth")),
        kernel_type=_optional_text(item.get("kernel_type")),
        kernel_degree=_optional_int(item.get("kernel_degree")),
        span=_optional_int(item.get("span")),
        lambda_rel=_optional_float(item.get("lambda_rel")),
        is_reference=_optional_bool(item.get("is_reference")),
    )


def _optional_text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


def _optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        raise ValueError(f"Expected integer-compatible value, got boolean {value!r}")
    if isinstance(value, int):
        return value
    numeric = float(value)
    integer = int(numeric)
    if numeric != integer:
        raise ValueError(f"Expected integer-compatible value, got {value!r}")
    return integer


def _optional_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        raise ValueError(f"Expected float-compatible value, got boolean {value!r}")
    return float(value)


def _optional_bool(value: Any) -> bool:
    if value in (None, ""):
        return False
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise ValueError(f"Expected boolean-compatible value, got {value!r}")


def _build_setting_evaluator(setting: V2SweepSetting) -> Callable[[np.ndarray, float], np.ndarray]:
    if setting.method == "savitzky_golay":
        assert setting.window_length is not None
        assert setting.polyorder is not None
        return lambda signal, alpha: savitzky_golay_denoise(
            signal,
            window_length=setting.window_length,
            polyorder=setting.polyorder,
        )

    if setting.method == "normalized_kernel_regression":
        assert setting.kernel_type is not None
        assert setting.span is not None
        return lambda signal, alpha: normalized_kernel_regression_denoise(
            signal,
            kernel=setting.kernel_type,  # type: ignore[arg-type]
            span=setting.span,
        )

    if setting.method == "local_linear_regression":
        assert setting.kernel_type is not None
        assert setting.span is not None
        return lambda signal, alpha: local_linear_regression_denoise(
            signal,
            kernel=setting.kernel_type,  # type: ignore[arg-type]
            span=setting.span,
        )

    if setting.method == "cubic_smoothing_spline":
        assert setting.lambda_rel is not None
        return lambda signal, alpha: cubic_smoothing_spline_denoise(
            signal,
            alpha=alpha,
            lambda_rel=setting.lambda_rel,
        )

    raise ValueError(f"Unsupported setting method: {setting.method}")


def _build_anchor_basis_evaluator(setting: V2SweepSetting, *, n_samples: int) -> Callable[[np.ndarray, float], np.ndarray]:
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
    return lambda signal, alpha: basis @ (pseudoinverse @ np.asarray(signal, dtype=np.float64))


def run_stage(
    *,
    out_dir: Path,
    stage: Stage,
    trajectory_seeds: Sequence[int] | None = None,
    replicate_ids: Sequence[int] = DEFAULT_REPLICATE_IDS,
    noise_levels: Sequence[float] = DEFAULT_NOISE_LEVELS,
    dt: float = DEFAULT_DT,
    burn_in_steps: int = DEFAULT_BURN_IN_STEPS,
    record_steps: int = DEFAULT_RECORD_STEPS,
    sigma: float = DEFAULT_SIGMA,
    rho: float = DEFAULT_RHO,
    beta: float = DEFAULT_BETA,
    savgol_references: Sequence[tuple[int, int]] = DEFAULT_SAVGOL_REFERENCES,
    anchor_references: Sequence[dict[str, Any]] = DEFAULT_ANCHOR_REFERENCES,
    normalized_kernel_kernels: Sequence[str] = DEFAULT_NORMALIZED_KERNELS,
    normalized_kernel_spans: Sequence[int] = DEFAULT_NORMALIZED_SPANS,
    local_linear_kernels: Sequence[str] = DEFAULT_LOCAL_LINEAR_KERNELS,
    local_linear_spans: Sequence[int] = DEFAULT_LOCAL_LINEAR_SPANS,
    spline_lambda_rels: Sequence[float] = DEFAULT_SPLINE_LAMBDAS,
    confirmatory_settings: Sequence[V2SweepSetting] | None = None,
    overwrite: bool = False,
    make_plots: bool = True,
) -> dict[str, Any]:
    selected_trajectory_seeds = (
        tuple(DEFAULT_TRAJECTORY_SEEDS)
        if trajectory_seeds is None and stage == "pilot"
        else tuple(DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS)
        if trajectory_seeds is None
        else tuple(trajectory_seeds)
    )

    if stage == "pilot":
        settings = enumerate_pilot_settings(
            n_samples=record_steps,
            savgol_references=savgol_references,
            anchor_references=anchor_references,
            normalized_kernel_kernels=normalized_kernel_kernels,
            normalized_kernel_spans=normalized_kernel_spans,
            local_linear_kernels=local_linear_kernels,
            local_linear_spans=local_linear_spans,
            spline_lambda_rels=spline_lambda_rels,
        )
    else:
        if confirmatory_settings is None:
            raise ValueError("confirmatory stage requires explicit confirmatory_settings")
        settings = list(enumerate_pilot_settings(
            n_samples=record_steps,
            savgol_references=savgol_references,
            anchor_references=anchor_references,
            normalized_kernel_kernels=[],
            normalized_kernel_spans=[],
            local_linear_kernels=[],
            local_linear_spans=[],
            spline_lambda_rels=[],
        ))
        settings.extend(confirmatory_settings)

    out_dir.mkdir(parents=True, exist_ok=True)
    metrics_raw_path = out_dir / "metrics_raw.csv"
    summary_path = out_dir / "summary_by_setting.csv"
    family_screen_path = out_dir / "family_screen.csv"
    best_by_noise_path = out_dir / "best_by_noise.csv"
    robust_settings_path = out_dir / "robust_settings.csv"
    family_comparison_path = out_dir / "family_comparison.csv"
    plots_dir = out_dir / "plots"
    manifest_path = out_dir / "run_manifest.json"
    output_log_path = out_dir / "output.log"
    dataset_dir = out_dir / "dataset"

    output_paths = [metrics_raw_path, summary_path, manifest_path]
    if stage == "pilot":
        output_paths.append(family_screen_path)
    else:
        output_paths.extend([best_by_noise_path, robust_settings_path, family_comparison_path])
    if not overwrite and any(path.exists() for path in output_paths):
        raise FileExistsError(f"Refusing to overwrite existing v2 sweep outputs in {out_dir}")

    dataset = build_dataset(
        trajectory_seeds=selected_trajectory_seeds,
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

    total_rows = int(dataset["noisy_observations"].shape[0]) * len(settings)
    raw_rows: list[dict[str, Any]] = []
    with metrics_raw_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_FIELDNAMES)
        writer.writeheader()
        handle.flush()
        completed_rows = 0
        for setting in settings:
            evaluator = (
                _build_anchor_basis_evaluator(setting, n_samples=record_steps)
                if setting.method == "anchor_basis_kernel"
                else _build_setting_evaluator(setting)
            )
            for sample in sample_contexts:
                denoised = evaluator(sample["noisy"], sample["alpha"])
                row = {
                    "sample_index": sample["sample_index"],
                    "clean_index": sample["clean_index"],
                    "trajectory_seed": sample["trajectory_seed"],
                    "replicate_id": sample["replicate_id"],
                    "noise_seed": sample["noise_seed"],
                    "alpha": sample["alpha"],
                    **setting.to_row_fields(),
                    **_compute_metrics(sample["clean"], sample["noisy"], denoised, dt=dt),
                }
                writer.writerow(row)
                raw_rows.append(row)
                completed_rows += 1
            handle.flush()
            print(
                json.dumps(
                    {
                        "status": "setting-complete",
                        "stage": stage,
                        "setting_id": setting.setting_id,
                        "rows_written": completed_rows,
                        "total_rows": total_rows,
                    },
                    sort_keys=True,
                )
            )

    expected_realizations = len(tuple(selected_trajectory_seeds)) * len(tuple(replicate_ids))
    expected_clusters = len(tuple(selected_trajectory_seeds))
    summary_rows = summarize_rows(
        raw_rows,
        expected_realizations=expected_realizations,
        expected_clusters=expected_clusters,
    )
    _write_table(summary_path, SUMMARY_FIELDNAMES, summary_rows)

    best_rows = select_best_by_noise(summary_rows)
    plot_paths = render_plots(best_rows, plots_dir=plots_dir, include_derivative=stage == "confirmatory") if make_plots else []

    manifest_paths = {
        "metrics_raw": str(metrics_raw_path),
        "summary_by_setting": str(summary_path),
        "plots_dir": str(plots_dir),
    }
    counts: dict[str, Any] = {
        "n_samples": int(dataset["noisy_observations"].shape[0]),
        "n_settings": int(len(settings)),
        "n_rows_expected": int(total_rows),
        "n_rows_written": int(len(raw_rows)),
        "n_summary_rows": int(len(summary_rows)),
    }

    if stage == "pilot":
        family_screen_rows = build_family_screen(summary_rows, noise_levels=noise_levels)
        _write_table(family_screen_path, FAMILY_SCREEN_FIELDNAMES, family_screen_rows)
        manifest_paths["family_screen"] = str(family_screen_path)
        counts["n_family_screen_rows"] = int(len(family_screen_rows))
    else:
        robust_rows = select_robust_settings(summary_rows, noise_levels=noise_levels)
        comparison_rows = _family_comparison_rows(best_rows)
        _write_table(best_by_noise_path, SUMMARY_FIELDNAMES, best_rows)
        _write_table(robust_settings_path, ROBUST_FIELDNAMES, robust_rows)
        _write_table(family_comparison_path, SUMMARY_FIELDNAMES, comparison_rows)
        manifest_paths.update(
            {
                "best_by_noise": str(best_by_noise_path),
                "robust_settings": str(robust_settings_path),
                "family_comparison": str(family_comparison_path),
            }
        )
        counts["n_best_rows"] = int(len(best_rows))
        counts["n_robust_rows"] = int(len(robust_rows))
        counts["n_family_comparison_rows"] = int(len(comparison_rows))

    manifest = {
        "stage": stage,
        "dataset": dataset_outputs if stage != "pilot" else _portable_dataset_paths(dataset_dir),
        "paths": manifest_paths,
        "settings": {
            "trajectory_seeds": list(selected_trajectory_seeds),
            "replicate_ids": list(replicate_ids),
            "noise_levels": list(noise_levels),
            "savgol_references": [list(item) for item in savgol_references],
            "anchor_references": [dict(item) for item in anchor_references],
            "normalized_kernel_kernels": list(normalized_kernel_kernels),
            "normalized_kernel_spans": list(normalized_kernel_spans),
            "local_linear_kernels": list(local_linear_kernels),
            "local_linear_spans": list(local_linear_spans),
            "spline_lambda_rels": list(spline_lambda_rels),
        },
        "counts": counts,
        "plots": plot_paths,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    _write_output_log(output_log_path, manifest)
    return manifest


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the staged Lorenz63 denoising benchmark v2.")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--stage", choices=("pilot", "confirmatory"), default="pilot")
    parser.add_argument("--trajectory-seeds", type=int, nargs="+")
    parser.add_argument("--replicate-ids", type=int, nargs="+", default=list(DEFAULT_REPLICATE_IDS))
    parser.add_argument("--noise-levels", type=float, nargs="+", default=list(DEFAULT_NOISE_LEVELS))
    parser.add_argument("--dt", type=float, default=DEFAULT_DT)
    parser.add_argument("--burn-in-steps", type=int, default=DEFAULT_BURN_IN_STEPS)
    parser.add_argument("--record-steps", type=int, default=DEFAULT_RECORD_STEPS)
    parser.add_argument("--sigma", type=float, default=DEFAULT_SIGMA)
    parser.add_argument("--rho", type=float, default=DEFAULT_RHO)
    parser.add_argument("--beta", type=float, default=DEFAULT_BETA)
    parser.add_argument("--confirmatory-settings-json", type=Path)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--skip-plots", action="store_true")
    args = parser.parse_args(argv)

    confirmatory_settings = (
        _load_confirmatory_settings(args.confirmatory_settings_json)
        if args.confirmatory_settings_json is not None
        else None
    )
    manifest = run_stage(
        out_dir=args.out_dir,
        stage=args.stage,  # type: ignore[arg-type]
        trajectory_seeds=args.trajectory_seeds,
        replicate_ids=args.replicate_ids,
        noise_levels=args.noise_levels,
        dt=args.dt,
        burn_in_steps=args.burn_in_steps,
        record_steps=args.record_steps,
        sigma=args.sigma,
        rho=args.rho,
        beta=args.beta,
        confirmatory_settings=confirmatory_settings,
        overwrite=args.overwrite,
        make_plots=not args.skip_plots,
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
