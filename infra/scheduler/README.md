# akari

Minimal cron scheduler for autonomous agent sessions. Manages scheduled jobs that invoke local agent runtimes such as `codex exec` to run autonomous work cycles.

Status: active
Mission: Provide a standalone, zero-dependency (beyond croner) scheduler for akari autonomous execution.
Done when: Scheduler reliably triggers autonomous sessions on cron schedule with job state persistence.

## Architecture

```
CLI (cli.ts)
 ├── add/list/remove/run    → JobStore (store.ts) → jobs.json
 └── start (daemon)         → SchedulerService (service.ts)
                                ├── poll loop (30s)
                                ├── computeNextRunAtMs (schedule.ts)
                                └── executeJob (executor.ts) → backend adapter → codex/openai/cursor/opencode
```

- **types.ts**: Job schema (schedule, payload, state)
- **schedule.ts**: Cron expression → next run time (via croner library)
- **store.ts**: JSON file persistence for job definitions and state
- **executor.ts**: Spawns the selected agent backend for unattended execution
- **service.ts**: Timer loop that checks for due jobs and runs them
- **cli.ts**: CLI entry point for managing jobs and running the daemon

## Usage

```bash
# Install and build
cd infra/scheduler
npm install
npm run build

# Add the akari work cycle job
node dist/cli.js add \
  --name "akari-work-cycle" \
  --cron "0 * * * *" \
  --tz "UTC" \
  --message-default \
  --model opus \
  --cwd /path/to/akari

# List jobs
node dist/cli.js list

# Run a job immediately (for testing)
node dist/cli.js run <job-id>

# Start the daemon (foreground)
node dist/cli.js start

# Stop the daemon
node dist/cli.js stop

# Check status
node dist/cli.js status
```

## Production deployment (pm2)

```bash
# Start the scheduler daemon via pm2 (from repo root)
pm2 start infra/scheduler/ecosystem.config.js

# Or if already running, restart to pick up config changes
pm2 restart akari

# Save for reboot persistence
pm2 save

# Monitor
pm2 logs akari
pm2 status

# Stop
pm2 stop akari
```

Openakari does not ship a dashboard UI. It ships a local control API (see below).

## Creating jobs

**Always use the CLI `add` command. Do not edit `jobs.json` directly.**

Prompt shortcuts for `add`:
- `--message-default` inserts the standard autonomous work-cycle prompt.
- `--message-project <project>` inserts the project-scoped work-cycle prompt for `projects/<project>`.
- `--message <msg>` still accepts a fully custom prompt.

Choose exactly one of `--message`, `--message-default`, or `--message-project`.

The `add` command computes `nextRunAtMs` and stamps the schedule fingerprint atomically. Direct JSON editing risks creating jobs with `null` `nextRunAtMs` that will never fire. See [postmortem-scheduled-jobs-never-fired-2026-03-05.md](../../projects/akari/postmortem/postmortem-scheduled-jobs-never-fired-2026-03-05.md) for the incident where three jobs silently failed for 11+ days due to this issue.

## Job storage

Jobs are persisted to `.scheduler/jobs.json` relative to the scheduler directory. Each job tracks:
- Schedule (cron expression or interval)
- Payload (message, model, working directory)
- State (next run, last run, status, error, run count)

## Agent backends

The scheduler supports multiple agent backends, configurable per-job or globally:

| Backend | How | Model default | Supervision | Cost tracking |
|---------|-----|---------------|-------------|---------------|
| `codex` | local Codex CLI (`codex exec --json`) | `gpt-5.2` | work-session default; best-effort stop | no |
| `openai` | Codex/OpenAI transport path for capability escape hatches | `gpt-5.2` | capability escape path; best-effort ask/stop | no |
| `claude` | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | per job config | full (watch/ask/stop) | yes |
| `cursor` | Cursor Agent CLI (`agent -p --output-format stream-json`) | `opus-4.6-thinking` | partial (watch/stop only, no ask) | no |
| `opencode` | opencode CLI (GLM-5 fleet path) | `glm5/zai-org/GLM-5-FP8` | partial (watch/stop only, no ask) | local DB estimate |

**Configuration:**

- **Per-job**: `--backend codex|openai|cursor|opencode|claude|auto` when adding a job
- **Global**: `AGENT_BACKEND=codex|openai|cursor|opencode|claude|auto` env var (default: `auto`)
- **`auto` mode**: capability-aware routing. Default route is `codex`; `openai` is selected only when the caller requires capabilities the default codex path does not provide.

`claude` remains as a deprecated compatibility backend during migration. New defaults and examples should use `codex` unless a capability-specific `openai` path is required.

The Cursor, Codex, and opencode-style CLI backends do not share a native Claude-style preset interface, so prompts are backend-shaped at the adapter layer. Cursor and opencode sessions do not report API cost; codex/openai paths currently rely on CLI transport rather than raw Responses API integration.

## Skill discovery

Scheduler skill enumeration reads repo-local skill directories in this order:

1. `.agents/skills/`
2. `.claude/skills/`

When the same skill exists in both places, the `.agents/skills/` copy wins. This allows Codex-adapted skill text to coexist with the Claude/Cursor mirror while preserving a single discovered skill set for prompts and chat routing.

## Slack integration (reference only)

Openakari ships Slack integration as a **reference implementation**, not as an out-of-the-box supported integration.

See `infra/scheduler/reference-implementations/slack/`.

The scheduler runs without Slack. If you want Slack notifications, copy/adapt the reference implementation into your own environment.

## Control API (no dashboard UI)

The scheduler starts a local HTTP API (default: `http://127.0.0.1:8420`) for monitoring and push coordination.

Key endpoints:

- `GET /api/status` — unified status snapshot (sessions, experiments, jobs)
- `POST /api/push/enqueue` — enqueue a git push request
- `GET /api/push/status/:sessionId` — check push status/result for a session

## External health monitoring

The scheduler includes a `check-health` command for external monitoring. This runs independently of the scheduler process and alerts if the API becomes unresponsive.

### Usage

```bash
# Run health check manually
node dist/cli.js check-health --notify

# Options:
#   --url <url>         Scheduler API URL (default: http://localhost:8420)
#   --timeout <ms>      Request timeout in ms (default: 5000)
#   --state-file <path> State file for tracking failures (default: /tmp/akari-health-state.json)
#   --notify            Send Slack DM on failure/recovery
```

### System cron setup

Add to `/etc/cron.d/akari-health` (or user crontab):

```
# Check scheduler health every 2 minutes
*/2 * * * * <user> cd /path/to/akari/infra/scheduler && node dist/cli.js check-health --notify >> /var/log/akari-health.log 2>&1
```

### Behavior

- Pings `/api/status` endpoint
- Tracks consecutive failures in state file
- Sends Slack alert on second consecutive failure (avoids spamming on transient glitches)
- Sends recovery notification when scheduler comes back online
- Exits with code 1 if `consecutiveFailures >= 2` (useful for monitoring systems)

### Why external?

Internal monitoring (health-watchdog) only runs when the scheduler is running. If the scheduler crashes or hangs, internal checks stop. External cron-based monitoring catches these cases.

## Design decisions

- **No external dependencies beyond croner**: The scheduler uses Node.js built-ins for everything except cron expression parsing.
- **Polling, not event-driven**: The daemon polls every 30s. This is simple, reliable, and adequate for jobs that run at most hourly.
- **Max concurrent sessions limit**: By default, only 1 session runs at a time. This prevents overlapping sessions when a job spans multiple poll intervals. Configure via `maxConcurrentSessions` option (0 = unlimited). The limit applies across all jobs — different job types cannot run simultaneously when the limit is reached.
- **Serialized pushes under concurrency**: Fleet workers can request pushes via the control API so `git push` is effectively serialized.
- **Store reloaded on each tick**: Allows external modification (e.g., `add` from CLI while daemon runs) without restart.
- **Explicit multi-step prompts required**: Prototype testing (see [projects/akari/README.md](../../projects/akari/README.md) experiment log) showed that referencing the SOP file alone produces orient-only behavior (2/7 SOP steps). Explicitly enumerating all 5 steps in the prompt achieves 7/7 adherence.
- **CLAUDECODE env var stripped**: The executor removes the `CLAUDECODE` environment variable before spawning Claude SDK sessions, preventing nested-session guard from blocking execution when the scheduler itself runs inside a Claude Code context.
- **Codex-first routing**: `auto` now prefers local Codex for ordinary work sessions and only escalates to the `openai` path when the caller explicitly needs capabilities the default Codex route does not guarantee.

## Push Queue

The fleet operates N=16+ workers that each commit to the git repository. Without coordination, concurrent `git push` operations cause race conditions, merge conflicts, and repository lockups.

### Problem

Multiple workers pushing simultaneously creates contention:
- Git's push/pull mechanism is not designed for high-concurrency writes
- Concurrent pushes trigger "non-fast-forward" errors
- Workers may overwrite each other's commits
- Repository can enter inconsistent state requiring manual intervention

### Solution

Push queuing decouples commit from push:

1. **Workers commit locally** — `git add && git commit` runs immediately in the worker's session
2. **Push request queued** — Worker calls `/api/push-queue` endpoint instead of `git push`
3. **Serialized execution** — Single push processor dequeues and executes pushes sequentially
4. **Conflict detection** — Before push, fetches remote and checks for conflicts
5. **Retry with backoff** — Failed pushes retry with exponential backoff (max 3 attempts)

### Design Rationale

See [decisions/0061-push-queuing.md](../../decisions/0061-push-queuing.md) for the full ADR.

**Key insight**: Git push is inherently serial. The queue makes this explicit and eliminates race conditions at the source.

**Tradeoffs**:
- Latency: Pushes are async (worker doesn't wait for confirmation)
- Simplicity: Single-processor model avoids distributed locking complexity
- Resilience: Conflicts detected proactively; failures logged with context

### API Endpoints

- `POST /api/push/enqueue` — Enqueue a push request
- `GET /api/push/status/:sessionId` — Get status/result of a specific session push

### Conflict Resolution

When a conflict is detected, the push is rejected with details. The worker session ends cleanly; a subsequent session (by the same or different worker) will pull the updated remote and continue work.

## Log

### 2026-03-25 — Add canned prompt flags for `add`

Added scheduler CLI shortcuts for the common autonomous work-cycle prompts. `node dist/cli.js add --message-default` now expands to the standard 5-step work-cycle boilerplate, and `--message-project <project>` expands to the project-scoped variant that runs `/orient <project>` and limits work to `projects/<project>` unless shared infra is directly required.

Verification: `cd infra/scheduler && npm test -- src/cli-add.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  8 passed (8)`

### 2026-03-25 — Show daemon state in `status`

Updated the unified status output to distinguish the scheduler daemon's process state from persisted job configuration. `node dist/cli.js status` now reports `Daemon: running` or `Daemon: stopped` based on `.scheduler/scheduler.pid`, so a stopped daemon no longer looks like an actively scheduling system just because enabled jobs still exist in `.scheduler/jobs.json`.

Verification: `cd infra/scheduler && npm test -- src/status.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  15 passed (15)`

### 2026-03-25 — Make `stop` complete shutdown in one invocation

Updated `node dist/cli.js stop` to wait briefly for the scheduler to exit after sending `SIGTERM`, and to clean up the lockfile in the same invocation once exit is observed. This avoids the confusing prior behavior where the first `stop` terminated the daemon, a second `stop` removed the stale lockfile, and only a third reported "No running scheduler found."

Verification: `cd infra/scheduler && npm test -- src/cli-stop.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  4 passed (4)`

### 2026-03-25 — Add a `stop` command for the scheduler daemon

Added `node dist/cli.js stop`, which reads `.scheduler/scheduler.pid`, sends `SIGTERM` to the running scheduler, and lets the daemon's existing signal handler perform a graceful shutdown and release the lockfile. This avoids manual PID lookup when the scheduler was started from another terminal.

Verification: `cd infra/scheduler && npm test -- src/cli-stop.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  3 passed (3)`

### 2026-03-25 — Prevent removed jobs from being resurrected by stale scheduler state

Fixed a concurrency bug in the scheduler job store where `node dist/cli.js remove` or `disable` could be undone by a running daemon. Root cause: the daemon loaded `.scheduler/jobs.json` into memory at tick start, and later `updateState()` wrote that stale in-memory snapshot back to disk after a session finished, reintroducing jobs that had been removed externally.

Changes:
- Updated `src/store.ts` mutators (`add`, `remove`, `updateState`, `setEnabled`) to reload the latest on-disk store before applying a mutation and saving.
- Added a regression test in `src/store.test.ts` covering the stale-instance case where one store removes a job and another stale store later calls `updateState()`; the removed job now stays deleted.

Verification: `cd infra/scheduler && npm test -- src/store.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  9 passed (9)`

Verification: `cd infra/scheduler && npm test -- src/service.test.ts`
Output:
- `Test Files  1 passed (1)`
- `Tests  15 passed (15)`

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output:
- no output (exit 0)

### 2026-03-24 — Restore openakari scheduler build compatibility after API drift

Fixed the `npm run build` failure in `infra/scheduler` caused by interface drift between the openakari Slack stub and the scheduler callers, plus stale experiment-status and push-enqueue assumptions in the CLI/API layer.

Changes:
- Aligned `src/slack.ts` with the reference Slack function signatures used by `cli.ts` and `executor.ts`, while keeping the openakari implementation as no-op stubs.
- Added `setPersistenceDir()` to the openakari Slack stub so scheduler startup can configure living-message persistence without importing the reference-only Slack implementation.
- Added `toStatusExperiment()` in `src/status.ts` and switched both CLI status paths to derive timing from `progress.started_at` instead of the removed `startedAtMs` field.
- Added `parseEnqueueRequest()` in `src/api/server.ts` so push queue priority is parsed as `"opus" | "fleet"` and defaults to `"fleet"` when absent.
- Added regression coverage for the API enqueue parser, openakari Slack stub compatibility, and experiment status mapping.

Verification: `cd infra/scheduler && npm test -- src/api/server.test.ts src/slack.test.ts src/status.test.ts`
Output:
- `Test Files  3 passed (3)`
- `Tests  18 passed (18)`

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output:
- no output (exit 0)

Verification: `cd infra/scheduler && npm run build`
Output:
- `> @akari/scheduler@0.1.0 build`
- `> npx tsc`

### 2026-03-24 — Codex-first backend routing and compatibility migration

Added first-class `codex` and `openai` backend names, changed `auto` from provider-fallback semantics to capability-aware routing, and moved Claude-specific prompt/tool defaults out of the shared spawn path and into the Claude adapter. Deep-work/chat supervision now checks backend capabilities instead of hardcoding `backend === "claude"`, while Slack/CLI/backend preference surfaces now present Codex/OpenAI-first naming.

Verification: `cd infra/scheduler && npx vitest run src/backend-all.test.ts src/backend-preference.test.ts reference-implementations/slack/slack.test.ts`
Output:
- `Test Files  2 passed (2)`
- `Tests  72 passed (72)`

Verification: `cd infra/scheduler && npx tsc --noEmit`
Output: typecheck still fails in pre-existing files including `src/api/server.ts`, `src/cli.ts`, and `src/executor.ts`. This session did not resolve the wider scheduler type debt.

### 2026-03-24 — Dual skill-root discovery for Codex compatibility

Updated scheduler skill discovery to read both `.agents/skills/` and `.claude/skills/`, preferring the `.agents` copy when the same skill exists in both trees. Also broadened frontmatter parsing to handle unquoted descriptions and Codex-style `model-minimum` values like `gpt-5` and `fast-model`.

Reason: the repo carries both Claude/Cursor and Codex skill mirrors, but the scheduler previously hardcoded `.claude/skills/` and silently ignored the Codex tree. This made local skill discovery inconsistent across runtimes.

### 2026-02-16 — Multi-backend support (Claude + Cursor)

Added agent backend abstraction supporting both Claude Code SDK and Cursor Agent CLI, with automatic fallback.

New `backend.ts` module provides `AgentBackend` interface with two implementations:
- `ClaudeBackend`: wraps existing `@anthropic-ai/claude-agent-sdk` (no behavioral change for existing jobs)
- `CursorBackend`: spawns `agent -p --output-format stream-json --yolo --trust` with `opus-4.6-thinking` model, parses NDJSON output, maps to common message format

`resolveBackend("auto")` returns a `FallbackBackend` that tries Claude first and retries with Cursor on rate-limit, usage-limit, or process-exit errors. Verified: Claude failing inside nested session → Cursor fallback succeeds in ~5s. System prompt prepending via `<system_instructions>` tags works for Cursor chat.

Changes: `backend.ts` (new), `executor.ts` (uses backend abstraction), `chat.ts` (uses backend), `session.ts` (`Query` → `SessionHandle`), `slack.ts` (guards `ask` for Cursor, uses `handle.interrupt()`), `types.ts` (`backend` field on `JobPayload`), `cli.ts` (`--backend` flag).

Sources: `agent --help`, `agent models`, Cursor stream-json output format testing

### 2026-02-15 (c)

Prototype validation and production deployment. Two test runs:

- **Run 1** (vague prompt: "Begin with /orient"): Agent produced orientation report only, 34s, 2/7 SOP steps. Diagnosis: agent treated `claude -p` as single-turn text generation.
- **Run 2** (explicit prompt enumerating all 5 steps): Agent completed full cycle in 90s, 7/7 SOP steps, produced 2 git commits.

Key fix: executor now strips CLAUDECODE env var (prevents nested-session guard). Session output captured to `.scheduler/logs/` with timestamps.

Production job updated to use explicit multi-step prompt. Daemon managed by pm2 (`pm2 restart akari`). Process saved for reboot persistence.

Sources: [projects/akari/README.md](../../projects/akari/README.md) experiment log, `.scheduler/logs/prototype-test-*.log`

### 2026-02-15 (b)

Fixed executor to use correct Claude CLI invocation: `claude -p` with positional prompt argument and `--dangerously-skip-permissions` for unattended execution (previously used non-existent `--message` flag). Fixed build script to use `npx tsc`. Added `.scheduler/`, `dist/`, `node_modules/` to repo `.gitignore`. Verified build and CLI operations (add, list, status, remove) all work.

Tested: `node dist/cli.js add --name akari-work-cycle --cron "0 9,21 * * *" --tz UTC --model opus --cwd /path/to/repo --message "..."` → job created, next run 2026-02-15T21:00:00.000Z.

Sources: `claude --help` output, [decisions/0005-autonomous-execution.md](../../decisions/0005-autonomous-execution.md)

### 2026-02-15

Initial implementation. Extracted scheduling primitives from OpenClaw cron system, built standalone scheduler with: cron/interval scheduling via croner, JSON file persistence, claude -p execution, CLI for job management, polling daemon service.

Sources: OpenClaw `src/cron/` (types, schedule computation pattern), [decisions/0005-autonomous-execution.md](../../decisions/0005-autonomous-execution.md)
