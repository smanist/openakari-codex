# Provenance

Goal: keep claims reproducible and trustworthy across sessions.

## General rule

Every numerical claim in a **Findings** section must include provenance:

- (a) a script + data file that produces it, or
- (b) inline arithmetic from referenced data (e.g., `96/242 = 39.7%`).

## Verification logging

When you verify something, record:

- exact command(s) run,
- the key output (or a snippet),
- and where the output artifact lives.

## Provisional data (Decision 0050)

Experiments may be `verified` or `provisional` (see `decisions/0050-provisional-data-tagging.md` and `docs/schemas/experiment.md`).

When citing results from provisional experiments, include an explicit warning in the citing document.

