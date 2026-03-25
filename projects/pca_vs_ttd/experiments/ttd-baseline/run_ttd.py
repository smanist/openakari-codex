#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class TtdBaselineResult:
    data_path: str
    original_shape: tuple[int, int, int]
    original_dtype: str
    ranks: tuple[int, int]
    cores_shapes: tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]
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
            key = next(iter(f.files))
            arr = f[key]
    if arr.ndim != 3:
        raise ValueError(f"Expected 3D tensor (T,H,W); got shape={arr.shape}")
    return arr


def _psnr_db(mse: float, data_range: float = 1.0) -> float | None:
    if mse <= 0:
        return None
    return 10.0 * float(np.log10((data_range**2) / mse))


def _tt_svd_3d(tensor: np.ndarray, ranks: tuple[int, int]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Tensor-Train decomposition via TT-SVD specialized to order-3 tensors.

    Input tensor shape: (n1, n2, n3)
    Output cores:
      G1: (1, n1, r1)
      G2: (r1, n2, r2)
      G3: (r2, n3, 1)
    """
    n1, n2, n3 = tensor.shape
    r1_req, r2_req = ranks
    if r1_req <= 0 or r2_req <= 0:
        raise ValueError("TT ranks must be positive.")

    x = tensor.astype(np.float64, copy=False)

    # Step 1: unfold into (n1, n2*n3)
    m1 = x.reshape(n1, n2 * n3)
    u1, s1, vt1 = np.linalg.svd(m1, full_matrices=False)
    r1 = int(min(r1_req, s1.shape[0]))
    u1 = u1[:, :r1]
    s1 = s1[:r1]
    vt1 = vt1[:r1, :]
    g1 = u1.reshape(1, n1, r1)

    # Form residual for next step: (r1, n2*n3)
    m2_in = (np.diag(s1) @ vt1).reshape(r1 * n2, n3)
    u2, s2, vt2 = np.linalg.svd(m2_in, full_matrices=False)
    r2 = int(min(r2_req, s2.shape[0]))
    u2 = u2[:, :r2]
    s2 = s2[:r2]
    vt2 = vt2[:r2, :]
    g2 = u2.reshape(r1, n2, r2)
    g3 = (np.diag(s2) @ vt2).reshape(r2, n3, 1)

    return g1, g2, g3


def _tt_reconstruct_3d(g1: np.ndarray, g2: np.ndarray, g3: np.ndarray) -> np.ndarray:
    # (1, n1, r1) x (r1, n2, r2) -> (1, n1, n2, r2)
    tmp = np.tensordot(g1, g2, axes=([2], [0]))
    # (1, n1, n2, r2) x (r2, n3, 1) -> (1, n1, n2, n3, 1)
    out = np.tensordot(tmp, g3, axes=([3], [0]))
    return out.squeeze(axis=(0, 4))


def _parse_ranks(text: str) -> tuple[int, int]:
    parts = [p.strip() for p in text.split(",") if p.strip()]
    if len(parts) != 2:
        raise ValueError("--ranks must be two comma-separated ints like '8,8'.")
    r1, r2 = (int(parts[0]), int(parts[1]))
    return r1, r2


def main() -> None:
    ap = argparse.ArgumentParser(
        description="TTD baseline (Tensor-Train via TT-SVD) compression + reconstruction on 3D tensor data."
    )
    ap.add_argument(
        "--data",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz"),
        help="Path to .npz containing a 3D tensor (T,H,W).",
    )
    ap.add_argument(
        "--ranks",
        type=_parse_ranks,
        default=(8, 8),
        help="TT ranks as 'r1,r2' for cores (1,T,r1), (r1,H,r2), (r2,W,1).",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/ttd-baseline/results/ttd_baseline_r8_8.json"),
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

    tensor = _load_tensor(args.data)
    t, h, w = tensor.shape

    g1, g2, g3 = _tt_svd_3d(tensor=tensor, ranks=args.ranks)
    recon = _tt_reconstruct_3d(g1, g2, g3)

    err = recon.astype(np.float64) - tensor.astype(np.float64)
    mse = float(np.mean(err**2))
    rmse = float(np.sqrt(mse))
    rel_fro = float(np.linalg.norm(err.ravel()) / (np.linalg.norm(tensor.astype(np.float64).ravel()) + 1e-12))
    psnr = _psnr_db(mse=mse, data_range=1.0)

    original_floats = int(t * h * w)
    compression_floats = int(g1.size + g2.size + g3.size)
    compression_ratio = float(original_floats / compression_floats)

    result = TtdBaselineResult(
        data_path=str(args.data),
        original_shape=(int(t), int(h), int(w)),
        original_dtype=str(tensor.dtype),
        ranks=(int(args.ranks[0]), int(args.ranks[1])),
        cores_shapes=(
            (int(g1.shape[0]), int(g1.shape[1]), int(g1.shape[2])),
            (int(g2.shape[0]), int(g2.shape[1]), int(g2.shape[2])),
            (int(g3.shape[0]), int(g3.shape[1]), int(g3.shape[2])),
        ),
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

