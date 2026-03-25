#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np


def _gaussian_2d(xx: np.ndarray, yy: np.ndarray, x0: float, y0: float, sigma: float) -> np.ndarray:
    return np.exp(-(((xx - x0) ** 2 + (yy - y0) ** 2) / (2.0 * sigma**2)))


def generate_video(
    *,
    rng: np.random.Generator,
    frames: int,
    height: int,
    width: int,
    n_spatial_bases: int,
    n_blobs: int,
    noise_std: float,
) -> np.ndarray:
    """
    Generate a grayscale video-like tensor shaped (T, H, W).

    The construction mixes:
    - A low-dimensional spatiotemporal component (fixed spatial bases with time-varying coefficients)
    - A few moving Gaussian blobs to introduce localized, non-separable structure
    - Additive Gaussian noise
    """
    x = np.linspace(0.0, 1.0, width, dtype=np.float32)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)
    xx, yy = np.meshgrid(x, y)

    # Fixed spatial bases: random low-frequency sinusoids to encourage compressibility.
    bases = []
    for _ in range(n_spatial_bases):
        fx = rng.integers(1, 5)
        fy = rng.integers(1, 5)
        phase = rng.uniform(0.0, 2.0 * math.pi)
        spatial = np.sin(2.0 * math.pi * (fx * xx + fy * yy) + phase).astype(np.float32)
        spatial = (spatial - spatial.min()) / (spatial.max() - spatial.min() + 1e-8)
        bases.append(spatial)
    bases_arr = np.stack(bases, axis=0) if bases else np.zeros((0, height, width), dtype=np.float32)

    # Time coefficients: smooth periodic signals.
    t = np.linspace(0.0, 1.0, frames, dtype=np.float32)
    coeffs = []
    for k in range(n_spatial_bases):
        w = (k + 1) * rng.uniform(0.8, 2.2)
        phi = rng.uniform(0.0, 2.0 * math.pi)
        a = 0.5 + 0.5 * np.sin(2.0 * math.pi * w * t + phi)
        coeffs.append(a.astype(np.float32))
    coeffs_arr = np.stack(coeffs, axis=1) if coeffs else np.zeros((frames, 0), dtype=np.float32)

    video = np.zeros((frames, height, width), dtype=np.float32)
    if n_spatial_bases:
        # Sum_k a[t,k] * base[k]
        video += np.tensordot(coeffs_arr, bases_arr, axes=(1, 0)).astype(np.float32)

    # Moving blobs: elliptical paths with random amplitude/sigma.
    for _ in range(n_blobs):
        amp = float(rng.uniform(0.3, 0.9))
        sigma = float(rng.uniform(0.03, 0.08))
        x_center = float(rng.uniform(0.2, 0.8))
        y_center = float(rng.uniform(0.2, 0.8))
        x_rad = float(rng.uniform(0.05, 0.25))
        y_rad = float(rng.uniform(0.05, 0.25))
        omega = float(rng.uniform(0.6, 2.0))
        phase = float(rng.uniform(0.0, 2.0 * math.pi))
        for ti in range(frames):
            theta = 2.0 * math.pi * omega * float(t[ti]) + phase
            x0 = x_center + x_rad * math.cos(theta)
            y0 = y_center + y_rad * math.sin(theta)
            video[ti] += amp * _gaussian_2d(xx, yy, x0, y0, sigma).astype(np.float32)

    if noise_std > 0:
        video += rng.normal(0.0, noise_std, size=video.shape).astype(np.float32)

    # Normalize into [0, 1].
    video -= float(video.min())
    denom = float(video.max() - video.min() + 1e-8)
    video /= denom
    return video.astype(np.float32)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a synthetic 3D grayscale video tensor for PCA vs TTD.")
    parser.add_argument("--out-dir", type=Path, default=Path("data"))
    parser.add_argument("--frames", type=int, default=32)
    parser.add_argument("--height", type=int, default=64)
    parser.add_argument("--width", type=int, default=64)
    parser.add_argument("--n-spatial-bases", type=int, default=3)
    parser.add_argument("--n-blobs", type=int, default=2)
    parser.add_argument("--noise-std", type=float, default=0.03)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--version", type=str, default="v1")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    tensor_path = out_dir / f"video_{args.version}.npz"
    meta_path = out_dir / f"meta_{args.version}.json"
    if not args.overwrite and (tensor_path.exists() or meta_path.exists()):
        raise SystemExit(f"Refusing to overwrite existing outputs in {out_dir} (use --overwrite).")

    rng = np.random.default_rng(args.seed)
    video = generate_video(
        rng=rng,
        frames=args.frames,
        height=args.height,
        width=args.width,
        n_spatial_bases=args.n_spatial_bases,
        n_blobs=args.n_blobs,
        noise_std=args.noise_std,
    )

    np.savez_compressed(tensor_path, video=video)
    meta = {
        "version": args.version,
        "seed": args.seed,
        "shape": list(video.shape),
        "dtype": str(video.dtype),
        "min": float(video.min()),
        "max": float(video.max()),
        "frames": args.frames,
        "height": args.height,
        "width": args.width,
        "n_spatial_bases": args.n_spatial_bases,
        "n_blobs": args.n_blobs,
        "noise_std": args.noise_std,
        "artifacts": {"tensor": str(tensor_path.name), "meta": str(meta_path.name)},
    }
    meta_path.write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "saved_tensor": str(tensor_path),
                "saved_meta": str(meta_path),
                "shape": list(video.shape),
                "dtype": str(video.dtype),
                "min": float(video.min()),
                "max": float(video.max()),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

