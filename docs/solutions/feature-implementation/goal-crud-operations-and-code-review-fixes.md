---
title: "Goal CRUD Operations + 12-Issue Code Review Resolution"
category: feature-implementation
date: 2026-03-15
tags:
  - react
  - typescript
  - vite
  - data-integrity
  - performance
  - date-handling
  - atomicity
  - code-review
  - goal-tracking
component: "Goal Progress Tracker (Full Stack)"
problem_type: "Feature implementation + multi-issue code review resolution"
related_docs:
  - docs/solutions/configuration-errors/vite-configureserver-plugin-architecture.md
  - docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md
---

## Context

The life-chart goal progress tracker needed goal CRUD operations (create, read, update, delete), a goal detail view, and a create/edit modal. After implementation, a code review surfaced 12 issues across three severity levels (P1 critical, P2 important, P3 nice-to-have). All were resolved in one commit.

This document captures both the feature implementation patterns and the code review lessons so they don't have to be re-learned.

---

## Features Implemented

### Goal Detail View (`13aa20d`)

- `GoalDetail.tsx`: Full-height line chart (400px) with dual reference lines (target + start value)
- `CreateGoalModal.tsx`: Shared form for create and edit modes, determined by `goal` prop
- `weekAggregation.ts`: Groups entries by ISO week (YYYY-Www), uses latest entry per week, handles out-of-order entries

### Goal Update & Delete (`dad9136`)

- Edit/Delete buttons on GoalCard and GoalDetail
- Delete confirmation dialog
- Propagation stopping to prevent accidental navigation (`e.stopPropagation()`)

---

## Code Review Fixes (`e410589`)

### P1 — Critical

#### 1. Context Value Instability

**Symptom:** All 4 context consumers re-render on every unrelated state change.

**Root cause:** `useAppData` returned a new object literal on every render, defeating React Compiler memoization.

**Fix:**
```typescript
// In useAppData.ts
return useMemo(
  () => ({ data, loading, error, mutate, createGoal, updateGoal, deleteGoal }),
  [data, loading, error]  // mutation fns are stable via closure
)
```

#### 2. Progress Calculation Using Array Index

**Symptom:** Progress badge and chart show divergent values after editing older entries or adding entries out-of-order.

**Root cause:** `calculateProgress` used `goal.entries[goal.entries.length - 1]` (last by insertion order), not latest by date.

**Fix:**
```typescript
// In src/utils/progress.ts
const latest = goal.entries.reduce((a, b) =>
  a.date.localeCompare(b.date) > 0 ? a : b
).value
```

**Rule:** Never assume entries are sorted by date. Always use `reduce()` to find the latest.

#### 3. Infinity Corruption in Entry Edits

**Symptom:** Saving entries with `Infinity`/`-Infinity` silently stores `null` (JSON can't represent Infinity), corrupting data.

**Root cause:** `isNaN(Infinity)` returns `false`, so the check passed. `JSON.stringify(Infinity)` → `null`.

**Fix:**
```typescript
if (!Number.isFinite(value)) {
  setEditError('Please enter a valid finite number')
  return
}
```

**Rule:** Always use `Number.isFinite()` for numeric user inputs, never `isNaN()`.

#### 4. Non-Atomic File Writes

**Symptom:** Process crash during `fs.writeFile` leaves `data.json` partially written and unrecoverable.

**Fix — write to temp, then atomic rename:**
```typescript
const tmpPath = dataFilePath + '.tmp'
fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
fs.renameSync(tmpPath, dataFilePath)  // atomic POSIX syscall
```

`fs.rename` on the same filesystem is atomic — the file either has the old content or the new content, never a partial write.

---

### P2 — Important

#### 5. Silent Error Swallowing in `readDataFile`

**Root cause:** `catch` block returned empty state for all errors, hiding file permission issues and JSON corruption.

**Fix:**
```typescript
} catch (err) {
  const nodeErr = err as NodeJS.ErrnoException
  if (nodeErr.code === 'ENOENT') {
    return { goals: [], categories: [] }  // expected: first run
  }
  throw err  // re-throw EACCES, SyntaxError, disk errors
}
```

#### 6. Missing `goalsByCategory` Memoization

**Root cause:** Category grouping (O(goals × categories)) recomputed on every render, including modal open/close.

**Fix:**
```typescript
const goalsByCategory = useMemo(() => {
  const result: Record<string, Goal[]> = {}
  gs.forEach(goal => {
    if (!result[goal.category]) result[goal.category] = []
    result[goal.category]!.push(goal)
  })
  return result
}, [data])  // only recompute when data changes
```

#### 7. Always-Mounted Modal Instances

**Root cause:** Both modals rendered as `<CreateGoalModal open={false} />`, wasting memory and holding stale state.

**Fix:**
```typescript
{createModalOpen && (
  <CreateGoalModal open onClose={() => setCreateModalOpen(false)} />
)}
{editModalOpen && editingGoal && (
  <CreateGoalModal open onClose={handleCloseEditModal} goal={editingGoal} />
)}
```

Mount-on-demand also eliminates stale-state bugs where deleted goal data lingered in edit modal.

#### 8. `startValue` Immutability Not Enforced at API

**Root cause:** POST `/api/data` accepted any mutation, including changing `startValue` on existing goals, corrupting historical baselines.

**Fix — validate in `vite.config.ts` plugin:**
```typescript
const existingGoalMap = new Map(existing.goals.map(g => [g.id, g]))
for (const goal of parsed.goals) {
  const prev = existingGoalMap.get(goal.id)
  if (prev && prev.startValue !== goal.startValue) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: `Cannot change startValue of "${goal.name}"` }))
    return
  }
}
```

#### 9. Missing Date Validation

**Root cause:** Entry dates not validated for format or calendar validity — empty string or `"2026-02-30"` could be stored.

**Fix:**
```typescript
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (!dateRegex.test(editDate)) {
  setEditError('Date is required (YYYY-MM-DD)')
  return
}
const parsed = new Date(editDate + 'T00:00:00')
if (isNaN(parsed.getTime())) {
  setEditError('Invalid date — please enter a real calendar date')
  return
}
```

#### 10. Missing YAxis Domain on Sparkline

**Root cause:** RechartsYAxis auto-scaled to entry values only; if all entries clustered near start, the target reference line fell outside the visible range.

**Fix:**
```typescript
function buildYAxisDomain(goal: Goal): [number, number] {
  const allValues = [goal.startValue, goal.targetValue, ...goal.entries.map(e => e.value)]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const padding = (max - min) * 0.1 || 1
  return [min - padding, max + padding]
}
// Apply as domain prop on a hidden YAxis
```

---

### P3 — Nice to Have

#### 11. UTC Timezone Off-by-One

**Root cause:** `new Date('2026-03-15')` parses as UTC midnight, then displays as the previous day for users in UTC-negative timezones.

**Fix — parse as local midnight:**
```typescript
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}
```

Use this helper everywhere a `YYYY-MM-DD` string is turned into a `Date` for display.

#### 12. Sort Allocating Date Objects per Comparison

**Root cause:** `entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())` creates 2 × O(n log n) Date objects.

**Fix — ISO-8601 is lexicographically sortable:**
```typescript
entries.sort((a, b) => a.date.localeCompare(b.date))
```

---

## Design Decisions

### Why `useMemo` in context hook instead of `useCallback` + `useRef`?

React Compiler is active in this project. It handles individual values well but can't stable-ize composite objects. One `useMemo` on the return object is the right signal to the compiler.

### Why single-resource POST (send all data, not a patch)?

Eliminates merge logic complexity and partial-update bugs. Acceptable for a single-user local app with no concurrent writers. The atomic rename ensures consistency.

### Why weekly aggregation on dashboard instead of daily?

Dashboard shows a yearly X-axis (Jan–Dec). 365 daily points creates visual noise. Weekly aggregation (ISO weeks, latest entry per week) balances detail and readability. Full daily granularity is preserved on the goal detail page.

### Why `localeCompare` for date string sorting?

ISO-8601 `YYYY-MM-DD` is lexicographically equivalent to chronological order. No Date allocation needed. Faster at scale (100+ entries).

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/Dashboard.tsx` | Memoize grouping, conditional modal mount, fix dead category button |
| `src/components/GoalCard.tsx` | Hidden YAxis domain, `parseLocalDate`, `localeCompare` sort |
| `src/components/GoalDetail.tsx` | `Number.isFinite`, date format + calendar validation, inline errors, `parseLocalDate` |
| `src/context/AppDataContext.tsx` | `useMemo` on context value return |
| `src/utils/progress.ts` | `reduce()` for latest-by-date instead of array index |
| `src/utils/weekAggregation.ts` | `parseLocalDate` for timezone fix |
| `vite.config.ts` | Atomic write, deep validation, `startValue` immutability check, re-throw non-ENOENT |

---

## Prevention Checklist

For every new feature that touches data or UI in this repo:

- [ ] Numeric inputs validated with `Number.isFinite()`, not `isNaN()`
- [ ] Date strings validated with regex + calendar parse
- [ ] Date parsed for display via `parseLocalDate(dateStr)` (append `T00:00:00`)
- [ ] Dates sorted with `localeCompare`, not `new Date()` comparisons
- [ ] Any "latest entry" lookup uses `reduce()`, not array index
- [ ] Context values returning composite objects wrapped in `useMemo`
- [ ] Expensive derivations (`useMemo([data])`) not recomputed on UI-only state changes
- [ ] Modals conditionally mounted (`{open && <Modal />}`), not always rendered with `open={false}`
- [ ] File writes use atomic temp-then-rename pattern
- [ ] File read errors re-throw non-ENOENT
- [ ] Immutable fields (e.g., `startValue`) validated at API layer, not just in UI
- [ ] YAxis domain on Recharts charts includes all reference line values + padding

---

## Related

- `docs/solutions/configuration-errors/vite-configureserver-plugin-architecture.md` — Earlier review resolving Vite plugin architecture, CORS, TypeScript catch typing
- `docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md` — Full implementation plan; Phases 5-6 still pending
