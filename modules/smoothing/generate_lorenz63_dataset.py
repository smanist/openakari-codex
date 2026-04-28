#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Sequence

import numpy as np


DEFAULT_SIGMA = 10.0
DEFAULT_RHO = 28.0
DEFAULT_BETA = 8.0 / 3.0
DEFAULT_DT = 0.01
DEFAULT_BURN_IN_STEPS = 5000
DEFAULT_RECORD_STEPS = 2048
DEFAULT_TRAJECTORY_SEEDS = (0, 1, 2, 3, 4)
DEFAULT_REPLICATE_IDS = (0, 1)
DEFAULT_NOISE_LEVELS = (0.02, 0.05, 0.10, 0.20)


def lorenz63_rhs(
    state: np.ndarray,
    *,
    sigma: float = DEFAULT_SIGMA,
    rho: float = DEFAULT_RHO,
    beta: float = DEFAULT_BETA,
) -> np.ndarray:
    x, y, z = state
    return np.array(
        [
            sigma * (y - x),
            x * (rho - z) - y,
            x * y - beta * z,
        ],
        dtype=np.float64,
    )


def rk4_integrate(
    initial_state: np.ndarray,
    *,
    dt: float,
    burn_in_steps: int,
    record_steps: int,
    sigma: float = DEFAULT_SIGMA,
    rho: float = DEFAULT_RHO,
    beta: float = DEFAULT_BETA,
) -> np.ndarray:
    total_steps = burn_in_steps + record_steps
    state = np.asarray(initial_state, dtype=np.float64).copy()
    trajectory = np.empty((record_steps, 3), dtype=np.float64)
    record_index = 0

    for step in range(total_steps):
        k1 = lorenz63_rhs(state, sigma=sigma, rho=rho, beta=beta)
        k2 = lorenz63_rhs(state + 0.5 * dt * k1, sigma=sigma, rho=rho, beta=beta)
        k3 = lorenz63_rhs(state + 0.5 * dt * k2, sigma=sigma, rho=rho, beta=beta)
        k4 = lorenz63_rhs(state + dt * k3, sigma=sigma, rho=rho, beta=beta)
        state = state + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        if step >= burn_in_steps:
            trajectory[record_index] = state
            record_index += 1

    return trajectory


def make_initial_state(trajectory_seed: int) -> np.ndarray:
    rng = np.random.default_rng(trajectory_seed)
    return np.array([1.0, 1.0, 1.0], dtype=np.float64) + 0.1 * rng.normal(size=3)


def derive_noise_seed(trajectory_seed: int, replicate_id: int) -> int:
    return 1000 + 2 * trajectory_seed + replicate_id


def build_dataset(
    *,
    trajectory_seeds: Sequence[int] = DEFAULT_TRAJECTORY_SEEDS,
    replicate_ids: Sequence[int] = DEFAULT_REPLICATE_IDS,
    noise_levels: Sequence[float] = DEFAULT_NOISE_LEVELS,
    dt: float = DEFAULT_DT,
    burn_in_steps: int = DEFAULT_BURN_IN_STEPS,
    record_steps: int = DEFAULT_RECORD_STEPS,
    sigma: float = DEFAULT_SIGMA,
    rho: float = DEFAULT_RHO,
    beta: float = DEFAULT_BETA,
) -> dict[str, Any]:
    trajectory_seed_array = np.asarray(tuple(trajectory_seeds), dtype=np.int64)
    replicate_id_array = np.asarray(tuple(replicate_ids), dtype=np.int64)
    noise_level_array = np.asarray(tuple(noise_levels), dtype=np.float64)

    if trajectory_seed_array.size == 0:
        raise ValueError("trajectory_seeds must be non-empty")
    if replicate_id_array.size == 0:
        raise ValueError("replicate_ids must be non-empty")
    if noise_level_array.size == 0:
        raise ValueError("noise_levels must be non-empty")
    if dt <= 0:
        raise ValueError("dt must be positive")
    if burn_in_steps < 0:
        raise ValueError("burn_in_steps must be non-negative")
    if record_steps <= 0:
        raise ValueError("record_steps must be positive")

    initial_states: list[np.ndarray] = []
    clean_trajectories: list[np.ndarray] = []
    coordinate_scales: list[np.ndarray] = []
    clean_metadata: list[dict[str, Any]] = []

    seed_to_clean_index: dict[int, int] = {}
    seed_to_scale: dict[int, np.ndarray] = {}

    for clean_index, trajectory_seed in enumerate(trajectory_seed_array.tolist()):
        initial_state = make_initial_state(int(trajectory_seed))
        clean_trajectory = rk4_integrate(
            initial_state,
            dt=dt,
            burn_in_steps=burn_in_steps,
            record_steps=record_steps,
            sigma=sigma,
            rho=rho,
            beta=beta,
        )
        scales = np.mean(np.abs(clean_trajectory), axis=0)

        initial_states.append(initial_state)
        clean_trajectories.append(clean_trajectory)
        coordinate_scales.append(scales)
        seed_to_clean_index[int(trajectory_seed)] = clean_index
        seed_to_scale[int(trajectory_seed)] = scales
        clean_metadata.append(
            {
                "trajectory_seed": int(trajectory_seed),
                "clean_index": clean_index,
                "initial_state": initial_state.tolist(),
                "coordinate_scales": scales.tolist(),
            }
        )

    clean_trajectory_array = np.stack(clean_trajectories, axis=0)
    initial_state_array = np.stack(initial_states, axis=0)
    coordinate_scale_array = np.stack(coordinate_scales, axis=0)

    noisy_observations: list[np.ndarray] = []
    sample_trajectory_seeds: list[int] = []
    sample_replicate_ids: list[int] = []
    sample_noise_levels: list[float] = []
    sample_noise_seeds: list[int] = []
    sample_clean_indices: list[int] = []
    noise_scales: list[np.ndarray] = []

    for trajectory_seed in trajectory_seed_array.tolist():
        clean_index = seed_to_clean_index[int(trajectory_seed)]
        clean_trajectory = clean_trajectory_array[clean_index]
        scales = seed_to_scale[int(trajectory_seed)]
        for replicate_id in replicate_id_array.tolist():
            noise_seed = derive_noise_seed(int(trajectory_seed), int(replicate_id))
            for alpha in noise_level_array.tolist():
                sample_noise_scale = float(alpha) * scales
                # Recreate the RNG for each saved row so the persisted seed replays that row directly.
                rng = np.random.default_rng(noise_seed)
                noisy_observation = clean_trajectory + rng.normal(
                    loc=0.0,
                    scale=sample_noise_scale,
                    size=clean_trajectory.shape,
                )
                noisy_observations.append(noisy_observation)
                sample_trajectory_seeds.append(int(trajectory_seed))
                sample_replicate_ids.append(int(replicate_id))
                sample_noise_levels.append(float(alpha))
                sample_noise_seeds.append(noise_seed)
                sample_clean_indices.append(clean_index)
                noise_scales.append(sample_noise_scale.copy())

    noisy_observation_array = np.stack(noisy_observations, axis=0)
    sample_trajectory_seed_array = np.asarray(sample_trajectory_seeds, dtype=np.int64)
    sample_replicate_id_array = np.asarray(sample_replicate_ids, dtype=np.int64)
    sample_noise_level_array = np.asarray(sample_noise_levels, dtype=np.float64)
    sample_noise_seed_array = np.asarray(sample_noise_seeds, dtype=np.int64)
    sample_clean_index_array = np.asarray(sample_clean_indices, dtype=np.int64)
    noise_scale_array = np.stack(noise_scales, axis=0)

    metadata = {
        "generator": {
            "name": "generate_lorenz63_dataset.py",
            "dataset_version": "lorenz63-noisy-signal-v1",
            "protocol_source": "projects/smoothing/evaluation_protocol.md",
        },
        "lorenz63": {"sigma": sigma, "rho": rho, "beta": beta},
        "integration": {
            "method": "rk4",
            "dt": dt,
            "burn_in_steps": burn_in_steps,
            "record_steps": record_steps,
            "total_steps": burn_in_steps + record_steps,
        },
        "seed_rules": {
            "trajectory_seed_rule": "initial_state = (1, 1, 1) + 0.1 * Normal(0, I_3)",
            "noise_seed_rule": "1000 + 2 * trajectory_seed + replicate_id",
            "noise_replay_rule": "For each saved noisy sample, reinitialize the RNG from noise_seed before drawing scaled Gaussian noise.",
        },
        "dataset_counts": {
            "n_clean_trajectories": int(trajectory_seed_array.size),
            "n_noise_levels": int(noise_level_array.size),
            "n_replicates_per_clean": int(replicate_id_array.size),
            "n_noisy_samples": int(noisy_observation_array.shape[0]),
        },
        "trajectory_seeds": trajectory_seed_array.tolist(),
        "replicate_ids": replicate_id_array.tolist(),
        "noise_levels": noise_level_array.tolist(),
        "clean_trajectory_metadata": clean_metadata,
    }

    return {
        "trajectory_seeds": trajectory_seed_array,
        "replicate_ids": replicate_id_array,
        "noise_levels": noise_level_array,
        "initial_states": initial_state_array,
        "clean_trajectories": clean_trajectory_array,
        "coordinate_scales": coordinate_scale_array,
        "sample_clean_indices": sample_clean_index_array,
        "sample_trajectory_seeds": sample_trajectory_seed_array,
        "sample_replicate_ids": sample_replicate_id_array,
        "sample_noise_levels": sample_noise_level_array,
        "sample_noise_seeds": sample_noise_seed_array,
        "noise_scales": noise_scale_array,
        "noisy_observations": noisy_observation_array,
        "metadata": metadata,
    }


def write_dataset(
    *,
    out_dir: Path,
    trajectory_seeds: Sequence[int] = DEFAULT_TRAJECTORY_SEEDS,
    replicate_ids: Sequence[int] = DEFAULT_REPLICATE_IDS,
    noise_levels: Sequence[float] = DEFAULT_NOISE_LEVELS,
    dt: float = DEFAULT_DT,
    burn_in_steps: int = DEFAULT_BURN_IN_STEPS,
    record_steps: int = DEFAULT_RECORD_STEPS,
    sigma: float = DEFAULT_SIGMA,
    rho: float = DEFAULT_RHO,
    beta: float = DEFAULT_BETA,
    overwrite: bool = False,
) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    clean_path = out_dir / "clean_trajectories.npz"
    noisy_path = out_dir / "noisy_observations.npz"
    metadata_path = out_dir / "metadata.json"

    if not overwrite and any(path.exists() for path in (clean_path, noisy_path, metadata_path)):
        raise FileExistsError(f"Refusing to overwrite existing dataset outputs in {out_dir}")

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


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate reproducible clean/noisy Lorenz63 trajectory datasets.")
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
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args(argv)

    outputs = write_dataset(
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
        overwrite=args.overwrite,
    )

    print(json.dumps(outputs, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
