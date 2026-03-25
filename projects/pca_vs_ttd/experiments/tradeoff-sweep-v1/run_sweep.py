#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

import matplotlib.pyplot as plt


DEFAULT_PCA_KS = (0, 1, 2, 4, 8, 16)
DEFAULT_TTD_RS = (4, 8, 12, 16, 23)


def _repo_root() -> Path:
    # .../projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/run_sweep.py
    return Path(__file__).resolve().parents[4]


def _run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(
            "Command failed:\n"
            + " ".join(cmd)
            + "\n\nstdout:\n"
            + (p.stdout or "")
            + "\n\nstderr:\n"
            + (p.stderr or "")
        )


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def _write_csv(path: Path, rows: list[dict]) -> None:
    # Stable, protocol-aligned column ordering.
    fieldnames = [
        "method",
        "k",
        "r1",
        "r2",
        "compression_floats",
        "compression_ratio",
        "rel_fro_error",
        "psnr_db",
        "mse",
        "rmse",
        "data_path",
        "original_shape",
        "original_dtype",
        "original_floats",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def _plot_tradeoff(
    rows: list[dict],
    out_rel_fro: Path,
    out_psnr: Path,
) -> None:
    def _series(method: str) -> tuple[list[float], list[float], list[float]]:
        xs: list[float] = []
        ys_rel: list[float] = []
        ys_psnr: list[float] = []
        for r in rows:
            if r["method"] != method:
                continue
            xs.append(float(r["compression_ratio"]))
            ys_rel.append(float(r["rel_fro_error"]))
            psnr = r.get("psnr_db", "")
            ys_psnr.append(float(psnr) if psnr not in ("", None) else float("nan"))
        # Sort by compression ratio (x) for line plotting.
        order = sorted(range(len(xs)), key=lambda i: xs[i])
        xs = [xs[i] for i in order]
        ys_rel = [ys_rel[i] for i in order]
        ys_psnr = [ys_psnr[i] for i in order]
        return xs, ys_rel, ys_psnr

    for out in (out_rel_fro, out_psnr):
        out.parent.mkdir(parents=True, exist_ok=True)

    pca_x, pca_rel, pca_psnr = _series("pca")
    ttd_x, ttd_rel, ttd_psnr = _series("ttd")

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(pca_x, pca_rel, "o-", label="PCA")
    ax.plot(ttd_x, ttd_rel, "o-", label="TTD (TT-SVD)")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("compression_ratio (log)")
    ax.set_ylabel("rel_fro_error (log)")
    ax.set_title("PCA vs TTD trade-off: compression vs rel Fro error")
    ax.grid(True, which="both", linestyle=":", linewidth=0.6)
    ax.legend()
    fig.tight_layout()
    fig.savefig(out_rel_fro, dpi=200)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(pca_x, pca_psnr, "o-", label="PCA")
    ax.plot(ttd_x, ttd_psnr, "o-", label="TTD (TT-SVD)")
    ax.set_xscale("log")
    ax.set_xlabel("compression_ratio (log)")
    ax.set_ylabel("psnr_db")
    ax.set_title("PCA vs TTD trade-off: compression vs PSNR")
    ax.grid(True, which="both", linestyle=":", linewidth=0.6)
    ax.legend()
    fig.tight_layout()
    fig.savefig(out_psnr, dpi=200)
    plt.close(fig)


def main() -> None:
    ap = argparse.ArgumentParser(description="Run PCA+TTD trade-off sweep and write summary CSV + plots.")
    ap.add_argument(
        "--data",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz"),
        help="Path to dataset .npz (3D tensor).",
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path("projects/pca_vs_ttd/experiments/tradeoff-sweep-v1/results"),
        help="Directory to write per-run JSONs, summary CSV, and plots.",
    )
    ap.add_argument(
        "--pca-ks",
        type=str,
        default=",".join(str(k) for k in DEFAULT_PCA_KS),
        help="Comma-separated PCA k values (e.g. '0,1,2,4,8').",
    )
    ap.add_argument(
        "--ttd-rs",
        type=str,
        default=",".join(str(r) for r in DEFAULT_TTD_RS),
        help="Comma-separated TT ranks r (runs equal ranks r1=r2=r).",
    )
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing outputs.")
    args = ap.parse_args()

    repo = _repo_root()
    data = (repo / args.data).resolve() if not args.data.is_absolute() else args.data.resolve()
    out_dir = (repo / args.out_dir).resolve() if not args.out_dir.is_absolute() else args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    pca_ks = [int(x.strip()) for x in args.pca_ks.split(",") if x.strip()]
    ttd_rs = [int(x.strip()) for x in args.ttd_rs.split(",") if x.strip()]

    pca_script = repo / "projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py"
    ttd_script = repo / "projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py"

    rows: list[dict] = []

    for k in pca_ks:
        out = out_dir / f"pca_k{k}.json"
        cmd = [
            sys.executable,
            str(pca_script),
            "--data",
            str(data),
            "--k",
            str(k),
            "--out",
            str(out),
        ]
        if args.overwrite:
            cmd.append("--overwrite")
        _run(cmd)
        rec = _load_json(out)
        rows.append(
            {
                "method": "pca",
                "k": int(rec.get("k")),
                "r1": "",
                "r2": "",
                **rec,
                "original_shape": json.dumps(rec.get("original_shape")),
            }
        )

    for r in ttd_rs:
        out = out_dir / f"ttd_r{r}_{r}.json"
        cmd = [
            sys.executable,
            str(ttd_script),
            "--data",
            str(data),
            "--ranks",
            f"{r},{r}",
            "--out",
            str(out),
        ]
        if args.overwrite:
            cmd.append("--overwrite")
        _run(cmd)
        rec = _load_json(out)
        ranks = rec.get("ranks") or (r, r)
        rows.append(
            {
                "method": "ttd",
                "k": "",
                "r1": int(ranks[0]),
                "r2": int(ranks[1]),
                **rec,
                "original_shape": json.dumps(rec.get("original_shape")),
            }
        )

    summary_csv = out_dir / "sweep_summary.csv"
    _write_csv(summary_csv, rows)

    _plot_tradeoff(
        rows,
        out_rel_fro=out_dir / "tradeoff_rel_fro_vs_compression.png",
        out_psnr=out_dir / "tradeoff_psnr_vs_compression.png",
    )

    print(f"Wrote: {summary_csv}")


if __name__ == "__main__":
    main()

