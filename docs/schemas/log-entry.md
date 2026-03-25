# Schema: log entry

Log entries typically live in a project `README.md` under a `## Log` section.

## Minimal format

```md
### YYYY-MM-DD (Short title)

<1–5 paragraph narrative>

Verification:
- `<command>` → `<key output>`

Session-type: autonomous
Duration: <minutes>
Task-selected: <task text or "none">
Task-completed: yes | partial | no
Approvals-created: <count>
Files-changed: <count>
Commits: <count>
Compound-actions: <count> or "none"
Resources-consumed: <resource: amount, ...> or "none"
Budget-remaining: <resource: remaining/limit, ...> or "n/a"
```

If there was no verification, omit the Verification section.

