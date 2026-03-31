#!/usr/bin/env python3
"""Deterministic Isomap parity probe for the former test_ndr[0] gate."""

from __future__ import annotations

import argparse
import json
import sys

import numpy as np
from dymad.transform import Isomap


def run_once(seed: int) -> tuple[float, float, float]:
    n, m = 201, 20
    tt = np.linspace(0, np.pi, n)
    cc = np.cos(tt)
    ss = np.sin(tt)

    rng = np.random.default_rng(seed)
    ms = rng.random((2, m))
    x = np.vstack([cc, ss]).T @ ms
    nrm = np.linalg.norm(x)

    model = Isomap(edim=2, Knn=20, inverse="gmls", order=1, Kphi=4)
    model.fit([x])
    zt = model.transform([x])[0]
    xr = model.inverse_transform([zt])[0]

    state = model.state_dict()
    reloaded = Isomap(edim=2, Knn=20, inverse="gmls", order=1, Kphi=4)
    reloaded.load_state_dict(state)
    zn = reloaded.transform([x])[0]
    xs = reloaded.inverse_transform([zn])[0]

    recon = float(np.linalg.norm(x - xr) / nrm)
    reload = float(np.linalg.norm(zt - zn) / np.linalg.norm(zt))
    inv = float(np.linalg.norm(xr - xs) / nrm)
    return recon, reload, inv


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=54)
    parser.add_argument("--trials", type=int, default=12)
    parser.add_argument("--eps-recon", type=float, default=3e-5)
    parser.add_argument("--eps-reload", type=float, default=1e-13)
    parser.add_argument("--eps-inv", type=float, default=1e-14)
    args = parser.parse_args()

    vals = [run_once(args.seed) for _ in range(args.trials)]
    fails = [
        i
        for i, (recon, reload, inv) in enumerate(vals, start=1)
        if not (
            recon < args.eps_recon
            and reload < args.eps_reload
            and inv < args.eps_inv
        )
    ]

    recons = [v[0] for v in vals]
    reloads = [v[1] for v in vals]
    invs = [v[2] for v in vals]
    summary = {
        "seed": args.seed,
        "trials": args.trials,
        "thresholds": {
            "recon": args.eps_recon,
            "reload": args.eps_reload,
            "inv": args.eps_inv,
        },
        "fail_count": len(fails),
        "fail_trials": fails,
        "recon": {"min": min(recons), "max": max(recons)},
        "reload": {"min": min(reloads), "max": max(reloads)},
        "inv": {"min": min(invs), "max": max(invs)},
    }
    print(json.dumps(summary, indent=2))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
