---
title: Dashboard Grid Layout with Category Filter
type: feat
status: completed
date: 2026-03-17
---

# Dashboard Grid Layout with Category Filter

## Overview

Redesign the main dashboard page to display all goal cards in a unified grid, replacing the current collapsible category sections with a category filter bar. Users can click a filter pill to see only goals from that category, or view all goals at once.

## Problem Statement / Motivation

The current dashboard groups goals into collapsible category sections (Health, Finance, etc.). This creates friction:
- Users must expand/collapse sections to browse goals
- There is no way to see all goals side-by-side in a single scan
- The category headers take visual space without adding much value

A grid + filter approach is more efficient: all cards are visible by default, and category filtering is a lightweight one-click operation.

## Proposed Solution

Replace `Dashboard.tsx`'s category-grouped sections with:
1. **A filter bar** — a row of pill/chip buttons: "All" + one per category. Clicking a pill sets the active filter.
2. **A flat grid** — all `GoalCard` components rendered in a responsive CSS grid. The active filter controls which cards are shown.

No routing changes. No data model changes. Pure UI refactor of `Dashboard.tsx`.

## Technical Considerations

### Architecture Impacts

- `Dashboard.tsx` is the only component that needs to change significantly.
- The `collapsedCategories` state (a `Set<string>`) can be removed entirely.
- Replace with a single `activeCategory: string | null` state — `null` means "All".
- The `goalsByCategory` useMemo can be simplified to a filtered flat array.

### Component Breakdown

**Filter Bar** (can live inline in `Dashboard.tsx` or as a small sub-component `CategoryFilter.tsx`):
- Renders "All" pill + one pill per category from `appData.categories`
- Highlights the active pill
- Only renders if there is more than one category (or always, for consistency)

**Grid Layout** (replaces the map over `goalsByCategory`):
- Use CSS Grid via Tailwind: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Renders filtered goals flat — no section wrappers
- Empty state when no goals match the active filter

### State Changes in `Dashboard.tsx`

```typescript
// Before
const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

// After
const [activeCategory, setActiveCategory] = useState<string | null>(null)
```

```typescript
// Before — goalsByCategory: Record<string, Goal[]>
const goalsByCategory = useMemo(() => {
  const map: Record<string, Goal[]> = {}
  for (const goal of appData.goals) {
    if (!map[goal.category]) map[goal.category] = []
    map[goal.category].push(goal)
  }
  return map
}, [appData.goals])

// After — filteredGoals: Goal[]
const filteredGoals = useMemo(() => {
  if (!activeCategory) return appData.goals
  return appData.goals.filter(g => g.category === activeCategory)
}, [appData.goals, activeCategory])
```

### Performance

No concerns — the existing data set is small (< 50 goals is typical). The useMemo filter is O(n).

### Accessibility

- Filter pills should be `<button>` elements with `aria-pressed` to indicate active state.
- The grid should maintain existing keyboard focus behavior from `GoalCard`.

## Acceptance Criteria

- [x] All goal cards appear in a responsive grid on the main page (no category section wrappers)
- [x] A filter bar is displayed above the grid with "All" and one pill per category
- [x] Clicking a category pill filters the grid to show only goals from that category
- [x] The active filter pill is visually highlighted
- [x] Clicking "All" (or the active category again) resets to showing all goals
- [x] Empty state is shown when no goals exist (existing `EmptyState` component)
- [x] Collapsible category section logic is removed
- [x] No regression on create/edit/delete goal functionality
- [x] Responsive layout works on mobile (1 col), tablet (2 col), desktop (3 col)

## Files to Modify

### `src/components/Dashboard.tsx`
- Remove `collapsedCategories` state and toggle logic
- Remove `goalsByCategory` useMemo
- Add `activeCategory` state
- Add `filteredGoals` useMemo
- Replace category section rendering with flat grid + filter bar

### New (optional): `src/components/CategoryFilter.tsx`
- Props: `categories: string[]`, `active: string | null`, `onChange: (cat: string | null) => void`
- Renders "All" pill + category pills
- Can be inlined in `Dashboard.tsx` if simple enough

## Dependencies & Risks

- **No dependencies** — purely a UI change to an existing component.
- **Risk:** If a user had many goals all in one category and relied on sections, the grid will feel denser. Mitigation: the filter allows per-category focus.
- The `collapsedCategories` state removal is safe — it was purely local UI state, not persisted.

## Sources & References

### Internal References

- Main component to modify: `src/components/Dashboard.tsx:1-168`
- Goal card component: `src/components/GoalCard.tsx:1-116`
- Types: `src/types.ts`
- Existing grid pattern (within category sections): `src/components/Dashboard.tsx:118-159`

### Related Work

- Origin brainstorm: `docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md` — originally specified "collapsible sections"; this plan supersedes that UX decision in favor of a flat grid + filter.
- Existing plan: `docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md`
