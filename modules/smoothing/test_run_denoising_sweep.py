from __future__ import annotations

import csv
import json

from modules.smoothing.run_denoising_sweep import (
    restore_portable_artifacts,
    run_sweep,
    summarize_rows,
)


def test_summarize_rows_computes_cluster_variance_and_completeness() -> None:
    raw_rows = [
        {
            "sample_index": 0,
            "clean_index": 0,
            "trajectory_seed": 0,
            "replicate_id": 0,
            "noise_seed": 1000,
            "alpha": 0.05,
            "method": "savitzky_golay",
            "setting_id": "savgol|w=7|p=2",
            "window_length": 7,
            "polyorder": 2,
            "n_anchors": "",
            "bandwidth_multiplier": "",
            "bandwidth": "",
            "kernel_type": "",
            "kernel_degree": "",
            "rmse": 1.0,
            "relative_rmse": 0.5,
            "denoising_gain": 0.2,
            "rmse_x": 1.0,
            "rmse_y": 1.0,
            "rmse_z": 1.0,
        },
        {
            "sample_index": 1,
            "clean_index": 0,
            "trajectory_seed": 0,
            "replicate_id": 1,
            "noise_seed": 1001,
            "alpha": 0.05,
            "method": "savitzky_golay",
            "setting_id": "savgol|w=7|p=2",
            "window_length": 7,
            "polyorder": 2,
            "n_anchors": "",
            "bandwidth_multiplier": "",
            "bandwidth": "",
            "kernel_type": "",
            "kernel_degree": "",
            "rmse": 3.0,
            "relative_rmse": 1.5,
            "denoising_gain": 0.4,
            "rmse_x": 3.0,
            "rmse_y": 3.0,
            "rmse_z": 3.0,
        },
        {
            "sample_index": 2,
            "clean_index": 1,
            "trajectory_seed": 1,
            "replicate_id": 0,
            "noise_seed": 1002,
            "alpha": 0.05,
            "method": "savitzky_golay",
            "setting_id": "savgol|w=7|p=2",
            "window_length": 7,
            "polyorder": 2,
            "n_anchors": "",
            "bandwidth_multiplier": "",
            "bandwidth": "",
            "kernel_type": "",
            "kernel_degree": "",
            "rmse": 5.0,
            "relative_rmse": 2.5,
            "denoising_gain": 0.6,
            "rmse_x": 5.0,
            "rmse_y": 5.0,
            "rmse_z": 5.0,
        },
        {
            "sample_index": 3,
            "clean_index": 1,
            "trajectory_seed": 1,
            "replicate_id": 1,
            "noise_seed": 1003,
            "alpha": 0.05,
            "method": "savitzky_golay",
            "setting_id": "savgol|w=7|p=2",
            "window_length": 7,
            "polyorder": 2,
            "n_anchors": "",
            "bandwidth_multiplier": "",
            "bandwidth": "",
            "kernel_type": "",
            "kernel_degree": "",
            "rmse": 7.0,
            "relative_rmse": 3.5,
            "denoising_gain": 0.8,
            "rmse_x": 7.0,
            "rmse_y": 7.0,
            "rmse_z": 7.0,
        },
    ]

    summary_rows = summarize_rows(raw_rows, expected_realizations=4, expected_clusters=2)
    assert len(summary_rows) == 1
    summary = summary_rows[0]
    assert summary["n_realizations"] == 4
    assert summary["n_clusters"] == 2
    assert summary["eligible_for_ranking"] is True
    assert summary["mean_rmse"] == 4.0
    assert summary["variance_cluster_rmse"] == 8.0
    assert summary["mean_relative_rmse"] == 2.0
    assert summary["variance_cluster_relative_rmse"] == 2.0


def test_run_sweep_writes_required_outputs_for_smoke_configuration(tmp_path) -> None:
    out_dir = tmp_path / "smoke"
    manifest = run_sweep(
        out_dir=out_dir,
        trajectory_seeds=[0, 1],
        replicate_ids=[0],
        noise_levels=[0.05, 0.10],
        dt=0.01,
        burn_in_steps=32,
        record_steps=64,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        window_lengths=[7],
        polyorders=[2],
        kernel_anchors=[8],
        bandwidth_multipliers=[1.0],
        kernel_types=["gaussian", "compact_polynomial"],
        kernel_degrees=[2],
        overwrite=True,
        make_plots=True,
    )

    assert manifest["counts"]["n_rows_expected"] == 12
    assert manifest["counts"]["n_rows_written"] == 12
    assert manifest["counts"]["n_best_rows"] == 4
    assert manifest["counts"]["n_robust_rows"] == 4

    metrics_raw_path = out_dir / "metrics_raw.csv"
    summary_path = out_dir / "summary_by_setting.csv"
    best_path = out_dir / "best_by_noise.csv"
    robust_path = out_dir / "robust_settings.csv"
    manifest_path = out_dir / "run_manifest.json"

    for path in (
        metrics_raw_path,
        summary_path,
        best_path,
        robust_path,
        manifest_path,
        out_dir / "plots" / "rmse_vs_noise.png",
        out_dir / "plots" / "relative_rmse_vs_noise.png",
        out_dir / "plots" / "denoising_gain_vs_noise.png",
        out_dir / "dataset" / "clean_trajectories.npz",
        out_dir / "dataset" / "noisy_observations.npz",
        out_dir / "dataset" / "metadata.json",
    ):
        assert path.exists()

    with metrics_raw_path.open(newline="", encoding="utf-8") as handle:
        raw_rows = list(csv.DictReader(handle))
    assert len(raw_rows) == 12

    with best_path.open(newline="", encoding="utf-8") as handle:
        best_rows = list(csv.DictReader(handle))
    assert len(best_rows) == 4
    assert {row["method"] for row in best_rows} == {"savitzky_golay", "kernel_smoothing"}

    saved_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert saved_manifest["counts"]["n_summary_rows"] == 6


def test_restore_portable_artifacts_rewrites_paths_and_recreates_plots(tmp_path) -> None:
    out_dir = tmp_path / "portable"
    manifest = run_sweep(
        out_dir=out_dir,
        trajectory_seeds=[0, 1],
        replicate_ids=[0],
        noise_levels=[0.05, 0.10],
        dt=0.01,
        burn_in_steps=32,
        record_steps=64,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        window_lengths=[7],
        polyorders=[2],
        kernel_anchors=[8],
        bandwidth_multipliers=[1.0],
        kernel_types=["gaussian", "compact_polynomial"],
        kernel_degrees=[2],
        overwrite=True,
        make_plots=True,
    )

    old_root = "/tmp/original-worktree/modules/smoothing/artifacts/lorenz63-denoising-sweep-v1"
    stale_manifest = json.loads(json.dumps(manifest).replace(str(out_dir), old_root))
    (out_dir / "run_manifest.json").write_text(
        json.dumps(stale_manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (out_dir / "output.log").write_text(
        "\n".join(
            [
                json.dumps(
                    {
                        "status": "setting-complete",
                        "setting_id": "savgol|w=7|p=2",
                        "rows_written": 4,
                        "total_rows": 12,
                    },
                    sort_keys=True,
                ),
                json.dumps(stale_manifest, indent=2, sort_keys=True),
                "",
            ]
        ),
        encoding="utf-8",
    )
    for plot_path in out_dir.glob("plots/*.png"):
        plot_path.unlink()

    restored = restore_portable_artifacts(out_dir)

    expected_plot_dir = out_dir / "plots"
    assert restored["paths"]["plots_dir"] == str(expected_plot_dir)
    assert all(path.startswith(str(expected_plot_dir)) for path in restored["plots"])
    for name in ("rmse_vs_noise.png", "relative_rmse_vs_noise.png", "denoising_gain_vs_noise.png"):
        assert (expected_plot_dir / name).exists()

    saved_manifest = json.loads((out_dir / "run_manifest.json").read_text(encoding="utf-8"))
    assert saved_manifest["dataset"]["clean_path"] == str(out_dir / "dataset" / "clean_trajectories.npz")
    assert old_root not in (out_dir / "run_manifest.json").read_text(encoding="utf-8")

    output_log_text = (out_dir / "output.log").read_text(encoding="utf-8")
    assert '"status": "setting-complete"' in output_log_text
    assert old_root not in output_log_text
