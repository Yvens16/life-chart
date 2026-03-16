---
status: pending
priority: p3
issue_id: "020"
tags: [code-review, quality, polish]
dependencies: []
---

# P3 Polish: Misc Small Fixes from Code Review

## Problem Statement

A collection of small code quality issues identified during review that don't individually warrant their own todo file.

## Findings

### 1. Double import of `QuickAddModal.css` in `App.tsx`

`src/App.tsx` line 7 imports `'./components/QuickAddModal.css'` directly. `QuickAddModal.tsx` also imports the same file. With Vite, the bundler deduplicates but it's semantically confusing — the FAB button in App.tsx needs the `.fab` CSS class, but the import should live where the component CSS lives. After extracting `modal.css` (todo #016), re-evaluate this: `.fab` styles should either stay in `QuickAddModal.css` (imported by `QuickAddModal.tsx`) or move to `App.css`.

### 2. `SEARCHABLE_THRESHOLD` magic number

`QuickAddModal.tsx` line 131: `goals.length >= 10` — a hardcoded threshold that controls a significant UX mode switch (text input vs `<select>`). A named constant at the top of the file makes it discoverable and changeable in one place.

```ts
const SEARCHABLE_THRESHOLD = 10
// ...
{goals.length >= SEARCHABLE_THRESHOLD ? <SearchableDropdown /> : <Select />}
```

### 3. Loading states missing `aria-busy`

Dashboard and GoalDetail loading states render `<div className="dashboard-loading">` / `<div className="goal-detail-loading">` with a spinner but no `aria-busy="true"` or `role="status"`. Screen readers won't announce the loading state.

```tsx
<div className="dashboard-loading" aria-busy="true" role="status">
  <div className="spinner" aria-hidden="true" />
  <span>Loading your goals...</span>
</div>
```

### 4. `localeCompare` in `buildChartData` sort

`GoalCard.tsx` line 24: `a.date.localeCompare(b.date)` for sorting ISO-8601 `YYYY-MM-DD` strings. ISO dates sort correctly with direct string comparison — `localeCompare` triggers locale-aware collation which is heavier and unnecessary here.

```ts
// Before
.sort((a, b) => a.date.localeCompare(b.date))

// After
.sort((a, b) => a.date < b.date ? -1 : 1)
```

### 5. Future-date validation should also live in `addEntry`

`QuickAddModal` blocks future dates in the UI. The underlying `addEntry` in `useAppData` has no such check — an agent or programmatic caller can insert future-dated entries freely. Move the validation to `addEntry` so it applies regardless of caller (or at minimum add a comment explaining why it's UI-only).

## Proposed Solutions

Fix each independently. All are small (5-10 minute) changes.

## Recommended Action

Address all five in a single small PR or as part of the next polish pass. None block the current branch from merging.

## Technical Details

**Affected files:**
- `src/App.tsx` line 7 — remove direct CSS import (after #016)
- `src/components/QuickAddModal.tsx` line 131 — extract constant
- `src/components/Dashboard.tsx` loading div — add aria-busy
- `src/components/GoalDetail.tsx` loading div — add aria-busy
- `src/components/GoalCard.tsx` line 24 — replace localeCompare
- `src/context/AppDataContext.tsx` (or `src/hooks/useAppData.ts`) — consider adding date validation to `addEntry`

## Acceptance Criteria

- [ ] `QuickAddModal.css` no longer directly imported by `App.tsx`
- [ ] `SEARCHABLE_THRESHOLD = 10` constant defined and used
- [ ] Loading divs have `aria-busy="true"` and `role="status"`; spinner has `aria-hidden="true"`
- [ ] `buildChartData` sort uses direct string comparison
- [ ] Future-date guard documented (or moved) in `addEntry`

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Simplicity reviewer flagged double import and magic number
- TypeScript reviewer flagged missing aria attributes
- Performance oracle flagged localeCompare
- Agent-native reviewer flagged future-date validation gap
