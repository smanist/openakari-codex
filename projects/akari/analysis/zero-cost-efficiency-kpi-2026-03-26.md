# Zero-cost session KPI definition - 2026-03-26

## Purpose

Define the primary efficiency KPI and fallback KPI for windows where `costUsd` is zero, so `/orient` can report a meaningful efficiency metric when `findings/$` is undefined.

## KPI definitions (zero-cost windows)

Window definition (unchanged from current `/orient`): latest up to 10 sessions where:
- `triggerSource == "scheduler"`
- `jobName` contains `"work-cycle"`

Let `findings_i = newExperimentFindings_i + logEntryFindings_i` for session `i`.

Primary KPI (zero-cost):
- `findings_per_session = (sum(findings_i)) / N`
- Why this is primary: it preserves the findings numerator used by `findings/$` while replacing the unusable dollar denominator with sessions, so it remains defined when `sum(costUsd) = 0`.

Fallback KPI (zero-cost):
- `non_zero_findings_rate = count(findings_i > 0) / N`
- Why this is fallback: it is robust to outlier-sized finding counts and already has an operational threshold (`<30%` enables the findings-first gate in `/orient`).

## Orient reporting recommendation

Use a denominator switch rule:
- If `sum(costUsd) > 0`: keep `findings/$` as primary KPI.
- If `sum(costUsd) == 0`: report
  - primary: `findings_per_session`
  - fallback: `non_zero_findings_rate` (with arithmetic `x/N = y%`)
  - and explicitly print `findings/$ = n/a (zero-cost window)`.

Suggested output lines for zero-cost windows:
- `Primary KPI (zero-cost): findings/session = <total_findings>/<N> = <value>`
- `Fallback KPI: non-zero findings rate = <non_zero>/<N> = <pct>%`
- `findings/$: n/a (sum(costUsd)=0)`

## Current-window example (provenance)

Provenance command (run in this session):

```bash
node - <<'NODE'
const fs=require('fs');
const rows=fs.readFileSync('.scheduler/metrics/sessions.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const window=rows.filter(r=>r.triggerSource==='scheduler' && String(r.jobName||'').includes('work-cycle')).slice(-10);
const f=r=>(r.knowledge?.newExperimentFindings||0)+(r.knowledge?.logEntryFindings||0);
const total=window.length;
const nonZero=window.filter(r=>f(r)>0).length;
const findingsTotal=window.reduce((a,r)=>a+f(r),0);
console.log({total,nonZero,findingsTotal});
NODE
```

Observed values on 2026-03-26:
- `N = 8`
- `total_findings = 0`
- `non_zero_sessions = 0`

Arithmetic:
- `findings_per_session = 0/8 = 0.0`
- `non_zero_findings_rate = 0/8 = 0.0%`
- `findings/$ = n/a` because `sum(costUsd) = 0`.

## Decision

For zero-cost windows, treat `findings_per_session` as the primary efficiency KPI and `non_zero_findings_rate` as the fallback KPI used for gating and interpretability.
