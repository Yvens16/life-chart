---
status: pending
priority: p3
issue_id: "033"
tags: [code-review, typescript, quality]
dependencies: []
---

# GoalCard onCopyForward and currentYear Props Are Semantically Coupled But Independently Optional

## Problem Statement

`GoalCard` defines `onCopyForward?: () => void` and `currentYear?: number` as separate optional props, but `currentYear` is only meaningful when `onCopyForward` is present. The `?? 'current year'` fallback in the copy-forward `aria-label` is effectively unreachable dead code when the label path is only used alongside a defined handler.

## Findings

- **Location:** `src/components/GoalCard.tsx:22-23`
- Two independent optionals allow invalid combinations (e.g. `onCopyForward` set without `currentYear`, or vice versa) at the type level
- The fallback string for the year in accessibility copy suggests a branch that should not exist in a well-typed API

## Proposed Solutions

### Option A

Make `currentYear` required whenever copy-forward is supported (e.g. remove `?` from `currentYear` and document that callers passing `onCopyForward` must supply the year).

### Option B (discriminated grouping)

Group copy-forward concerns in a single optional object:

```ts
copyForward?: { year: number; onCopy: () => void }
```

- **Pros:** Impossible to express half-configured copy-forward; clearer intent
- **Cons:** Slight refactor at all call sites

## Acceptance Criteria

- [ ] `GoalCard` API does not allow `onCopyForward` without a defined year (or equivalent single grouped prop)
- [ ] No dead `?? 'current year'` (or similar) branch remains for the copy-forward control’s accessible name
- [ ] Call sites updated if prop shape changes

## Work Log

- _None yet_
