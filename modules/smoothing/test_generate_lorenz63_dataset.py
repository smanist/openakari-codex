from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from modules.smoothing.generate_lorenz63_dataset import build_dataset, write_dataset


def test_build_dataset_is_reproducible_and_records_coordinate_scaled_noise() -> None:
    dataset_a = build_dataset(
        trajectory_seeds=[0, 1],
        replicate_ids=[0, 1],
        noise_levels=[0.02, 0.05],
        burn_in_steps=8,
        record_steps=16,
        dt=0.01,
    )
    dataset_b = build_dataset(
        trajectory_seeds=[0, 1],
        replicate_ids=[0, 1],
        noise_levels=[0.02, 0.05],
        burn_in_steps=8,
        record_steps=16,
        dt=0.01,
    )

    np.testing.assert_allclose(dataset_a["clean_trajectories"], dataset_b["clean_trajectories"])
    np.testing.assert_allclose(dataset_a["noisy_observations"], dataset_b["noisy_observations"])

    assert dataset_a["clean_trajectories"].shape == (2, 16, 3)
    assert dataset_a["coordinate_scales"].shape == (2, 3)
    assert dataset_a["noisy_observations"].shape == (8, 16, 3)
    assert dataset_a["noise_scales"].shape == (8, 3)

    seed_to_scale = {
        int(seed): scale for seed, scale in zip(dataset_a["trajectory_seeds"], dataset_a["coordinate_scales"], strict=True)
    }
    for trajectory_seed, replicate_id, alpha, noise_seed, noise_scales in zip(
        dataset_a["sample_trajectory_seeds"],
        dataset_a["sample_replicate_ids"],
        dataset_a["sample_noise_levels"],
        dataset_a["sample_noise_seeds"],
        dataset_a["noise_scales"],
        strict=True,
    ):
        assert int(noise_seed) == 1000 + 2 * int(trajectory_seed) + int(replicate_id)
        np.testing.assert_allclose(noise_scales, float(alpha) * seed_to_scale[int(trajectory_seed)])

    metadata = dataset_a["metadata"]
    assert metadata["integration"]["method"] == "rk4"
    assert metadata["integration"]["burn_in_steps"] == 8
    assert metadata["integration"]["record_steps"] == 16


def test_each_saved_noise_seed_replays_its_noisy_sample() -> None:
    dataset = build_dataset(
        trajectory_seeds=[0],
        replicate_ids=[0],
        noise_levels=[0.02, 0.05],
        burn_in_steps=8,
        record_steps=16,
        dt=0.01,
    )

    clean_trajectory = dataset["clean_trajectories"][0]
    for noise_seed, noise_scales, noisy_observation in zip(
        dataset["sample_noise_seeds"],
        dataset["noise_scales"],
        dataset["noisy_observations"],
        strict=True,
    ):
        replay_rng = np.random.default_rng(int(noise_seed))
        replayed = clean_trajectory + replay_rng.normal(
            loc=0.0,
            scale=noise_scales,
            size=clean_trajectory.shape,
        )
        np.testing.assert_allclose(replayed, noisy_observation)


def test_write_dataset_saves_npz_artifacts_and_metadata(tmp_path: Path) -> None:
    out_dir = tmp_path / "lorenz63"
    outputs = write_dataset(
        out_dir=out_dir,
        trajectory_seeds=[0, 1],
        replicate_ids=[0, 1],
        noise_levels=[0.02, 0.05],
        burn_in_steps=8,
        record_steps=16,
        dt=0.01,
    )

    clean_path = Path(outputs["clean_path"])
    noisy_path = Path(outputs["noisy_path"])
    metadata_path = Path(outputs["metadata_path"])

    assert clean_path.exists()
    assert noisy_path.exists()
    assert metadata_path.exists()

    with np.load(clean_path) as clean_npz:
        assert clean_npz["trajectories"].shape == (2, 16, 3)
        assert clean_npz["trajectory_seeds"].tolist() == [0, 1]
        assert clean_npz["coordinate_scales"].shape == (2, 3)

    with np.load(noisy_path) as noisy_npz:
        assert noisy_npz["observations"].shape == (8, 16, 3)
        assert noisy_npz["trajectory_seeds"].shape == (8,)
        assert noisy_npz["noise_scales"].shape == (8, 3)
        assert set(np.round(noisy_npz["alpha"], 2).tolist()) == {0.02, 0.05}

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    assert metadata["dataset_counts"] == {
        "n_clean_trajectories": 2,
        "n_noise_levels": 2,
        "n_replicates_per_clean": 2,
        "n_noisy_samples": 8,
    }
    assert metadata["integration"]["dt"] == 0.01
    assert len(metadata["clean_trajectory_metadata"]) == 2
    assert all("coordinate_scales" in item for item in metadata["clean_trajectory_metadata"])
