---
status: pending
priority: p3
issue_id: "034"
tags: [code-review, typescript, quality]
dependencies: []
---

# computeProgressPercent Parameter Should Use Pick<Goal> Not Full Goal

## Problem Statement

`computeProgressPercent` in `goalChain.ts` accepts a full `Goal` but only reads `targetValue` and `startValue`. The broad parameter type makes the function less reusable, harder to test with minimal fixtures, and less self-documenting about actual dependencies.

## Findings

- **Location:** `src/utils/goalChain.ts:46`
- Callers must satisfy the entire `Goal` shape even when only progress bounds matter
- Future refactors to `Goal` may suggest false coupling to this helper

## Proposed Solutions

Change the parameter type to narrow the requirement:

```ts
goal: Pick<Goal, 'targetValue' | 'startValue'>
```

Update call sites if needed (they likely already pass a full `Goal`, which remains assignable).

## Acceptance Criteria

- [ ] `computeProgressPercent` declares `Pick<Goal, 'targetValue' | 'startValue'>` (or equivalent explicit minimal type)
- [ ] Typecheck passes; no behavioral change
- [ ] JSDoc or inline comment updated only if the file already documents parameters similarly

## Work Log

- _None yet_
