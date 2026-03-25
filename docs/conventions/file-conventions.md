# File conventions

This repo is persistent memory. Prefer patterns that make artifacts easy to find and verify.

## General

- Prefer Markdown (`.md`) for human-readable artifacts (plans, analyses, diagnoses, postmortems).
- Prefer small, focused files over monolith docs.
- Prefer stable, descriptive filenames (include dates when appropriate).

## Common locations

- Projects: `projects/<project>/...`
- Infra code/tools: `infra/<tool>/...`
- Decisions (ADRs): `decisions/00xx-*.md`
- Scheduler outputs: `.scheduler/...` (generated; don’t hand-edit unless you’re fixing tooling)

## Link hygiene

- Use repo-relative links.
- If you rename/move referenced files, add a stub/redirect or update links in the same change.

