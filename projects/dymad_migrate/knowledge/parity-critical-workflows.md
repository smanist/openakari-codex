# DyMAD Parity-Critical Workflows

Date: 2026-03-29 (updated 2026-03-30)
Source package: `modules/dymad_ref/`
Status: initial classification + NDR flake-policy update

## Purpose

This note answers the first migration question: what must keep working while the architecture changes?

The classifications below are meant for the first migration milestone. They can change later, but every reclassification should be explicit.

## Classification levels

- **Blocker**: must remain verifiable during early migration because it defines public behavior or a core domain capability.
- **Milestone**: important for the first major migration milestone, but can temporarily rely on adapters/shims while core seams are being extracted.
- **Informative**: useful coverage, but not the first thing to preserve when architectural tradeoffs appear.

## Workflow set

### 1. Regular-series data handling and trajectory preparation

Classification: **Blocker**

Why:

- most higher-level training and prediction paths depend on regular-series ingestion and preprocessing
- `DynData` + `TrajectoryManager` are central architectural bottlenecks

Primary evidence:

- `modules/dymad_ref/tests/test_assert_trajmgr.py`
- `modules/dymad_ref/tests/test_assert_dm.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr.py tests/test_assert_dm.py -q
```

### 2. Graph-series data handling and graph trajectory preparation

Classification: **Blocker**

Why:

- the target data layer explicitly needs graph-series support
- graph handling is one of the main reasons a naive `DynData` replacement would fail

Primary evidence:

- `modules/dymad_ref/tests/test_assert_trajmgr_graph.py`
- `modules/dymad_ref/tests/test_assert_graph.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_assert_trajmgr_graph.py tests/test_assert_graph.py -q
```

### 3. Transform composition and fitted transform behavior

Classification: **Blocker**

Why:

- transform fitting/composition is central to the target PyTorch-first redesign
- many training workflows rely on scaling, delay embedding, lifting, and nonlinear dimensionality reduction

Primary evidence:

- `modules/dymad_ref/tests/test_assert_transform.py`
- `modules/dymad_ref/tests/test_assert_trans_mode.py`
- `modules/dymad_ref/tests/test_assert_trans_lift.py`
- `modules/dymad_ref/tests/test_assert_trans_ndr.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_assert_transform.py tests/test_assert_trans_mode.py tests/test_assert_trans_lift.py tests/test_assert_trans_ndr.py -q
```

#### 3a. Special gate policy for `tests/test_assert_trans_ndr.py::test_ndr[0]`

`test_ndr[0]` currently uses an unseeded random fixture and has a documented intermittent near-threshold failure mode.

Policy (2026-03-30):
- keep it visible in parity checks
- do not hard-block from a single failure
- if this case fails, adjudicate with 30 isolated reruns (`--reruns=0`)
- classify as flake-managed pass if failures are `<= 4/30` and failures are only:
  - `AssertionError: Isomap recon. error`
  - `AssertionError: Isomap reload, transform`
- classify as hard blocker if failures are `>= 5/30` or any other failure type appears

Policy source:
- `projects/dymad_migrate/analysis/2026-03-30-ndr-flake-policy.md`
- `projects/dymad_migrate/analysis/2026-03-30-ndr-idx0-parity-diagnosis.md`

### 4. Regular dynamics training and prediction with control/autonomous variants

Classification: **Blocker**

Why:

- this is the core user-facing model-training workflow surface
- it exercises model recipes, training orchestration, transforms, checkpoint loading, and prediction

Primary evidence:

- `modules/dymad_ref/tests/test_workflow_lti.py`
- `modules/dymad_ref/tests/test_workflow_kp.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_lti.py tests/test_workflow_kp.py -q
```

Split-verification convention:

- when the migration package changes the default checkpoint/prediction path, record at least one clean workflow gate separately for `modules/dymad_ref` and `modules/dymad_migrate`
- the current split baseline is `projects/dymad_migrate/analysis/2026-03-30-lti-split-parity-verification.md`

### 5. Graph dynamics training and prediction workflows

Classification: **Milestone**

Why:

- graph workflows are important and explicitly called for by the target data design
- they can temporarily depend on compatibility adapters while the first regular-series seams are migrated

Primary evidence:

- `modules/dymad_ref/tests/test_workflow_ltg.py`
- `modules/dymad_ref/tests/test_workflow_ltga.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_ltg.py tests/test_workflow_ltga.py -q
```

### 6. Spectral analysis workflow over trained linear/Koopman-style models

Classification: **Milestone**

Why:

- this is a distinctive DyMAD capability, not an incidental helper
- it couples many layers and should remain reachable, but early migration may preserve it through adapters first

Primary evidence:

- `modules/dymad_ref/tests/test_workflow_sa_lti.py`
- `modules/dymad_ref/tests/test_assert_resolvent.py`
- `modules/dymad_ref/tests/test_assert_spectrum.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_sa_lti.py tests/test_assert_resolvent.py tests/test_assert_spectrum.py -q
```

### 7. Sampling/control generation workflows

Classification: **Milestone**

Why:

- sampling is not the first architectural seam to migrate, but it defines part of the data-generation workflow surface
- the current package already treats it as workflow-level behavior, not just helpers

Primary evidence:

- `modules/dymad_ref/tests/test_workflow_sample.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_workflow_sample.py -q
```

### 8. Core numerical and manifold primitives

Classification: **Informative** for migration ordering, but **do not regress intentionally**

Why:

- these are mathematically central and should remain in `core`
- however, they are not the first migration seam; many should move structurally without behavior change

Primary evidence:

- `modules/dymad_ref/tests/test_assert_linalg.py`
- `modules/dymad_ref/tests/test_assert_krr.py`
- `modules/dymad_ref/tests/test_assert_krr_tan.py`
- `modules/dymad_ref/tests/test_assert_manifold.py`
- `modules/dymad_ref/tests/test_assert_grad.py`
- `modules/dymad_ref/tests/test_assert_weak.py`
- `modules/dymad_ref/tests/test_assert_loss.py`
- `modules/dymad_ref/tests/test_assert_wrapper.py`

Verification command:

```bash
cd modules/dymad_ref && pytest tests/test_assert_linalg.py tests/test_assert_krr.py tests/test_assert_krr_tan.py tests/test_assert_manifold.py tests/test_assert_grad.py tests/test_assert_weak.py tests/test_assert_loss.py tests/test_assert_wrapper.py -q
```

## Initial regression gate recommendation

For early migration sessions, the shortest meaningful regression gate should be:

1. regular-series trajectory manager assertions
2. transform assertions
3. one regular training workflow (`test_workflow_lti.py` or `test_workflow_kp.py`)

Graph workflows, spectral analysis, and sampling should be preserved in scope, but they do not need to block the very first architectural seam extraction if compatibility adapters are kept in place.
