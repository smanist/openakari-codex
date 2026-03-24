# Codex Skill Discovery Alignment

Date: 2026-03-24
Project: akari
Status: completed

## Goal

Align repo-local skill discovery with the fact that this repo carries both Codex-facing `.agents/skills/` files and Claude/Cursor-facing `.claude/skills/` files.

## Plan

1. Add regression tests for dual-root skill discovery and Codex-style frontmatter parsing in `infra/scheduler/src/skills.test.ts`.
2. Patch `infra/scheduler/src/skills.ts` to search `.agents/skills/` first and `.claude/skills/` second, with deterministic precedence.
3. Normalize frontmatter parsing so both quoted and unquoted descriptions work, and accept Codex-era `model-minimum` values such as `gpt-5` and `fast-model`.
4. Update docs to describe the dual-root layout instead of implying `.claude/skills/` is the only skill root.

## Outcome

Completed in the same session. The scheduler now treats the Codex skill mirror as a first-class source rather than dead files on disk, while preserving `.claude/skills/` as a fallback for existing repo conventions.
