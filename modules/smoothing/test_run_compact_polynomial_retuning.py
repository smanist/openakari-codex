from __future__ import annotations

import csv
import json
import statistics

from modules.smoothing.run_compact_polynomial_retuning import (
    enumerate_retuning_settings,
    run_compact_polynomial_retuning,
)


def test_enumerate_retuning_settings_uses_exact_references_and_compact_grid() -> None:
    settings = enumerate_retuning_settings(
        n_samples=64,
        reference_savgol_settings=[(7, 2), (11, 3)],
        kernel_anchors=[8, 128],
        bandwidth_multipliers=[0.5, 1.0],
        kernel_degrees=[1, 3],
    )

    setting_ids = [setting.setting_id for setting in settings]
    assert setting_ids[:2] == ["savgol|w=7|p=2", "savgol|w=11|p=3"]
    assert "kernel|type=gaussian|M=8|ch=0.5" not in setting_ids
    assert "kernel|type=compact_polynomial|M=8|ch=0.5|degree=1" in setting_ids
    assert "kernel|type=compact_polynomial|M=8|ch=1|degree=3" in setting_ids
    assert all("M=128" not in setting_id for setting_id in setting_ids)
    assert len(settings) == 6


def test_run_compact_polynomial_retuning_writes_summary_and_typical_plot(tmp_path) -> None:
    out_dir = tmp_path / "retuning"
    manifest = run_compact_polynomial_retuning(
        out_dir=out_dir,
        trajectory_seeds=[0, 1],
        replicate_ids=[0],
        alpha=0.2,
        dt=0.01,
        burn_in_steps=32,
        record_steps=64,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        reference_savgol_settings=[(7, 2), (11, 3)],
        kernel_anchors=[8],
        bandwidth_multipliers=[1.0],
        kernel_degrees=[2],
        overwrite=True,
    )

    metrics_raw_path = out_dir / "metrics_raw.csv"
    summary_path = out_dir / "summary_by_setting.csv"
    best_compact_path = out_dir / "best_compact_setting.csv"
    reference_summary_path = out_dir / "sg_reference_summary.csv"
    manifest_path = out_dir / "run_manifest.json"
    plot_path = out_dir / "plots" / "typical_denoised_trajectory.png"

    for path in (
        metrics_raw_path,
        summary_path,
        best_compact_path,
        reference_summary_path,
        manifest_path,
        plot_path,
        out_dir / "dataset" / "clean_trajectories.npz",
        out_dir / "dataset" / "noisy_observations.npz",
        out_dir / "dataset" / "metadata.json",
    ):
        assert path.exists()

    assert manifest["counts"]["n_settings"] == 3
    assert manifest["counts"]["n_reference_settings"] == 2
    assert manifest["counts"]["n_compact_settings"] == 1
    assert manifest["counts"]["n_rows_written"] == 6
    assert manifest["plots"] == [str(plot_path)]

    with best_compact_path.open(newline="", encoding="utf-8") as handle:
        best_compact_rows = list(csv.DictReader(handle))
    assert len(best_compact_rows) == 1
    assert best_compact_rows[0]["kernel_type"] == "compact_polynomial"

    with reference_summary_path.open(newline="", encoding="utf-8") as handle:
        reference_rows = list(csv.DictReader(handle))
    assert len(reference_rows) == 2
    assert {row["setting_id"] for row in reference_rows} == {"savgol|w=7|p=2", "savgol|w=11|p=3"}

    with metrics_raw_path.open(newline="", encoding="utf-8") as handle:
        metrics_rows = list(csv.DictReader(handle))

    saved_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert saved_manifest["paths"]["best_compact_setting"] == str(best_compact_path)
    assert saved_manifest["paths"]["sg_reference_summary"] == str(reference_summary_path)
    representative = saved_manifest["representative_sample"]
    assert representative["selection_setting_id"] == best_compact_rows[0]["setting_id"]
    assert "closest to the median rmse" in representative["selection_rule"]

    compact_rows = [
        row for row in metrics_rows if row["setting_id"] == representative["selection_setting_id"]
    ]
    expected_median_rmse = statistics.median(float(row["rmse"]) for row in compact_rows)
    expected_median_relative_rmse = statistics.median(
        float(row["relative_rmse"]) for row in compact_rows
    )
    ranked_rows = sorted(
        compact_rows,
        key=lambda row: (
            abs(float(row["rmse"]) - expected_median_rmse),
            abs(float(row["relative_rmse"]) - expected_median_relative_rmse),
            int(row["sample_index"]),
        ),
    )
    expected_row = ranked_rows[0]
    assert representative["sample_index"] == int(expected_row["sample_index"])
    assert representative["trajectory_seed"] == int(expected_row["trajectory_seed"])
    assert representative["replicate_id"] == int(expected_row["replicate_id"])
    assert representative["noise_seed"] == int(expected_row["noise_seed"])
    assert representative["rmse"] == float(expected_row["rmse"])
    assert representative["median_rmse"] == expected_median_rmse
    assert representative["median_relative_rmse"] == expected_median_relative_rmse
