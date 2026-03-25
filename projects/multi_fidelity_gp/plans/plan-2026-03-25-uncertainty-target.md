# Plan — uncertainty target for calibration

Date: 2026-03-25
Project: `multi_fidelity_gp`
Task: Decide which uncertainty definition to optimize for calibration

## Goal

Make the project’s notion of “calibrated uncertainty” explicit and consistent across:

- README (conceptual target)
- Holdout evaluation outputs (preference rule + reporting emphasis)

## Decision (to validate in this session)

Target **latent function uncertainty** for calibration on the synthetic benchmark, since `y_hf` is generated as a deterministic function value (no measurement noise).

## Steps

1. Add a short README note stating the calibration target (latent) and why.
2. Update `holdout-eval/evaluate.py` so the preference rule uses latent metrics (and records that choice in `results.md` / `results.json`).
3. Re-run `python projects/multi_fidelity_gp/experiments/holdout-eval/evaluate.py` to regenerate artifacts.
4. Update `holdout-eval/EXPERIMENT.md` notes to match.
5. Mark the task complete in `projects/multi_fidelity_gp/TASKS.md` with evidence and verification.

