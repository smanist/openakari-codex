#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class PcaBaselineResult:
    data_path: str
    original_shape: tuple[int, int, int]
    original_dtype: str
    k: int
    flattened_dim: int
    n_samples: int
    compression_floats: int
    original_floats: int
    compression_ratio: float
    mse: float
    rmse: float
    rel_fro_error: float
    psnr_db: float | None


def _load_tensor(path: Path) -> np.ndarray:
    with np.load(path) as f:
        if "tensor" in f:
            arr = f["tensor"]
        elif "video" in f:
            arr = f["video"]
        else:
            # Most of our project artifacts use the first key convention.
            key = next(iter(f.files))
            arr = f[key]
    if arr.ndim != 3:
        raise ValueError(f"Expected 3D tensor (T,H,W); got shape={arr.shape}")
    return arr


def _pca_fit_transform_reconstruct(x: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    x: (N, D) float array
    Returns: mean (D,), components (k, D), scores (N, k)
    """
    mean = x.mean(axis=0, dtype=np.float64)
    xc = x.astype(np.float64, copy=False) - mean

    # SVD: xc = U S V^T. Principal axes are rows of V^T.
    u, s, vt = np.linalg.svd(xc, full_matrices=False)
    components = vt[:k, :]
    scores = u[:, :k] * s[:k]
    return mean, components, scores


def _reconstruct(mean: np.ndarray, components: np.ndarray, scores: np.ndarray) -> np.ndarray:
    return (scores @ components) + mean


def _psnr_db(mse: float, data_range: float = 1.0) -> float | None:
    if mse <= 0:
        return None
    return 10.0 * float(np.log10((data_range**2) / mse))


def main() -> None:
    ap = argparse.ArgumentParser(description="PCA baseline compression + reconstruction on 3D tensor data.")
    ap.add_argument(
        "--data",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz"),
        help="Path to .npz containing a 3D tensor (T,H,W).",
    )
    ap.add_argument("--k", type=int, default=8, help="Number of PCA components to keep.")
    ap.add_argument(
        "--out",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/pca-baseline/results/pca_baseline_k8.json"),
        help="Where to write the result JSON.",
    )
    ap.add_argument(
        "--save-recon",
        type=Path,
        default=None,
        help="Optional path to save the reconstructed tensor as .npz (key: tensor).",
    )
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing outputs.")
    args = ap.parse_args()

    if args.k < 0:
        raise ValueError("--k must be non-negative.")

    tensor = _load_tensor(args.data)
    t, h, w = tensor.shape
    x = tensor.reshape(t, h * w)

    if args.k == 0:
        mean = x.mean(axis=0, dtype=np.float64)
        x_hat = np.broadcast_to(mean, x.shape)
    else:
        max_k = min(x.shape[0], x.shape[1])
        if args.k > max_k:
            raise ValueError(f"--k={args.k} exceeds max allowed {max_k} for shape N={x.shape[0]}, D={x.shape[1]}.")

        mean, components, scores = _pca_fit_transform_reconstruct(x, args.k)
        x_hat = _reconstruct(mean, components, scores)
    recon = x_hat.reshape(t, h, w)

    err = recon.astype(np.float64) - tensor.astype(np.float64)
    mse = float(np.mean(err**2))
    rmse = float(np.sqrt(mse))
    rel_fro = float(np.linalg.norm(err.ravel()) / (np.linalg.norm(tensor.astype(np.float64).ravel()) + 1e-12))
    psnr = _psnr_db(mse=mse, data_range=1.0)

    original_floats = int(t * h * w)
    compression_floats = int((h * w) * (args.k + 1) + (t * args.k))
    compression_ratio = float(original_floats / compression_floats)

    result = PcaBaselineResult(
        data_path=str(args.data),
        original_shape=(int(t), int(h), int(w)),
        original_dtype=str(tensor.dtype),
        k=int(args.k),
        flattened_dim=int(h * w),
        n_samples=int(t),
        compression_floats=compression_floats,
        original_floats=original_floats,
        compression_ratio=compression_ratio,
        mse=mse,
        rmse=rmse,
        rel_fro_error=rel_fro,
        psnr_db=None if psnr is None else float(psnr),
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and not args.overwrite:
        raise FileExistsError(f"Refusing to overwrite existing output: {args.out} (use --overwrite).")
    args.out.write_text(json.dumps(asdict(result), indent=2, sort_keys=True) + "\n")

    if args.save_recon is not None:
        if args.save_recon.exists() and not args.overwrite:
            raise FileExistsError(
                f"Refusing to overwrite existing recon: {args.save_recon} (use --overwrite)."
            )
        args.save_recon.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(args.save_recon, tensor=recon.astype(np.float32))

    print(json.dumps(asdict(result), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
