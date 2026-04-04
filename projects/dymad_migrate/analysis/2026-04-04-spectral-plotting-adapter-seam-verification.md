# Spectral plotting-adapter seam verification (2026-04-04)

## Scope

Task: Split plotting helpers out of `modules/dymad_migrate/src/dymad/sako/base.py` into an optional plotting adapter.

## Findings

1. Plotting helpers moved out of `SpectralAnalysis` implementation into `modules/dymad_migrate/src/dymad/sako/plotting.py` as `SpectralPlottingAdapter`, with `base.py` keeping compatibility method signatures as delegation wrappers.
2. Compatibility routing is explicitly verified: `SpectralAnalysis.plot_eigs(...)` now routes through `SpectralPlottingAdapter.plot_eigs(...)` under monkeypatch instrumentation.
3. Existing typed spectral adapter and snapshot gates remain green after the plotting split.

## Verification

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_pseudospectrum_through_adapter tests/test_workflow_sa_lti.py::test_spectral_analysis_routes_plotting_through_adapter -q
```

Output:

```text
2 passed, 2 warnings in 2.94s
```

Command:

```bash
cd modules/dymad_migrate && PYTHONPATH=src pytest tests/test_spectral_adapter.py tests/test_spectral_snapshot.py -q
```

Output:

```text
7 passed, 2 warnings in 0.71s
```

Warnings observed in both runs:
- Torch JIT deprecation warning from `torch.jit.script` usage in upstream Torch internals.
