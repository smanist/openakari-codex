# Schema: EXPERIMENT.md

Experiments live under `projects/<project>/experiments/<id>/EXPERIMENT.md`.

## Frontmatter (required)

```yaml
id: <string>
type: experiment | analysis | implementation | bugfix
status: planned | running | completed | failed | abandoned
date: YYYY-MM-DD
project: <project>
consumes_resources: true | false
module: <package>                  # required for experiment/implementation/bugfix, and for resource-consuming analyses
artifacts_dir: modules/<package>/artifacts/<id>
tags: [<tag>, ...]
```

## Frontmatter (optional)

```yaml
data_quality: verified | provisional  # See decisions/0050-provisional-data-tagging.md
```

## Body (recommended)

- `# <Title>`
- `## Specification` — what is being tested/built, with inputs/outputs
- `## Changes` — what files/code were added/changed
- `## Verification` — exact commands + key outputs (or links to artifacts)
- `## Findings` — results with provenance (scripts/data paths)

`EXPERIMENT.md` stays under `projects/<project>/experiments/<id>/`. Runtime logs, watched CSVs, and heavy outputs belong under `artifacts_dir` in `modules/<package>/`.
