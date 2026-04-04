# Plan: Model-spec rollout/memory metadata (LTI family)

Date: 2026-04-03
Project: dymad_migrate
Task: Extend `ModelSpec` with typed rollout and memory metadata for one predefined family

## Goal

Add typed rollout and memory metadata into the model-spec compatibility seam and
apply it to one predefined family (LTI), with focused regression verification.

## Steps

1. Add typed rollout/memory dataclasses and optional fields to `ModelSpec`.
2. Thread new fields through `LegacyPredefinedModelAdapter`.
3. Wire LTI-family predefined entries to concrete typed rollout/memory specs.
4. Add focused tests that assert the new typed fields directly.
5. Run focused model-spec + workflow verification and log findings.

## Completion

All steps completed in this session. Verification command and outputs are
recorded in:
`projects/dymad_migrate/analysis/2026-04-03-model-spec-rollout-memory-metadata.md`.
