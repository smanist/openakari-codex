# Human intervention rate (local snapshot)

Date: 2026-03-25
Project: akari
Type: analysis

## Definition

This analysis treats **human intervention** as a session whose `triggerSource` is `slack` or `manual` (matching `infra/scheduler/src/health-watchdog.ts` “Human intervention rate” check).

## Data

Source: `.scheduler/metrics/sessions.jsonl`

Current file size is small and only covers recent activity:

- `wc -l .scheduler/metrics/sessions.jsonl` → `5`

## Findings

Across the available 5 sessions:

- Total sessions with `triggerSource`: 5
- Scheduler-triggered sessions: 5
- Human-triggered sessions: 0
- Human intervention ratio (human / scheduler): `0/5 = 0.0`

Two time windows (relative to the most recent timestamp in the file):

```
[all] sessions=5 (latest=2026-03-25T02:13:59.869000+00:00)
  triggerSource-known=5 scheduler=5 human=0 human_per_autonomous=0.000
  jobName breakdown:
    - work-cycle: 3
    - pca-v-ttd: 2
[last_24h] sessions=5 (latest=2026-03-25T02:13:59.869000+00:00)
  triggerSource-known=5 scheduler=5 human=0 human_per_autonomous=0.000
  jobName breakdown:
    - work-cycle: 3
    - pca-v-ttd: 2
[last_2h] sessions=4 (latest=2026-03-25T02:13:59.869000+00:00)
  triggerSource-known=4 scheduler=4 human=0 human_per_autonomous=0.000
  jobName breakdown:
    - pca-v-ttd: 2
    - work-cycle: 2
```

## Provenance / reproduction

1) Confirm trigger sources in the current dataset:

- `rg -n '"triggerSource":' .scheduler/metrics/sessions.jsonl | wc -l` → `5`
- `rg -n '"triggerSource":"scheduler"' .scheduler/metrics/sessions.jsonl | wc -l` → `5`
- `rg -n '"triggerSource":"(slack|manual)"' .scheduler/metrics/sessions.jsonl` → *(no matches)*

2) Recompute the windowed summary (prints the exact block shown above):

```
python - <<'PY'
import json
from datetime import datetime, timedelta
from pathlib import Path

def parse_ts(s: str) -> datetime:
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)

path = Path(".scheduler/metrics/sessions.jsonl")
sessions = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
for s in sessions:
    s["_ts"] = parse_ts(s["timestamp"])

latest = max(s["_ts"] for s in sessions)

def summarize(name: str, window: timedelta | None):
    if window is None:
        subset = sessions
    else:
        cutoff = latest - window
        subset = [s for s in sessions if s["_ts"] >= cutoff]

    with_trigger = [s for s in subset if s.get("triggerSource")]
    autonomous = [s for s in with_trigger if s["triggerSource"] == "scheduler"]
    human = [s for s in with_trigger if s["triggerSource"] in ("slack", "manual")]
    ratio = (len(human) / len(autonomous)) if len(autonomous) else (float("inf") if len(human) else 0.0)

    job_counts = {}
    for s in subset:
        job_counts[s.get("jobName", "(none)")] = job_counts.get(s.get("jobName", "(none)"), 0) + 1

    print(f"[{name}] sessions={len(subset)} (latest={latest.isoformat()})")
    print(f"  triggerSource-known={len(with_trigger)} scheduler={len(autonomous)} human={len(human)} human_per_autonomous={ratio:.3f}")
    print("  jobName breakdown:")
    for job, c in sorted(job_counts.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"    - {job}: {c}")

summarize("all", None)
summarize("last_24h", timedelta(hours=24))
summarize("last_2h", timedelta(hours=2))
PY
```

## Limitations

This is a **snapshot** from a small local dataset (`5` sessions). If `sessions.jsonl` is pruned, newly created, or not being populated with a longer history, this metric won’t capture meaningful trends yet.

