# Self-Improvement Measurement — Local Plan

Date: 2026-03-24
Project: akari
Status: active
Type: local adaptation

## Knowledge output

Establish a repo-local, repeatable measurement protocol for whether the autonomous system is (a) producing useful knowledge, (b) complying with the work-cycle SOP, and (c) reducing human intervention over time — using only on-repo artifacts as data sources.

## Experiment: Baseline operational self-improvement metrics for this repo

Hypothesis: Measurement study — define quantities of interest, compute baselines, and track trends across sessions. (No directional claim until we have ≥10 sessions of data.)

CI layers:
- L0 (code): `infra/scheduler/` post-session verification + metrics emitters (when enabled)
- L2 (convention): log entry footer + inline logging conventions in `AGENTS.md`
- L3 (skill): `/orient`, `/design`, `/diagnose`, `/compound` adherence

Variables:
- Independent:
  - Time window (rolling last N sessions; default N=10)
  - Session backend (`codex` vs `openai` vs `opencode`), because cost + token reporting differs by backend
- Dependent (primary metrics):
  - **M1 — Knowledge production rate**: fraction of sessions with any non-zero knowledge output.
    - Data source: `.scheduler/metrics/sessions.jsonl` → `knowledge.*` fields (preferred); fallback: project README log entries with session footers.
  - **M2 — Findings per session**: mean of `knowledge.newExperimentFindings + knowledge.logEntryFindings` over the window.
    - Data source: `.scheduler/metrics/sessions.jsonl` → `knowledge.newExperimentFindings`, `knowledge.logEntryFindings`.
  - **M3 — SOP compliance rate**: fraction of sessions where `verification.hasCommit && verification.hasLogEntry && verification.hasCompleteFooter` is true.
    - Data source: `.scheduler/metrics/sessions.jsonl` → `verification.*`.
  - **M4 — Human intervention rate**: intervention events per session over the window.
    - Data source (preferred): `.scheduler/metrics/sessions.jsonl` → `knowledge.*` (approval entries created) + `verification.warningCount` as a proxy for human cleanup.
    - Data source (supplementary): `APPROVAL_QUEUE.md` entries (count and age), plus any explicit “manual recovery” notes in project README logs.
  - **M5 — Efficiency (findings / $)**: `(sum findings) / (sum costUsd)` over the window.
    - Data source: `.scheduler/metrics/sessions.jsonl` → `costUsd` + findings.
    - Caveat: cost may be `null` for local `codex`/`opencode` paths; treat as “not measurable” unless populated.
- Controlled:
  - Repo and branch: `main` only (exclude local unpushed work)
  - Session definition: one autonomous work-cycle run with a distinct `runId` (or a distinct dated README log entry if metrics are unavailable)
  - Inclusion criteria: exclude sessions explicitly marked idle (`isIdle: true`) once available in metrics

Method:
1. Ensure session metrics exist.
   - Preferred: `.scheduler/metrics/sessions.jsonl` populated by the scheduler’s post-session metrics recorder.
   - If missing, run at least one scheduler job to create it, then re-run this baseline.
2. Compute the rolling-window metrics from JSONL:
   - `tail -n 50 .scheduler/metrics/sessions.jsonl | jq -s '.[-10:] | map(select(.isIdle|not))'`
   - Then compute M1–M5 as above (prefer the `knowledge` and `verification` fields).
3. Record the baseline as a dated analysis note:
   - `projects/akari/analysis/session-metrics-baseline-YYYY-MM-DD.md` with explicit arithmetic (e.g., `8/10 = 80%`), and the exact command used.
4. Re-run on a fixed cadence (weekly or every 10 sessions) and compare deltas.

Validity threats:
- **Missing or partial metrics**: this repo may not yet have `.scheduler/metrics/sessions.jsonl`; until it exists, M1–M5 rely on manual extraction from README logs and will be noisier.
- **Backend measurement mismatch**: token/cost accounting differs across `codex`/`openai`/`opencode`; do not compare findings/$ across backends unless `costUsd` is populated consistently.
- **Proxy drift**: “warningCount” and approval-queue events are only proxies for human intervention; prefer explicit supervision logs when available.

Cost estimate:
- API calls: 0
- Compute: <1 minute per run (jq + tail)
- Human time: 5–15 minutes to write baseline note once
- Sessions: single-session to establish the protocol; multi-session to measure trends

Success criteria:
- Confirmed if: a baseline note exists with M1–M5 computed from explicit sources and can be re-run mechanically.
- Refuted if: metrics cannot be computed because required sources are missing and no fallback protocol is practical.
- Ambiguous if: metrics exist but are too sparse (e.g., <10 non-idle sessions) to interpret trends.

## Design rationale

- Chose session-metrics JSONL as the primary data source because it is explicitly designed for on-repo reporting (Decision 0015) and supports mechanical recomputation without a database.
- Chose SOP compliance and knowledge output as primary outcomes because they are both (a) measurable and (b) prerequisites for meaningful self-improvement; efficiency metrics are secondary until cost accounting is consistent across backends.

