---
title: "Goal Yearly Versioning — Year-Scoped Goals with Carry-Over"
date: 2026-03-30
category: feature-implementation
tags:
  - react
  - typescript
  - data-model
  - state-management
  - ui-pattern
problem_type: logic-errors
components:
  - src/types.ts
  - src/hooks/useAppData.ts
  - src/components/Dashboard.tsx
  - src/components/GoalCard.tsx
  - src/components/GoalDetail.tsx
  - src/components/NewYearModal.tsx
  - src/utils/goalChain.ts
  - vite.config.ts
symptoms:
  - "Goals persisted forever with no year boundary"
  - "No way to set different yearly targets"
  - "No cross-year progress comparison"
  - "No historical data separation"
related_plans:
  - docs/plans/2026-03-30-001-feat-goal-yearly-versioning-plan.md
---

# Goal Yearly Versioning — Year-Scoped Goals with Carry-Over

**Commit:** `74f8dfd feat: add yearly versioning for goals`  
**Plan:** [docs/plans/2026-03-30-001-feat-goal-yearly-versioning-plan.md](../plans/2026-03-30-001-feat-goal-yearly-versioning-plan.md)

---

## Problem

Goals lived in a single undifferentiated list with no calendar-year ownership. The app could not treat each year as its own set of instances, roll prior years forward cleanly, or show history as a chain across years without overloading one goal's entries. A goal like "Read 20 books" persisted unchanged forever — no way to set a different target for a new year, compare year-over-year, or keep historical progress separate.

---

## Root Cause

The `Goal` type had no `year` field; all goals were globally visible regardless of when they were created. No concept of "active year" existed in UI state, so the dashboard couldn't scope what it showed. No backward-pointer mechanism existed for linking a goal to its prior-year version.

---

## Solution

Implemented across 5 implementation phases, touching 8 files.

### Phase 1 — Type Changes + API Validator Update

Each goal is scoped to a calendar year and can point at the prior-year row it was copied from. App state tracks whether the new-year prompt was already handled.

```ts
// src/types.ts
export interface Goal {
  id: string
  name: string
  category: string
  unit: string
  startValue: number
  targetValue: number
  createdAt: string
  year: number          // NEW — required calendar year integer
  linkedGoalId?: string // NEW — optional backward pointer to prior-year source
  entries: Entry[]
}

export interface AppData {
  goals: Goal[]
  categories: string[]
  promptShownForYear?: number // NEW — tracks first-load carry-over prompt display
}
```

`vite.config.ts` `isValidGoal` was updated atomically with the type changes to require `year` and allow optional `linkedGoalId`.

### Phase 2 — `activeYear` State + Year Picker

`activeYear` defaults to `new Date().getFullYear()` and is exposed with `setActiveYear`. `availableYears` is a memoized union of `currentYear` and every `g.year` in `data.goals`, sorted descending, so the picker always includes the live year even before any goals exist for it.

```ts
// src/hooks/useAppData.ts
const availableYears = useMemo(() => {
  const years = new Set<number>([currentYear])
  if (data) for (const g of data.goals) years.add(g.year)
  return [...years].sort((a, b) => b - a)
}, [data, currentYear])
```

Dashboard filters the flat `data.goals` list by `activeYear`:

```ts
// src/components/Dashboard.tsx
const goals = (data?.goals ?? []).filter(g => g.year === activeYear)
```

### Phase 3 — Read-Only Mode for Past Years

When `activeYear < currentYear`, the Dashboard hides the "New Goal" button and Quick Add FAB, omits `onEdit`/`onDelete` from `GoalCard` props, and shows a "Copy to [currentYear]" button instead. GoalDetail derives `isCurrentYear` from `activeYear === currentYear` — **note:** this is a known follow-up bug (see todos/021); the correct check should be `goal.year === currentYear` to guard against direct-URL navigation.

### Phase 4 — New Year Carry-Over Modal

On first app load in a new calendar year, the hook computes whether there are last-year goals and whether the prompt has already been shown:

```ts
// src/hooks/useAppData.ts
const hasLastYearGoals = result.goals.some(g => g.year === currentYear - 1)
const promptNeeded = result.promptShownForYear !== currentYear && hasLastYearGoals

if (promptNeeded) {
  const updated: AppData = { ...result, promptShownForYear: currentYear }
  saveData(updated).catch(/* log only */)
  setData(updated)
  setShowNewYearPrompt(true)
}
```

`promptShownForYear` is written **immediately** (before user interaction) so the modal never re-appears on refresh, even if the user dismisses without carrying anything over.

`NewYearModal` is a Dialog-based modal with a per-goal checklist (all pre-selected) and editable `targetValue` inputs. Each row is keyed by `goal.id` for stable DOM identity:

```tsx
{lastYearGoals.map(goal => (
  <li key={goal.id} className="flex flex-col gap-3 py-4">
    {/* checkbox + target input */}
  </li>
))}
```

`carryForwardGoal` creates a new goal with `year: currentYear`, `linkedGoalId: source.id`, and empty `entries`:

```ts
async function carryForwardGoal(source: Goal, targetValue: number) {
  const newGoal: Goal = {
    id: crypto.randomUUID(),
    name: source.name,
    category: source.category,
    unit: source.unit,
    startValue: source.startValue,
    targetValue,
    createdAt: new Date().toISOString(),
    year: currentYear,
    linkedGoalId: source.id,
    entries: [],
  }
  await addGoal(newGoal)
  setActiveYear(currentYear)
}
```

### Phase 5 — Cross-Year History Table in GoalDetail

`buildGoalChain` walks `linkedGoalId` backward via a `Map` of ids, stopping on missing ids, revisits, or `MAX_CHAIN_DEPTH = 50` to prevent cycles. Returns oldest-first:

```ts
// src/utils/goalChain.ts
export function buildGoalChain(goal: Goal, allGoals: Goal[]): Goal[] {
  const byId = new Map(allGoals.map(g => [g.id, g]))
  const chain: Goal[] = [goal]
  const seen = new Set<string>([goal.id])
  let current = goal
  while (chain.length < MAX_CHAIN_DEPTH) {
    if (!current.linkedGoalId) break
    const prev = byId.get(current.linkedGoalId)
    if (!prev || seen.has(prev.id)) break
    seen.add(prev.id)
    chain.unshift(prev)
    current = prev
  }
  return chain
}
```

`getFinalEntryValue` returns the `value` of the entry with the latest ISO date string (using `localeCompare`). History table columns: Year | Target | Final Value | Progress %.

---

## Known Issues Found During Code Review

These P1–P3 bugs were identified after landing and are tracked as todos:

| ID | Priority | Issue |
|----|----------|-------|
| 021 | P1 | GoalDetail read-only bypass — `isCurrentYear` uses `activeYear` not `goal.year`; direct URL navigation bypasses read-only |
| 022 | P1 | Dashboard `filteredGoals` `useMemo` is a no-op — `goals` is a new array ref every render |
| 023 | P1 | QuickAddModal shows all years' goals, not filtered by `activeYear` |
| 024 | P1 | Fire-and-forget `saveData` race condition — async mutate not awaited |
| 025 | P2 | `availableYears` computed in forbidden `useMemo` (React Compiler project) |
| 026 | P2 | `carryForwardGoals` uses parallel arrays instead of unified objects |
| 027 | P2 | `getFinalValue` duplicated between `NewYearModal` and `goalChain.ts` |
| 028 | P2 | Copy-forward silently locks target year without user-visible rollback |
| 029 | P2 | `migrate-year` produces `NaN` on invalid `createdAt` |
| 030 | P2 | Carry-forward duplicate goal construction path |
| 031 | P2 | `currentYear` missing from `useMemo` deps |
| 032 | P2 | No recovery path after carry-forward modal failure |
| 033 | P3 | GoalCard copy-forward `currentYear` coupling |
| 034 | P3 | `computeProgressPercent` narrow type |
| 035 | P3 | GoalDetail `allGoals` impossible null |
| 036 | P3 | Year picker shows single option for new users |
| 037 | P3 | Dead guard for `lastYearGoals` in App |
| 038 | P3 | `goalChain` `unshift` quadratic pattern |
| 039 | P3 | Validator has no bounds on year value |
| 040 | P3 | `window.confirm` blocks agents |

---

## Prevention Strategies

### Read-Only Mode — Entity vs UI State

Treat **year on the entity** as the authority for "can edit," not UI picker state. `activeYear` is for layout and navigation; **all mutation guards must check `goal.year !== currentYear`** (or equivalent entity-level check). If users can deep-link, reconcile URL → selected year → entity year and block edits when they diverge.

> **Lesson from todo 021:** `isCurrentYear = activeYear === currentYear` is only safe if the picker is always kept in sync with the route. It is not safe in a direct-URL navigation scenario.

### Data Migration / Backfill

Parse dates defensively — never assume `createdAt` is valid ISO. Define fallback behavior for `Invalid Date` (e.g. default to `currentYear`, not `NaN`). Make backfills idempotent: a second pass must be a no-op.

### Async Save Race Conditions

"Fire-and-forget" `saveData` is unsafe when navigation or a second save can run before the first finishes. Prefer awaiting the mutation in the code path that owns the transition. Surface failures with visible errors; avoid silent side effects.

### React Compiler Compatibility

Assume the compiler will memoize derived values. Avoid manual `useMemo`/`useCallback`/`React.memo` unless project rules explicitly permit them. Dependency bugs in manual memos hide when over-memoizing.

### Cross-Component Year Propagation

Keep one semantic source of truth for "which year is the app about" (context/store). Filter lists **at the boundary** — every goal list, quick-add modal, and dashboard should receive year-scoped data or filter explicitly. Avoid parallel arrays for paired data.

---

## Checklist for Future Temporal Versioning Features

- [ ] **Read-only:** All edit/mutate paths check **entity year**, not only picker/context state
- [ ] **Lists/modals:** Every goal list filtered by context year unless intentionally showing all
- [ ] **Memoization:** Derived lists use stable inputs; no memo that always invalidates; compiler rules respected
- [ ] **Saves:** Critical transitions `await` or queue persistence; stale in-flight writes cannot win
- [ ] **Migration:** Invalid timestamps handled; backfill idempotent; no `NaN` years in storage
- [ ] **Carry-forward:** Single construction path for duplicated logic; failures have recover path and visible errors
- [ ] **Algorithms:** Avoid repeated `unshift`/full copies on hot paths; prefer append + reverse

---

## Related Documentation

### Existing Solution Docs

- [`docs/solutions/feature-implementation/goal-crud-operations-and-code-review-fixes.md`](./goal-crud-operations-and-code-review-fixes.md) — Goal CRUD, React state/memoization patterns, modal mount pattern, `vite.config.ts` validation, TypeScript patterns
- [`docs/solutions/configuration-errors/vite-configureserver-plugin-architecture.md`](../configuration-errors/vite-configureserver-plugin-architecture.md) — Vite `configureServer` plugin pattern, TypeScript strict catch typing, stale-closure patterns in hooks

### Related Plans

- [`docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md`](../plans/2026-03-14-001-feat-goal-progress-tracker-plan.md) — Foundation: Dashboard, GoalDetail, modals, `useAppData`, Vite middleware
- [`docs/plans/2026-03-17-001-feat-dashboard-grid-filter-plan.md`](../plans/2026-03-17-001-feat-dashboard-grid-filter-plan.md) — Dashboard grid + category filter; `activeCategory`/`filteredGoals` state pattern (same product area)
- [`docs/plans/2026-03-30-001-feat-goal-yearly-versioning-plan.md`](../plans/2026-03-30-001-feat-goal-yearly-versioning-plan.md) — Full feature plan for this implementation

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `linkedGoalId` direction | Backward pointer only | Simpler writes; chain walkable via Map lookups |
| `startValue` on carry-over | Inherited verbatim | User sets new `targetValue`; `startValue` immutability is per-id |
| `promptShownForYear` timing | Written before user interacts | Prevent infinite re-display; acceptable trade-off if save fails |
| `activeYear` persistence | React state only (resets on load) | Always open to current year; past years are on-demand |
| Chain depth guard | `MAX_CHAIN_DEPTH = 50` | Safety against circular `linkedGoalId` references |
| Carry-over batching | One `mutate` call for N goals | Reduces race conditions vs. sequential `addGoal` per goal |
