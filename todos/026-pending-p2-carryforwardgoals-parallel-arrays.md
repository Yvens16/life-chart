---
status: pending
priority: p2
issue_id: "026"
tags: [code-review, typescript]
dependencies: []
---

# carryForwardGoals Takes Parallel Arrays — Type-Unsafe Interface

## Problem Statement

`carryForwardGoals(sources: Goal[], targetValues: number[])` pairs goals with targets by index. Parallel arrays are easy to desynchronize (wrong length, reordering, partial updates), and TypeScript cannot prove each `targetValues[i]` belongs to `sources[i]`. The fallback `targetValues[i] ?? source.targetValue` papers over length mismatches instead of making invalid states unrepresentable.

## Findings

- `src/hooks/useAppData.ts` line 172: signature uses two arrays whose relationship is only conventional.
- Index-based pairing has no compile-time link between a goal and its chosen target.
- Runtime fallbacks mask bugs rather than failing fast.

## Proposed Solutions

Change the API to a single array of pairs, for example:

`carryForwardGoals(items: Array<{ source: Goal; targetValue: number }>)`

Update `NewYearModal` (and any other call sites) to build that structure so each target is explicitly tied to its source goal.

## Acceptance Criteria

- [ ] `carryForwardGoals` accepts a paired structure; parallel `Goal[]` + `number[]` signature removed.
- [ ] `NewYearModal` (and other callers) updated to pass the new shape.
- [ ] No silent index fallback required for normal flows; invalid input handled deliberately if needed.
- [ ] TypeScript compiles; behavior unchanged for correct inputs.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
