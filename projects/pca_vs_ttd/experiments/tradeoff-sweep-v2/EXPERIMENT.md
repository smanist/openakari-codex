---
id: tradeoff-sweep-v2
type: experiment
status: completed
date: 2026-03-25
project: pca_vs_ttd
consumes_resources: false
tags: [sweep, tradeoff, pca, ttd, unequal-ranks]
---

# PCA vs TTD — hyperparameter trade-off sweep (v2: unequal TT ranks)

## Specification

Goal: extend the v1 trade-off sweep by adding **unequal** Tensor-Train ranks `(r1, r2)` for TT-SVD on the synthetic dataset v1, using the evaluation protocol at `projects/pca_vs_ttd/evaluation_protocol.md`.

Inputs:
- Dataset: `projects/pca_vs_ttd/experiments/dc-test/data/video_v1.npz` (shape `(32,64,64)`, float32 in `[0,1]`)
- Reference implementations:
  - PCA: `projects/pca_vs_ttd/experiments/pca-baseline/run_pca.py`
  - TTD (TT-SVD): `projects/pca_vs_ttd/experiments/ttd-baseline/run_ttd.py`

Sweep:
- PCA: `k ∈ {0, 1, 2, 4, 8, 16}` (same as v1)
- TTD:
  - Equal ranks (same as v1): `(r1, r2) ∈ {(4,4), (8,8), (12,12), (16,16), (23,23)}`
  - Unequal ranks (new): `(r1, r2) ∈ {(16,32), (20,26), (26,20)}`

Outputs (written under `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/`):
- Per-run JSON: `pca_k*.json`, `ttd_r*_* .json`
- Summary table: `sweep_summary.csv`
- Plots:
  - `tradeoff_rel_fro_vs_compression.pdf`
  - `tradeoff_psnr_vs_compression.pdf`

## Verification

Run:
- `python projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/run_sweep.py --overwrite`

Observed runtime:
- `/usr/bin/time -p python projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/run_sweep.py --overwrite` → `real 1.34`

## Findings

Artifacts:
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/sweep_summary.csv`
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/tradeoff_rel_fro_vs_compression.pdf`
- `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/tradeoff_psnr_vs_compression.pdf`

Matched-compression check around ~3–4× compression (from `sweep_summary.csv`):

Command:

```bash
python - <<'PY'
import csv
from pathlib import Path

p = Path("projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/sweep_summary.csv")
rows = list(csv.DictReader(p.open()))

ttd = [r for r in rows if r["method"] == "ttd"]
for r in ttd:
    r["compression_ratio"] = float(r["compression_ratio"])
    r["rel_fro_error"] = float(r["rel_fro_error"])
    r["psnr_db"] = float(r["psnr_db"])

band = [r for r in ttd if 3.0 <= r["compression_ratio"] <= 4.0]
best_rel = min(band, key=lambda r: r["rel_fro_error"])
best_psnr = max(band, key=lambda r: r["psnr_db"])

print("TTD points with 3.0x <= compression_ratio <= 4.0x:", len(band))
print(
    "Best rel_fro in band:",
    (best_rel["r1"], best_rel["r2"]),
    "cr=",
    best_rel["compression_ratio"],
    "rel_fro=",
    best_rel["rel_fro_error"],
    "psnr=",
    best_rel["psnr_db"],
)
print(
    "Best psnr in band:",
    (best_psnr["r1"], best_psnr["r2"]),
    "cr=",
    best_psnr["compression_ratio"],
    "rel_fro=",
    best_psnr["rel_fro_error"],
    "psnr=",
    best_psnr["psnr_db"],
)

for target in [(23, 23), (16, 32), (20, 26), (26, 20)]:
    cand = [r for r in ttd if int(r["r1"]) == target[0] and int(r["r2"]) == target[1]]
    if cand:
        r = cand[0]
        print("TTD", target, "cr=", r["compression_ratio"], "rel_fro=", r["rel_fro_error"], "psnr=", r["psnr_db"])
PY
```

Output:

```
TTD points with 3.0x <= compression_ratio <= 4.0x: 4
Best rel_fro in band: ('26', '20') cr= 3.7034358047016274 rel_fro= 0.026082972950657975 psnr= 40.87541282485515
Best psnr in band: ('26', '20') cr= 3.7034358047016274 rel_fro= 0.026082972950657975 psnr= 40.87541282485515
TTD (23, 23) cr= 3.6344276841171252 rel_fro= 0.026321385830438547 psnr= 40.796379618548656
TTD (16, 32) cr= 3.710144927536232 rel_fro= 0.029201150652374143 psnr= 39.894555347091135
TTD (20, 26) cr= 3.683453237410072 rel_fro= 0.027196571833477203 psnr= 40.512271363689806
TTD (26, 20) cr= 3.7034358047016274 rel_fro= 0.026082972950657975 psnr= 40.87541282485515
```

Provenance: `projects/pca_vs_ttd/experiments/tradeoff-sweep-v2/results/sweep_summary.csv`.
