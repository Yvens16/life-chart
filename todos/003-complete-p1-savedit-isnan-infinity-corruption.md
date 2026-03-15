---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, bug, data-integrity, validation]
dependencies: []
---

# saveEdit Uses isNaN — Allows Infinity Into Entry Data, Serializes to null

## Problem Statement

`saveEdit` in `GoalDetail.tsx` validates the entry value with `isNaN(value)`. However, `isNaN(Infinity)` returns `false` — meaning `Infinity` and `-Infinity` pass validation and are stored as entry values. When the JSON file is serialized (`JSON.stringify`), `Infinity` becomes `null`, corrupting the entry silently. The user sees their data saved successfully but the value stored is `null`.

**Why it matters:** Silent data corruption. The user edits an entry, sees it "saved", but the actual stored value is `null`. The chart breaks, progress calculations throw or show NaN, and there's no error message.

## Findings

**Location:** `src/components/GoalDetail.tsx` — `saveEdit` function

```typescript
// CURRENT — isNaN allows Infinity through
const value = parseFloat(editValue)
if (isNaN(value)) {
  setEditError('Please enter a valid number')
  return
}

// FIX — Number.isFinite rejects Infinity, -Infinity, and NaN
if (!Number.isFinite(value)) {
  setEditError('Please enter a valid number')
  return
}
```

**Secondary issue in same function:** No date format validation before calling `updateEntry`. An empty string or `"2024-13-45"` will be stored as the entry date.

```typescript
// Add date validation:
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (!dateRegex.test(editDate)) {
  setEditError('Date must be in YYYY-MM-DD format')
  return
}
const parsed = new Date(editDate + 'T00:00:00')
if (isNaN(parsed.getTime())) {
  setEditError('Invalid date')
  return
}
```

**Reported by:** security-sentinel, kieran-typescript-reviewer

## Proposed Solutions

### Option A: Replace isNaN with Number.isFinite + add date regex (Recommended)
Two targeted line changes in saveEdit.
- **Pros:** Minimal, correct, covers both issues
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Option B: Zod schema validation
Parse entry shape through Zod before calling updateEntry.
- **Pros:** Reusable, composable, matches server-side validation pattern
- **Cons:** Adds Zod dependency (or reuse if already present)
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/GoalDetail.tsx`
- **Function:** `saveEdit`
- **JSON.stringify behavior:** `Infinity` → `null`, `NaN` → `null` (both silently corrupt)

## Acceptance Criteria

- [ ] Entering `Infinity` or `1e999` in the value field shows validation error
- [ ] Entering `-Infinity` in the value field shows validation error
- [ ] Entering an empty date shows validation error
- [ ] Entering `2024-13-45` (invalid calendar date) shows validation error
- [ ] Valid entries (finite number, valid date) save correctly
- [ ] No `null` values appear in stored entry data

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: security-sentinel, kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
- JSON.stringify spec: `Infinity` and `NaN` serialize to `null`
