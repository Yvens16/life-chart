---
status: pending
priority: p3
issue_id: "037"
tags: [code-review, quality]
dependencies: []
---

# Dead Guard lastYearGoals.length > 0 in App.tsx NewYearModal Condition

## Problem Statement

`App.tsx` renders `{showNewYearPrompt && lastYearGoals.length > 0 && <NewYearModal ... />}`. `showNewYearPrompt` is only set `true` when `hasLastYearGoals` is already true inside the `load()` path. Therefore `lastYearGoals.length > 0` is redundant whenever `showNewYearPrompt` is true—the extra check is dead code.

## Findings

- **Location:** `src/App.tsx:108`
- Duplicated invariant between load logic and render condition
- Slightly obscures the real trigger for showing the modal

## Proposed Solutions

Remove `&& lastYearGoals.length > 0` from the render condition, relying on the single source of truth that sets `showNewYearPrompt`.

If defensive programming is desired, prefer an assertion or comment at the `setShowNewYearPrompt(true)` site rather than a redundant render guard.

## Acceptance Criteria

- [ ] `NewYearModal` visibility matches prior behavior for all user flows
- [ ] Redundant `lastYearGoals.length > 0` check removed from the JSX condition (or replaced with a documented assertion if product wants a runtime safety net)
- [ ] No regression when `lastYearGoals` is populated

## Work Log

- _None yet_
