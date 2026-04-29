from __future__ import annotations

import csv
import json

from modules.smoothing.generate_lorenz63_dataset import DEFAULT_TRAJECTORY_SEEDS
from modules.smoothing.run_denoising_sweep_v2 import (
    DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS,
    _load_confirmatory_settings,
    run_stage,
)


def test_run_stage_writes_required_pilot_outputs_for_smoke_configuration(tmp_path) -> None:
    out_dir = tmp_path / "pilot"
    manifest = run_stage(
        out_dir=out_dir,
        stage="pilot",
        trajectory_seeds=[0, 1],
        replicate_ids=[0],
        noise_levels=[0.05, 0.10],
        dt=0.01,
        burn_in_steps=32,
        record_steps=64,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        savgol_references=[(7, 2)],
        anchor_references=[
            {"kernel_type": "gaussian", "n_anchors": 8, "bandwidth_multiplier": 1.0},
            {
                "kernel_type": "compact_polynomial",
                "n_anchors": 8,
                "bandwidth_multiplier": 1.0,
                "kernel_degree": 2,
            },
        ],
        normalized_kernel_kernels=["gaussian"],
        normalized_kernel_spans=[7],
        local_linear_kernels=["tricube"],
        local_linear_spans=[7],
        spline_lambda_rels=[0.5],
        overwrite=True,
        make_plots=True,
    )

    assert manifest["stage"] == "pilot"
    assert manifest["counts"]["n_settings"] == 6
    assert manifest["counts"]["n_rows_expected"] == 24
    assert manifest["counts"]["n_rows_written"] == 24
    assert manifest["counts"]["n_family_screen_rows"] == 3

    required_paths = (
        out_dir / "metrics_raw.csv",
        out_dir / "summary_by_setting.csv",
        out_dir / "family_screen.csv",
        out_dir / "run_manifest.json",
        out_dir / "output.log",
        out_dir / "plots" / "rmse_vs_noise.png",
        out_dir / "plots" / "relative_rmse_vs_noise.png",
        out_dir / "plots" / "denoising_gain_vs_noise.png",
        out_dir / "dataset" / "clean_trajectories.npz",
        out_dir / "dataset" / "noisy_observations.npz",
        out_dir / "dataset" / "metadata.json",
    )
    for path in required_paths:
        assert path.exists()

    with (out_dir / "metrics_raw.csv").open(newline="", encoding="utf-8") as handle:
        raw_rows = list(csv.DictReader(handle))
    assert len(raw_rows) == 24
    assert {"family", "span", "lambda_rel", "derivative_rmse"} <= set(raw_rows[0])

    with (out_dir / "family_screen.csv").open(newline="", encoding="utf-8") as handle:
        screen_rows = list(csv.DictReader(handle))
    assert len(screen_rows) == 3
    assert {row["family"] for row in screen_rows} == {
        "cubic_smoothing_spline",
        "local_linear_regression",
        "normalized_kernel_regression",
    }
    assert all(row["selected_for_confirmatory"] == "true" for row in screen_rows)

    saved_manifest = json.loads((out_dir / "run_manifest.json").read_text(encoding="utf-8"))
    assert saved_manifest["paths"]["family_screen"] == str(out_dir / "family_screen.csv")


def test_confirmatory_default_trajectory_seeds_are_fresh_and_non_overlapping(tmp_path) -> None:
    assert len(DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS) == 8
    assert set(DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS).isdisjoint(DEFAULT_TRAJECTORY_SEEDS)

    out_dir = tmp_path / "confirmatory"
    manifest = run_stage(
        out_dir=out_dir,
        stage="confirmatory",
        replicate_ids=[0],
        noise_levels=[0.05],
        dt=0.01,
        burn_in_steps=16,
        record_steps=32,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        savgol_references=[(7, 2)],
        anchor_references=[
            {"kernel_type": "gaussian", "n_anchors": 8, "bandwidth_multiplier": 1.0},
        ],
        confirmatory_settings=[],
        overwrite=True,
        make_plots=False,
    )

    assert manifest["settings"]["trajectory_seeds"] == list(DEFAULT_CONFIRMATORY_TRAJECTORY_SEEDS)


def test_confirmatory_settings_loader_filters_full_pilot_family_screen_by_selection_flag(
    tmp_path,
) -> None:
    pilot_dir = tmp_path / "pilot"
    run_stage(
        out_dir=pilot_dir,
        stage="pilot",
        trajectory_seeds=[0],
        replicate_ids=[0],
        noise_levels=[0.05, 0.10],
        dt=0.01,
        burn_in_steps=16,
        record_steps=64,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        savgol_references=[(7, 2)],
        anchor_references=[
            {"kernel_type": "gaussian", "n_anchors": 8, "bandwidth_multiplier": 1.0},
        ],
        normalized_kernel_kernels=["gaussian"],
        normalized_kernel_spans=[5, 7, 9],
        local_linear_kernels=["tricube"],
        local_linear_spans=[5, 7, 9],
        spline_lambda_rels=[0.25, 0.5, 1.0],
        overwrite=True,
        make_plots=False,
    )

    with (pilot_dir / "family_screen.csv").open(newline="", encoding="utf-8") as handle:
        screen_rows = list(csv.DictReader(handle))
    selected_rows = [
        row for row in screen_rows if row["selected_for_confirmatory"] == "true"
    ]

    assert len(selected_rows) > 0
    assert len(screen_rows) > len(selected_rows)

    confirmatory_settings_json = tmp_path / "confirmatory-settings.json"
    confirmatory_settings_json.write_text(
        json.dumps(screen_rows, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    loaded_settings = _load_confirmatory_settings(confirmatory_settings_json)

    assert len(loaded_settings) == len(selected_rows)
    assert {setting.method for setting in loaded_settings} == {
        "cubic_smoothing_spline",
        "local_linear_regression",
        "normalized_kernel_regression",
    }
    assert any(isinstance(setting.span, int) for setting in loaded_settings if setting.span is not None)
    assert any(
        isinstance(setting.lambda_rel, float)
        for setting in loaded_settings
        if setting.lambda_rel is not None
    )

    confirmatory_manifest = run_stage(
        out_dir=tmp_path / "confirmatory",
        stage="confirmatory",
        trajectory_seeds=[5],
        replicate_ids=[0],
        noise_levels=[0.05],
        dt=0.01,
        burn_in_steps=16,
        record_steps=32,
        sigma=10.0,
        rho=28.0,
        beta=8.0 / 3.0,
        savgol_references=[(7, 2)],
        anchor_references=[
            {"kernel_type": "gaussian", "n_anchors": 8, "bandwidth_multiplier": 1.0},
        ],
        confirmatory_settings=loaded_settings,
        overwrite=True,
        make_plots=False,
    )

    assert confirmatory_manifest["counts"]["n_settings"] == 2 + len(selected_rows)
