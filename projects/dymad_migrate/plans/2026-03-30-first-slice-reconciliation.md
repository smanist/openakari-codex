# First Slice Reconciliation

Date: 2026-03-30
Status: completed
Project: dymad_migrate

## Decision

Keep the recorded first vertical slice as the data-boundary slice.

Do not re-baseline the project to a checkpoint-first vertical slice.

## Why

The status review found real implementation progress on the checkpoint boundary:

- `facade/store/exec` skeleton
- compatibility path for `load_model(...)`
- end-to-end boundary tests

But that work does not invalidate the original slice choice.

The original first slice still targets the highest-value architectural bottleneck:

- `DynData`
- `TrajectoryManager`
- transform application at the data boundary

The checkpoint-first work is better treated as an enabling boundary seam, not as the main first vertical slice.

## Reconciled interpretation

### What already counts as progress

- boundary architecture is no longer speculative
- checkpoint compatibility can be routed through the new layers
- public `load_model(...)` can adopt the new boundary without changing caller shape

### What still defines completion of the first vertical slice

The first vertical slice remains incomplete until all of these are true:

1. typed regular-series data objects exist and are used in a real preprocessing path
2. transform application has an explicit typed seam above those data objects
3. checkpoint prediction can consume the typed seam through adapters
4. blocker parity gates still pass

## Immediate implementation order after reconciliation

1. keep a migration scoreboard so design/code divergence is visible
2. adopt the checkpoint boundary on the public `load_model(...)` path
3. land the first regular-series seam in the trajectory preprocessing path
4. keep parity reporting split between:
   - reference oracle (`dymad_ref`)
   - migrated package (`dymad_migrate`)
5. only after that, extend the transform seam beyond documentation

## Practical consequence for future sessions

When a session asks "what is the next migration step?", prefer:

- data-boundary seam work

over:

- additional checkpoint-boundary elaboration

unless the checkpoint boundary is needed to unblock a concrete parity-critical workflow.
