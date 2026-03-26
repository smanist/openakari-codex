# Structured work records

Use structured artifacts so future sessions can understand and reproduce work.

## Experiments

- Put experiments under `projects/<project>/experiments/<experiment-id>/`.
- Include an `EXPERIMENT.md` with YAML frontmatter (see `docs/schemas/experiment.md`).
- Keep project experiment directories lightweight: `EXPERIMENT.md`, metadata, and progress tracking only.
- Put run scripts, logs, watched CSVs, and heavy results under `modules/<package>/artifacts/<experiment-id>/`.

## Analyses / diagnoses / postmortems

- Prefer dated filenames and headings.
- Include a short “Verification” section when a claim depends on a command.
