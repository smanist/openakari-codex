# 2026-04-04 rollout-engine seam plan

Date: 2026-04-04
Task: Introduce an explicit rollout-engine seam for the first typed model-spec family

## Knowledge target

Show whether typed rollout metadata can drive predictor selection for the first
migrated family (`LTI`/`DLTI`) without breaking the existing workflow gate.

## Plan

1. Keep the existing typed builder dispatch for the LTI family in
   `models/helpers.py`.
2. Add a small typed rollout-engine selector module under
   `modules/dymad_migrate/src/dymad/models/`.
3. Apply rollout-engine selection in `build_model_from_spec(...)` when a typed
   `ModelSpec` carries rollout metadata.
4. Add focused adapter tests for both continuous and discrete LTI typed specs.
5. Re-run the adapter + workflow gate command and record outputs in a dated
   analysis note.
