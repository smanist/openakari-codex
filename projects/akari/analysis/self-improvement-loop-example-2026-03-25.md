# Self-improvement loop example (local)

Date: 2026-03-25

This note records a concrete “detect gap → change system → re-measure” loop using the scheduler’s own operational metrics.

## Loop: Fix false-positive health monitoring signals

### Detect (before)

The scheduler health watchdog previously raised issues driven by:
- `task_starvation` counting a manual smoke run
- `ledger_inconsistent` escalation even when `costUsd: 0`

Recompute the “before” window (12 rows) from the current `.scheduler/metrics/sessions.jsonl` (the same timestamp span used in `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-25.md`):

Command:
```bash
python - <<'PY'
import json
from pathlib import Path
from datetime import datetime

def parse_ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

rows = [json.loads(l) for l in Path(".scheduler/metrics/sessions.jsonl").read_text().splitlines() if l.strip()]
start = parse_ts("2026-03-24T21:53:49.000Z")
end = parse_ts("2026-03-25T15:23:17.280Z")

window = [r for r in rows if start <= parse_ts(r["timestamp"]) <= end]
window = sorted(window, key=lambda r: r["timestamp"])
print("window rows:", len(window), "first:", window[0]["timestamp"], "last:", window[-1]["timestamp"])

# Proxy for the watchdog’s starvation notion: “0 commits, 0 files, 0 projects”.
starve = [
    r for r in window
    if r.get("verification", {}).get("commitCount", 0) == 0
    and r.get("verification", {}).get("filesChanged", 0) == 0
    and len(r.get("crossProject", {}).get("projectsTouched", [])) == 0
]
print("task_starvation proxy:", len(starve), "/", len(window))
for r in starve:
    print(" ", r["runId"], r["timestamp"], "triggerSource=", r.get("triggerSource"))

ledger_bad = [r for r in window if r.get("verification", {}).get("ledgerConsistent") is False]
print("ledgerConsistent:false:", len(ledger_bad), "/", len(window))
print("ledgerBad with costUsd!=0:", sum(1 for r in ledger_bad if (r.get(\"costUsd\") or 0) != 0))
PY
```

Output:
```
window rows: 12 first: 2026-03-24T21:53:49.752Z last: 2026-03-25T15:23:17.280Z
task_starvation proxy: 1 / 12
  ufbtd1yr-e9f312d6 2026-03-25T15:23:17.280Z triggerSource= manual
ledgerConsistent:false: 5 / 12
ledgerBad with costUsd!=0: 0
```

### Change (intervention)

On 2026-03-25, `projects/akari/diagnosis/diagnosis-scheduler-health-signals-2026-03-25.md` diagnosed these as false positives and `projects/akari/README.md` records the corresponding health-check logic fixes (manual-run exclusion, ledger enforcement gated on actual resource consumption, duration anomaly noise guard).

### Measure (after)

Run the watchdog over the most recent 20 sessions:

Command:
```bash
node infra/scheduler/dist/cli.js watchdog --limit 20
```

Output:
```
Analyzed 20 sessions.
:white_check_mark: Session health watchdog: all clear. No anomalies detected.
```

### Result

This is a complete loop example: a gap is detected from operational data, a specific change is made to the system’s health checks, and a re-run measurement confirms the prior issues are no longer being flagged.

