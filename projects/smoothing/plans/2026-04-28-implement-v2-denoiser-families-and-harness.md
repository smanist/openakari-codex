Date: 2026-04-28
Status: completed

## Knowledge Goal

This task should produce a reproducible implementation that can test whether the v2 benchmark's broader classical smoother families behave differently from the frozen v1 anchor-basis family under the same Lorenz63 data regime.

## Scope

In scope:

- implement the planned v2 denoiser families in `modules/smoothing/denoise_families_v2.py`
- add a separate staged v2 runner in `modules/smoothing/run_denoising_sweep_v2.py`
- emit pilot-stage artifacts and finalist-screen outputs without mutating the v1 runner
- add focused regression tests for the new family contracts and v2 pilot harness outputs
- update project and module documentation to record the new execution path

Out of scope:

- running the pilot sweep beyond smoke-scale verification
- confirmatory-stage benchmark execution
- changing committed v1 artifacts or v1 benchmark findings

## Execution Plan

1. Reuse the existing Lorenz63 dataset builder and v1 summary/plot patterns where possible so v2 remains comparable without rewriting the v1 path.
2. Write tests first for the new family contracts:
   - normalized kernel regression preserves constant signals
   - local-linear regression reproduces linear trends
   - cubic smoothing spline returns same-shape finite outputs and uses the declared observable-scale contract
3. Add a smoke test for the v2 pilot runner that verifies the staged artifact set, schema extensions, and finalist-screen output.
4. Implement the new family module and the v2 staged runner with family metadata, derivative-RMSE reporting, and pilot finalist selection.
5. Verify with focused `pytest` targets, then update README logs and module docs, run compound, and close with a commit.

## Done When

- `modules/smoothing/denoise_families_v2.py` exists with reusable v2 family implementations
- `modules/smoothing/run_denoising_sweep_v2.py` writes pilot-stage artifacts and a run manifest in smoke tests
- `modules/smoothing/test_denoise_families_v2.py` and updated runner tests pass
- `projects/smoothing/README.md` and `modules/smoothing/README.md` record the new v2 execution path
