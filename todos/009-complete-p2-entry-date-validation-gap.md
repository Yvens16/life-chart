---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, validation, data-integrity, ux]
dependencies: []
---

# Entry Date Field Accepts Empty String and Non-YYYY-MM-DD Formats

## Problem Statement

The entry date input in `GoalDetail.tsx` (`saveEdit`) and any other entry creation form accepts arbitrary strings as dates. An empty string, `"not-a-date"`, or `"03/15/2024"` (US format) can be saved as an entry date. Since the app relies on lexicographic string comparison for date ordering (`e.date > max.date`), non-ISO dates silently break all sorting and progress calculations.

**Why it matters:** The week aggregation, chart x-axis, and `calculateProgress` all depend on ISO-8601 `YYYY-MM-DD` string comparison being valid. A single bad date string breaks chart rendering for the entire goal.

## Findings

**Location:** `src/components/GoalDetail.tsx` — `saveEdit` function

```typescript
// CURRENT — no date validation
await updateEntry(goalId, {
  ...editingEntry,
  date: editDate,  // editDate could be "" or "not-a-date"
  value: value,
})

// FIX — validate before save
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (!dateRegex.test(editDate)) {
  setEditError('Date must be in YYYY-MM-DD format (e.g. 2024-03-15)')
  return
}
// Also verify it's a real calendar date (not 2024-02-30)
const parsed = new Date(editDate + 'T00:00:00')
if (isNaN(parsed.getTime())) {
  setEditError('Invalid date — please enter a real calendar date')
  return
}
```

**Also check:** Any other entry creation path (QuickAddModal when built, Phase 5).

**Reported by:** security-sentinel, kieran-typescript-reviewer

## Proposed Solutions

### Option A: Regex + Date parse validation in saveEdit (Recommended)
Two additional checks before calling `updateEntry`.
- **Pros:** Fast, no dependency, inline with existing validation pattern
- **Cons:** Duplicated if other entry creation paths exist
- **Effort:** Small
- **Risk:** Low

### Option B: Shared `validateEntryDate(dateStr: string): string | null` utility
Extract to `src/utils/validation.ts`, reuse in all forms.
- **Pros:** DRY, single source of truth for date validation rules
- **Cons:** Slightly more setup
- **Effort:** Small
- **Risk:** Low

### Option C: Use `<input type="date">` HTML element
Browser enforces valid date selection via native date picker.
- **Pros:** Zero validation code needed, UX is clear
- **Cons:** Native date picker styling varies by OS/browser, may conflict with design
- **Effort:** Small
- **Risk:** Low (but UX risk)

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/GoalDetail.tsx`
- **ISO-8601 format:** `YYYY-MM-DD` — required by all date comparison logic in the app
- **Edge case:** Leap year dates (2024-02-29 valid, 2023-02-29 invalid)

## Acceptance Criteria

- [ ] Saving an entry with empty date string shows validation error
- [ ] Saving an entry with `"not-a-date"` shows validation error
- [ ] Saving an entry with `"03/15/2024"` (US format) shows validation error
- [ ] Saving an entry with `"2024-02-30"` (impossible date) shows validation error
- [ ] Saving an entry with `"2024-03-15"` succeeds
- [ ] Error message is user-friendly and explains expected format

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: security-sentinel, kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- ISO-8601: https://www.iso.org/iso-8601-date-and-time-format.html
