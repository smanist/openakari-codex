# Schema: budget.yaml and ledger.yaml

Budgets live at `projects/<project>/budget.yaml`.

## budget.yaml

```yaml
resources:
  <resource_name>:
    limit: <number>
    unit: <string>
deadline: <ISO-8601 timestamp>
```

Ledgers live at `projects/<project>/ledger.yaml`.

## ledger.yaml

```yaml
entries:
  - date: YYYY-MM-DD
    resource: <resource_name>
    amount: <number>
    unit: <string>
    description: <string>
```

If no resources have been consumed yet, use:

```yaml
entries: []
```

