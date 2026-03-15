---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, timezone, date-handling, p3]
dependencies: []
---

# new Date(dateStr) Parses YYYY-MM-DD as UTC Midnight — Wrong Day in Negative UTC-Offset Timezones

## Problem Statement

Several places in the codebase use `new Date(dateStr)` where `dateStr` is a `YYYY-MM-DD` ISO date string. Per spec, date-only ISO strings are parsed as UTC midnight (`2024-03-15T00:00:00Z`). For users in UTC-5 (US Eastern), this results in `2024-03-14T19:00:00` local time — the *previous day*. Week calculations and display labels will be off by one day for users west of UTC.

**Why it matters:** A user in New York adding an entry for March 15 would see it appear in the chart under March 14. Week aggregation would place it in the wrong week for any entry added on a Monday (Monday would appear in the previous week).

## Findings

**Affected locations:**

1. `src/utils/weekAggregation.ts`:
```typescript
// CURRENT
const date = new Date(entry.date)  // UTC midnight → wrong day for UTC-

// FIX — force local time interpretation
const date = new Date(entry.date + 'T00:00:00')
```

2. `src/components/GoalDetail.tsx` — any `new Date(entry.date)` for display formatting:
```typescript
// Same fix: new Date(entry.date + 'T00:00:00')
```

**Reported by:** kieran-typescript-reviewer

## Proposed Solutions

### Option A: Append T00:00:00 when constructing Date from YYYY-MM-DD (Recommended)
Simple string concatenation forces local time interpretation per spec.
- **Pros:** Zero-dependency fix, correct behavior, MDN-recommended approach
- **Cons:** Slightly verbose — could extract to utility
- **Effort:** Small
- **Risk:** Low

### Option B: Create a parseLocalDate(dateStr) utility function
```typescript
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}
```
- **Pros:** DRY, documents intent, easy to find all date parsing sites
- **Cons:** Extra file
- **Effort:** Small
- **Risk:** Low

### Option C: Use date-fns parseISO
`parseISO` from date-fns parses YYYY-MM-DD as local time.
- **Pros:** Well-tested library, handles edge cases
- **Cons:** Adds dependency for a one-liner fix
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/utils/weekAggregation.ts`, `src/components/GoalDetail.tsx`
- **Spec reference:** ECMA-262: date-only strings (no time component) are UTC; date-time strings default to local time
- **Affected users:** All users in UTC-1 through UTC-12 (Americas, Pacific)

## Acceptance Criteria

- [ ] An entry with date `"2024-03-15"` displays as March 15 in US Eastern timezone
- [ ] Week aggregation places Monday entries in the correct week for UTC-5 users
- [ ] No regressions for UTC+ timezone users

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agent: kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#date_string_form
- ECMA-262 date parsing: date-only → UTC, date-time → local
