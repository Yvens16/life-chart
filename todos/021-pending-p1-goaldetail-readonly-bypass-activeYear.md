---
status: pending
priority: p1
issue_id: "021"
tags: [code-review, architecture, react]
dependencies: []
---

# GoalDetail Read-Only Bypass — isCurrentYear Uses activeYear Not goal.year

## Problem Statement

In `GoalDetail.tsx`, `isCurrentYear` is derived as `activeYear === currentYear`. `activeYear` resets to `currentYear` on every full page load. Direct URL navigation to a past-year goal (`/goal/:id`) therefore leaves `activeYear === currentYear` even when the loaded goal belongs to a past year. Edit, Delete, and entry-mutation controls stay enabled for past-year goals. The read-only invariant for historical goals is bypassed entirely via direct URL.

## Findings

- **Location:** `src/components/GoalDetail.tsx:45`
- **Current behavior:** `const isCurrentYear = activeYear === currentYear`
- `goal` is already narrowed non-null at this point in the component; `goal.year` reflects the actual goal’s calendar year
- Dashboard-driven navigation may keep `activeYear` aligned with the list, but bookmarked or shared URLs do not

## Proposed Solutions

### Recommended

Change the check to use the goal’s year:

```tsx
const isCurrentYear = goal.year === currentYear
```

- **Pros:** Single source of truth for “is this goal editable?” tied to the goal entity, not UI navigation state
- **Cons:** None meaningful; `goal` is in scope and non-null
- **Effort:** Trivial
- **Risk:** Low

## Acceptance Criteria

- [ ] `isCurrentYear` is derived from `goal.year === currentYear` (or equivalent logic that cannot be true for past-year goals when viewing a past-year goal by URL)
- [ ] Past-year goals opened via `/goal/:id` show read-only UI (no Edit/Delete/entry mutations)
- [ ] Current-year goals remain fully editable
- [ ] TypeScript compiles with no errors

## Work Log

- **2026-03-30** — Identified during code review of feat: add yearly versioning for goals (P1).
