---
status: pending
priority: p1
issue_id: "023"
tags: [code-review, architecture, react, agent-native]
dependencies: []
---

# QuickAddModal Lists Goals From All Years — Entries Can Be Written to Past-Year Goals

## Problem Statement

`QuickAddModal.tsx` uses `const goals = data?.goals ?? []`, which includes goals from **all** years. The FAB may be hidden when `!isCurrentYear` in `App.tsx`, but the modal’s goal picker is not scoped to the current year. A user or agent on the current-year dashboard can open Quick Add and log an entry against a goal from 2024, 2025, or any other year. That silently violates the read-only invariant for past-year goals.

## Findings

- **Location:** `src/components/QuickAddModal.tsx:35`
- **Root cause:** No `year === currentYear` filter on the list passed into the modal
- **Agent-native angle:** Automated flows that open Quick Add do not get the same guard as hiding the FAB for non-current year

## Proposed Solutions

### Recommended

Use app data context to filter by the canonical current year:

1. Ensure `useAppData()` exposes `currentYear` (if not already).
2. Replace unfiltered goals with:

```tsx
const goals = (data?.goals ?? []).filter((g) => g.year === currentYear)
```

- **Pros:** Aligns Quick Add with “only current year is writable”; matches Dashboard year scoping
- **Cons:** None for intended product rules
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Quick Add goal list only includes goals for `currentYear`
- [ ] No path through Quick Add can attach entries to past-year goals while the app treats past years as read-only
- [ ] Current-year Quick Add behavior unchanged for valid goals
- [ ] TypeScript compiles with no errors

## Work Log

- **2026-03-30** — Identified during code review of feat: add yearly versioning for goals (P1).
