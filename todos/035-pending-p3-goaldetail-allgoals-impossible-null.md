---
status: pending
priority: p3
issue_id: "035"
tags: [code-review, typescript, quality]
dependencies: []
---

# GoalDetail allGoals Uses data?.goals ?? [] — Impossible Null After goal Is Narrowed

## Problem Statement

`GoalDetail.tsx` uses `const allGoals = data?.goals ?? []` before `buildGoalChain(goal, allGoals)`. By that point `goal` is confirmed non-null (e.g. `Navigate` guard above), which implies `data` is also loaded and non-null in the intended flow. The `?? []` branch should never run; if it did, it would silently build a chain of one and could mask a real data or routing bug.

## Findings

- **Location:** `src/components/GoalDetail.tsx:86-87`
- Optional chaining suggests `data` might be missing when the chain is built, contradicting the narrowed `goal` invariant
- Empty fallback hides inconsistencies between `goal` and `data.goals`

## Proposed Solutions

After the guard that ensures `goal` (and thus successful load semantics), simplify to a non-optional access, for example:

```ts
buildGoalChain(goal, data!.goals)
```

Alternatively, restructure so TypeScript narrows `data` without non-null assertion (preferred if a small refactor makes `data` definite in that branch).

## Acceptance Criteria

- [ ] No `data?.goals ?? []` in the post-guard chain-building path unless a genuine loading edge case remains
- [ ] TypeScript reflects that `goals` is defined when building the chain after `goal` is known
- [ ] Behavior unchanged for valid loads; invalid states fail visibly or match product expectations

## Work Log

- _None yet_
