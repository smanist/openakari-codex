"""Probe `test_assert_trans_ndr.py::test_ndr[0]` ratio distributions over repeated trials."""

import numpy as np

from dymad.transform import Isomap

N, M = 201, 20
tt = np.linspace(0, np.pi, N)
cc = np.cos(tt)
ss = np.sin(tt)
opt = dict(edim=2, Knn=20, inverse="gmls", order=1, Kphi=4)
recon_thr = 3e-5
reload_thr = 1e-13
inv_thr = 1e-14

recon = []
reload = []
inv = []
for i in range(1, 31):
    ms = np.random.rand(2, M)
    x = np.vstack([cc, ss]).T @ ms
    nrm = np.linalg.norm(x)

    mdl = Isomap(**opt)
    mdl.fit([x])
    zt = mdl.transform([x])[0]
    xr = mdl.inverse_transform([zt])[0]

    stt = mdl.state_dict()
    reld = Isomap(**opt)
    reld.load_state_dict(stt)
    zn = reld.transform([x])[0]
    xs = reld.inverse_transform([zn])[0]

    r_recon = np.linalg.norm(x - xr) / nrm
    r_reload = np.linalg.norm(zt - zn) / np.linalg.norm(zt)
    r_inv = np.linalg.norm(xr - xs) / nrm
    recon.append(r_recon)
    reload.append(r_reload)
    inv.append(r_inv)

    status = []
    if r_recon >= recon_thr:
        status.append("recon_fail")
    if r_reload >= reload_thr:
        status.append("reload_transform_fail")
    if r_inv >= inv_thr:
        status.append("reload_inv_fail")

    print(
        f"trial={i:02d} recon={r_recon:.18e} "
        f"reload_transform={r_reload:.18e} reload_inv={r_inv:.18e} "
        f"status={'ok' if not status else ','.join(status)}"
    )

print("--- summary ---")
print(
    f"recon_min={min(recon):.18e} recon_max={max(recon):.18e} "
    f"recon_fail={sum(x >= recon_thr for x in recon)}/30 threshold={recon_thr:.1e}"
)
print(
    f"reload_transform_min={min(reload):.18e} "
    f"reload_transform_max={max(reload):.18e} "
    f"reload_transform_fail={sum(x >= reload_thr for x in reload)}/30 "
    f"threshold={reload_thr:.1e}"
)
print(
    f"reload_inv_min={min(inv):.18e} reload_inv_max={max(inv):.18e} "
    f"reload_inv_fail={sum(x >= inv_thr for x in inv)}/30 threshold={inv_thr:.1e}"
)
