#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Sequence

import matplotlib.pyplot as plt
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from modules.smoothing.generate_lorenz63_dataset import (
    DEFAULT_BETA,
    DEFAULT_BURN_IN_STEPS,
    DEFAULT_DT,
    DEFAULT_RECORD_STEPS,
    DEFAULT_REPLICATE_IDS,
    DEFAULT_RHO,
    DEFAULT_SIGMA,
    DEFAULT_TRAJECTORY_SEEDS,
    build_dataset,
)
from modules.smoothing.run_denoising_sweep import (
    RAW_FIELDNAMES,
    SUMMARY_FIELDNAMES,
    SweepSetting,
    _build_setting_evaluator,
    _compute_metrics,
    _float_text,
    _portable_path,
    _save_dataset_artifacts,
    _write_output_log,
    _write_table,
    summarize_rows,
)


DEFAULT_RETUNING_ALPHA = 0.20
DEFAULT_REFERENCE_SAVGOL_SETTINGS = ((41, 5), (21, 3))
DEFAULT_RETUNING_KERNEL_ANCHORS = (128, 192, 256, 384, 512)
DEFAULT_RETUNING_BANDWIDTH_MULTIPLIERS = (0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0)
DEFAULT_RETUNING_KERNEL_DEGREES = (1, 2, 3, 4, 6, 8)


def _parse_reference_setting(text: str) -> tuple[int, int]:
    pieces = text.split(":")
    if len(pieces) != 2:
        raise argparse.ArgumentTypeError(
            f"Invalid --reference-savgol value {text!r}; expected WINDOW:POLYORDER."
        )
    try:
        return int(pieces[0]), int(pieces[1])
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid --reference-savgol value {text!r}; expected integer WINDOW:POLYORDER."
        ) from exc


def enumerate_retuning_settings(
    *,
    n_samples: int,
    reference_savgol_settings: Sequence[tuple[int, int]],
    kernel_anchors: Sequence[int],
    bandwidth_multipliers: Sequence[float],
    kernel_degrees: Sequence[int],
) -> list[SweepSetting]:
    settings: list[SweepSetting] = []

    for window_length, polyorder in reference_savgol_settings:
        if window_length > n_samples or window_length % 2 == 0 or window_length < 3:
            raise ValueError(
                f"Savitzky-Golay reference window_length={window_length} is invalid for n_samples={n_samples}."
            )
        if polyorder >= window_length:
            raise ValueError(
                f"Savitzky-Golay reference polyorder={polyorder} must be less than window_length={window_length}."
            )
        settings.append(
            SweepSetting(
                method="savitzky_golay",
                setting_id=f"savgol|w={window_length}|p={polyorder}",
                window_length=int(window_length),
                polyorder=int(polyorder),
            )
        )

    compact_count = 0
    for n_anchors in kernel_anchors:
        if n_anchors < 2 or n_anchors > n_samples:
            continue
        for bandwidth_multiplier in bandwidth_multipliers:
            bandwidth = float(bandwidth_multiplier) * float(n_samples - 1) / float(n_anchors - 1)
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
                compact_count += 1

    if compact_count == 0:
        raise ValueError("No valid compact-polynomial settings remain after applying the requested grids.")
    return settings


def _compact_tiebreak_key(row: dict[str, Any]) -> tuple[float, float, float, int, float, int]:
    return (
        float(row["mean_rmse"]),
        float(row["mean_relative_rmse"]),
        float(row["variance_cluster_rmse"]),
        -int(row["n_anchors"]),
        float(row["bandwidth_multiplier"]),
        int(row["kernel_degree"]),
    )


def select_best_compact_setting(summary_rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    compact_rows = [
        row
        for row in summary_rows
        if row["eligible_for_ranking"] and str(row["kernel_type"]) == "compact_polynomial"
    ]
    if not compact_rows:
        raise ValueError("No eligible compact-polynomial summary rows were produced.")
    return dict(min(compact_rows, key=_compact_tiebreak_key))


def select_reference_summary_rows(
    summary_rows: Sequence[dict[str, Any]],
    *,
    reference_savgol_settings: Sequence[tuple[int, int]],
) -> list[dict[str, Any]]:
    by_setting_id = {str(row["setting_id"]): dict(row) for row in summary_rows}
    selected_rows: list[dict[str, Any]] = []
    for window_length, polyorder in reference_savgol_settings:
        setting_id = f"savgol|w={window_length}|p={polyorder}"
        try:
            selected_rows.append(by_setting_id[setting_id])
        except KeyError as exc:
            raise ValueError(f"Missing summary row for required SG reference {setting_id}.") from exc
    return selected_rows


def select_representative_sample(
    *,
    sample_contexts: Sequence[dict[str, Any]],
    raw_rows: Sequence[dict[str, Any]],
    setting_id: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    candidate_rows = [row for row in raw_rows if str(row["setting_id"]) == setting_id]
    if not candidate_rows:
        raise ValueError(f"No raw rows found for representative-sample selection setting {setting_id}.")

    rmse_values = np.asarray([float(row["rmse"]) for row in candidate_rows], dtype=np.float64)
    relative_rmse_values = np.asarray(
        [float(row["relative_rmse"]) for row in candidate_rows],
        dtype=np.float64,
    )
    median_rmse = float(np.median(rmse_values))
    median_relative_rmse = float(np.median(relative_rmse_values))

    best_row = min(
        candidate_rows,
        key=lambda row: (
            abs(float(row["rmse"]) - median_rmse),
            abs(float(row["relative_rmse"]) - median_relative_rmse),
            int(row["sample_index"]),
        ),
    )
    sample_index = int(best_row["sample_index"])
    representative_sample = dict(sample_contexts[sample_index])
    provenance = {
        "selection_setting_id": setting_id,
        "selection_rule": (
            "choose the realization whose best-compact rmse is closest to the median rmse "
            "across realizations; break ties by closest relative_rmse, then lowest sample_index"
        ),
        "sample_index": sample_index,
        "clean_index": int(representative_sample["clean_index"]),
        "trajectory_seed": int(representative_sample["trajectory_seed"]),
        "replicate_id": int(representative_sample["replicate_id"]),
        "noise_seed": int(representative_sample["noise_seed"]),
        "alpha": float(representative_sample["alpha"]),
        "rmse": float(best_row["rmse"]),
        "relative_rmse": float(best_row["relative_rmse"]),
        "denoising_gain": float(best_row["denoising_gain"]),
        "median_rmse": median_rmse,
        "median_relative_rmse": median_relative_rmse,
        "abs_rmse_delta": abs(float(best_row["rmse"]) - median_rmse),
        "abs_relative_rmse_delta": abs(float(best_row["relative_rmse"]) - median_relative_rmse),
    }
    return representative_sample, provenance


def render_typical_trajectory_plot(
    *,
    plot_path: Path,
    clean: np.ndarray,
    noisy: np.ndarray,
    reference_signals: Sequence[tuple[str, np.ndarray]],
    best_compact_label: str,
    best_compact_signal: np.ndarray,
) -> str:
    plot_path.parent.mkdir(parents=True, exist_ok=True)
    time_index = np.arange(clean.shape[0], dtype=np.int64)
    coordinate_labels = ("x", "y", "z")

    fig, axes = plt.subplots(nrows=3, ncols=1, figsize=(11, 8), sharex=True)
    line_specs = [
        ("Clean", clean, {"linewidth": 2.0, "color": "black"}),
        ("Noisy", noisy, {"linewidth": 1.0, "color": "tab:gray", "alpha": 0.8}),
    ]
    for label, signal in reference_signals:
        line_specs.append((label, signal, {"linewidth": 1.5}))
    line_specs.append((best_compact_label, best_compact_signal, {"linewidth": 1.8}))

    for coordinate_index, axis in enumerate(axes):
        for label, signal, style in line_specs:
            axis.plot(time_index, signal[:, coordinate_index], label=label, **style)
        axis.set_ylabel(coordinate_labels[coordinate_index])
        axis.grid(True, alpha=0.3)
    axes[0].legend(loc="upper right", fontsize=8)
    axes[-1].set_xlabel("Sample index")
    fig.suptitle("Typical denoised trajectory at fixed alpha")
    fig.tight_layout()
    fig.savefig(plot_path, dpi=150)
    plt.close(fig)
    return _portable_path(plot_path)


def _build_retuning_manifest(
    *,
    dataset_outputs: dict[str, str],
    metrics_raw_path: Path,
    summary_path: Path,
    best_compact_path: Path,
    reference_summary_path: Path,
    plots_dir: Path,
    settings: dict[str, Any],
    counts: dict[str, Any],
    plot_paths: Sequence[str],
    representative_sample: dict[str, Any],
) -> dict[str, Any]:
    return {
        "dataset": dataset_outputs,
        "paths": {
            "metrics_raw": _portable_path(metrics_raw_path),
            "summary_by_setting": _portable_path(summary_path),
            "best_compact_setting": _portable_path(best_compact_path),
            "sg_reference_summary": _portable_path(reference_summary_path),
            "plots_dir": _portable_path(plots_dir),
        },
        "settings": settings,
        "counts": counts,
        "plots": list(plot_paths),
        "representative_sample": representative_sample,
    }


def run_compact_polynomial_retuning(
    *,
    out_dir: Path,
    trajectory_seeds: Sequence[int],
    replicate_ids: Sequence[int],
    alpha: float,
    dt: float,
    burn_in_steps: int,
    record_steps: int,
    sigma: float,
    rho: float,
    beta: float,
    reference_savgol_settings: Sequence[tuple[int, int]],
    kernel_anchors: Sequence[int],
    bandwidth_multipliers: Sequence[float],
    kernel_degrees: Sequence[int],
    overwrite: bool,
) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    metrics_raw_path = out_dir / "metrics_raw.csv"
    summary_path = out_dir / "summary_by_setting.csv"
    best_compact_path = out_dir / "best_compact_setting.csv"
    reference_summary_path = out_dir / "sg_reference_summary.csv"
    manifest_path = out_dir / "run_manifest.json"
    output_log_path = out_dir / "output.log"
    plots_dir = out_dir / "plots"
    dataset_dir = out_dir / "dataset"

    output_paths = [
        metrics_raw_path,
        summary_path,
        best_compact_path,
        reference_summary_path,
        manifest_path,
        output_log_path,
    ]
    if not overwrite and any(path.exists() for path in output_paths):
        raise FileExistsError(f"Refusing to overwrite existing retuning outputs in {out_dir}")

    dataset = build_dataset(
        trajectory_seeds=trajectory_seeds,
        replicate_ids=replicate_ids,
        noise_levels=[alpha],
        dt=dt,
        burn_in_steps=burn_in_steps,
        record_steps=record_steps,
        sigma=sigma,
        rho=rho,
        beta=beta,
    )
    dataset_outputs = _save_dataset_artifacts(dataset, dataset_dir, overwrite=overwrite)

    settings = enumerate_retuning_settings(
        n_samples=record_steps,
        reference_savgol_settings=reference_savgol_settings,
        kernel_anchors=kernel_anchors,
        bandwidth_multipliers=bandwidth_multipliers,
        kernel_degrees=kernel_degrees,
    )
    total_rows = int(dataset["noisy_observations"].shape[0]) * int(len(settings))
    expected_realizations = len(tuple(trajectory_seeds)) * len(tuple(replicate_ids))
    expected_clusters = len(tuple(trajectory_seeds))

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
    evaluator_by_setting_id: dict[str, Any] = {}
    with metrics_raw_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_FIELDNAMES)
        writer.writeheader()
        handle.flush()
        completed_rows = 0
        for setting in settings:
            evaluator = _build_setting_evaluator(setting, record_steps)
            evaluator_by_setting_id[setting.setting_id] = evaluator
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

    summary_rows = summarize_rows(
        raw_rows,
        expected_realizations=expected_realizations,
        expected_clusters=expected_clusters,
    )
    best_compact_row = select_best_compact_setting(summary_rows)
    reference_rows = select_reference_summary_rows(
        summary_rows,
        reference_savgol_settings=reference_savgol_settings,
    )

    representative_sample, representative_sample_provenance = select_representative_sample(
        sample_contexts=sample_contexts,
        raw_rows=raw_rows,
        setting_id=str(best_compact_row["setting_id"]),
    )
    reference_signals: list[tuple[str, np.ndarray]] = []
    for row in reference_rows:
        evaluator = evaluator_by_setting_id[str(row["setting_id"])]
        reference_signals.append(
            (
                f"Reference {row['setting_id']}",
                np.asarray(evaluator(representative_sample["noisy"]), dtype=np.float64),
            )
        )
    best_compact_signal = np.asarray(
        evaluator_by_setting_id[str(best_compact_row["setting_id"])](representative_sample["noisy"]),
        dtype=np.float64,
    )
    plot_paths = [
        render_typical_trajectory_plot(
            plot_path=plots_dir / "typical_denoised_trajectory.png",
            clean=np.asarray(representative_sample["clean"], dtype=np.float64),
            noisy=np.asarray(representative_sample["noisy"], dtype=np.float64),
            reference_signals=reference_signals,
            best_compact_label=f"Best compact {best_compact_row['setting_id']}",
            best_compact_signal=best_compact_signal,
        )
    ]

    _write_table(summary_path, SUMMARY_FIELDNAMES, summary_rows)
    _write_table(best_compact_path, SUMMARY_FIELDNAMES, [best_compact_row])
    _write_table(reference_summary_path, SUMMARY_FIELDNAMES, reference_rows)

    manifest = _build_retuning_manifest(
        dataset_outputs=dataset_outputs,
        metrics_raw_path=metrics_raw_path,
        summary_path=summary_path,
        best_compact_path=best_compact_path,
        reference_summary_path=reference_summary_path,
        plots_dir=plots_dir,
        settings={
            "alpha": float(alpha),
            "reference_savgol_settings": [
                {"window_length": int(window_length), "polyorder": int(polyorder)}
                for window_length, polyorder in reference_savgol_settings
            ],
            "kernel_anchors": list(kernel_anchors),
            "bandwidth_multipliers": list(bandwidth_multipliers),
            "kernel_degrees": list(kernel_degrees),
        },
        counts={
            "n_samples": int(dataset["noisy_observations"].shape[0]),
            "n_settings": int(len(settings)),
            "n_reference_settings": int(len(reference_savgol_settings)),
            "n_compact_settings": int(len(settings) - len(reference_savgol_settings)),
            "n_rows_expected": int(total_rows),
            "n_rows_written": int(len(raw_rows)),
            "n_summary_rows": int(len(summary_rows)),
        },
        plot_paths=plot_paths,
        representative_sample=representative_sample_provenance,
    )
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    _write_output_log(output_log_path, manifest)
    return manifest


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the fixed-alpha dense compact-polynomial kernel retuning sweep."
    )
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--trajectory-seeds", type=int, nargs="+", default=list(DEFAULT_TRAJECTORY_SEEDS))
    parser.add_argument("--replicate-ids", type=int, nargs="+", default=list(DEFAULT_REPLICATE_IDS))
    parser.add_argument("--alpha", type=float, default=DEFAULT_RETUNING_ALPHA)
    parser.add_argument("--dt", type=float, default=DEFAULT_DT)
    parser.add_argument("--burn-in-steps", type=int, default=DEFAULT_BURN_IN_STEPS)
    parser.add_argument("--record-steps", type=int, default=DEFAULT_RECORD_STEPS)
    parser.add_argument("--sigma", type=float, default=DEFAULT_SIGMA)
    parser.add_argument("--rho", type=float, default=DEFAULT_RHO)
    parser.add_argument("--beta", type=float, default=DEFAULT_BETA)
    parser.add_argument(
        "--reference-savgol-settings",
        type=_parse_reference_setting,
        nargs="+",
        default=list(DEFAULT_REFERENCE_SAVGOL_SETTINGS),
        metavar="WINDOW:POLYORDER",
    )
    parser.add_argument(
        "--kernel-anchors",
        type=int,
        nargs="+",
        default=list(DEFAULT_RETUNING_KERNEL_ANCHORS),
    )
    parser.add_argument(
        "--bandwidth-multipliers",
        type=float,
        nargs="+",
        default=list(DEFAULT_RETUNING_BANDWIDTH_MULTIPLIERS),
    )
    parser.add_argument(
        "--kernel-degrees",
        type=int,
        nargs="+",
        default=list(DEFAULT_RETUNING_KERNEL_DEGREES),
    )
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)

    manifest = run_compact_polynomial_retuning(
        out_dir=args.out_dir,
        trajectory_seeds=args.trajectory_seeds,
        replicate_ids=args.replicate_ids,
        alpha=args.alpha,
        dt=args.dt,
        burn_in_steps=args.burn_in_steps,
        record_steps=args.record_steps,
        sigma=args.sigma,
        rho=args.rho,
        beta=args.beta,
        reference_savgol_settings=args.reference_savgol_settings,
        kernel_anchors=args.kernel_anchors,
        bandwidth_multipliers=args.bandwidth_multipliers,
        kernel_degrees=args.kernel_degrees,
        overwrite=args.overwrite,
    )
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
