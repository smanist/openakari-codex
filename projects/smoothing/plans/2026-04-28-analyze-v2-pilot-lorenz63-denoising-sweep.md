# Plan: Analyze the v2 pilot Lorenz63 denoising sweep

Date: 2026-04-28
Project: smoothing
Task: Analyze the v2 pilot Lorenz63 denoising sweep [requires-frontier] [skill: analyze] [zero-resource]

## Goal

Turn the completed v2 pilot artifact bundle into provenance-backed pilot findings, identify the confirmatory finalist settings, and unblock the confirmatory execution task.

## Steps

1. Record the successful task claim and scope classification in durable project state.
2. Inspect `modules/smoothing/artifacts/lorenz63-denoising-benchmark-v2/pilot/{family_screen.csv,summary_by_setting.csv,metrics_raw.csv,run_manifest.json}` to determine:
   - which settings were selected for confirmatory reruns
   - whether any non-anchor family fails the pilot positive-gain screen
   - how the best non-anchor rows compare with Savitzky-Golay and the frozen anchor-basis references
   - whether `derivative_RMSE` changes the provisional interpretation
3. Update `projects/smoothing/experiments/lorenz63-denoising-benchmark-v2/EXPERIMENT.md` with pilot-stage findings whose numerical claims cite the pilot artifacts directly or use inline arithmetic from them.
4. Mark the selected analysis task complete and remove the stale `v2 pilot analysis` blocker from the confirmatory execution task if the experiment record now names the finalists and pilot findings.
5. Add a project README log entry summarizing the claim, scope, findings, verification commands, and next-state handoff.
6. Run compound-fast checks for reusable learnings or missing follow-up tasks, then commit the closeout.
