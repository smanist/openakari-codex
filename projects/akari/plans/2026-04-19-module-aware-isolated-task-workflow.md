# Plan: Module-Aware Isolated Task Workflow with Local Review Loop

Date: 2026-04-19
Project: akari
Status: implemented

## Goal

Add an isolated execution path for autonomous scheduler tasks whose project resolves to an existing module in `modules/registry.yaml`, while preserving the existing shared-checkout executor for projects without a usable module path.

## Scope

In scope:
- project-to-module resolution with existence checks
- selector-only intake phase in the canonical checkout
- per-task worktree creation under `modules/.worktrees/<module>/...`
- fresh author, reviewer, and fix sessions in the isolated worktree
- structured review artifacts and task-run manifests under `.scheduler/`
- automatic squash-merge integration after review pass
- scheduled cleanup for stale isolated task runs
- metrics/verification compatibility with the legacy shared executor

Out of scope:
- creating new modules or submodules automatically
- replacing local review with GitHub PRs
- changing `TASKS.md` syntax

## Design

1. Selector session runs in the canonical checkout.
It performs `/orient`, selects exactly one task, claims it, and returns structured task JSON without editing files.

2. Module resolution gates isolated execution.
If `modules/registry.yaml` resolves the selected project to an existing module path, the scheduler switches to isolated execution. Otherwise it falls back to the legacy shared executor unchanged.

3. Author/reviewer/fix sessions run in an ephemeral worktree.
Worktrees live under `modules/.worktrees/<module>/<taskId>-<taskRunId>`. Task branches use `codex/<module>/<taskId>`. Submodule tasks use the submodule repo as the git root while leaving parent-repo changes for final integration.

4. Review is local but role-separated.
The reviewer runs in a fresh session with a reviewer-only prompt and emits structured JSON findings to `.scheduler/reviews/<taskRunId>/round-XX.json`. P0-P1 findings block integration; P2-P3 findings are advisory. The reviewer is checked for worktree cleanliness after each run.

5. Integration is serialized and branch-aware.
On review pass, the scheduler enqueues integration, squash-merges the task branch into the recorded base branch, updates project durable records, and then removes the worktree and task branch on success. Conflicts and manual-review cases preserve the worktree state for follow-up.

6. Stale isolated runs are cleaned up separately from remote branch cleanup.
The periodic maintenance tick now prunes stale completed or abandoned isolated task runs, while keeping `manual_intervention_required` and `integration_conflict` runs for human follow-up.

## Success Criteria

- Existing-module projects enter isolated execution automatically.
- Missing-module projects still execute through the existing shared path.
- Reviewer findings drive up to two fix rounds before manual escalation.
- Successful isolated runs integrate automatically and clean up their worktree.
- Scheduled maintenance can prune stale isolated worktrees/manifests.
