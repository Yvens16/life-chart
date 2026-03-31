---
status: pending
priority: p2
issue_id: "030"
tags: [code-review, quality]
dependencies: []
---

# carryForwardGoal and carryForwardGoals Duplicate Goal Construction Logic

## Problem Statement

`carryForwardGoal` and `carryForwardGoals` in `useAppData.ts` both build the new `Goal` object with the same ~12-line literal. Any new field (e.g. description, color, metadata) must be edited in two places or the single-goal and bulk paths diverge.

## Findings

- `src/hooks/useAppData.ts` lines 154–168 and 172–188: duplicated goal construction.
- Duplication is a maintenance hazard and a source of subtle behavioral bugs between flows.

## Proposed Solutions

Extract a single helper inside the hook module, for example `makeCarriedGoal(source: Goal, targetValue: number): Goal`, containing the shared object shape and defaults. Implement both `carryForwardGoal` and `carryForwardGoals` by calling this helper (bulk path maps sources to carried goals via the helper).

## Acceptance Criteria

- [ ] One shared helper builds the carried-forward `Goal` from `source` + `targetValue`.
- [ ] `carryForwardGoal` and `carryForwardGoals` both use it; no duplicated literal block remains.
- [ ] Behavior unchanged for single and bulk carry-forward.
- [ ] TypeScript compiles.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
