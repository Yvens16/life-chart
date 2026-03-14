---
title: "feat: Goal Progress Tracker with Line Charts"
type: feat
status: active
date: 2026-03-14
origin: docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md
---

# feat: Goal Progress Tracker with Line Charts

## Overview

Build a personal goal progress tracker that visualizes progress toward life goals using line charts. Users define goals with a starting value and end target, log entries over time, and see progress across two views: a categorized dashboard with yearly overview charts, and a goal detail page with week-by-week granular charts. (see brainstorm: `docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md`)

## Problem Statement

There's no simple, local-first tool to visually track progress across multiple life goals (weight loss, savings, reading, etc.) with clear progress visualization toward defined targets. Existing tools are either too complex, cloud-dependent, or don't provide the at-a-glance dashboard view needed for 10+ goals.

## Proposed Solution

A React SPA with two views:

1. **Dashboard** (`/`) — Grid of small line chart cards grouped by collapsible categories. Yearly X-axis (Jan–Dec). Click any card to drill into detail. Floating action button for quick entry logging.

2. **Goal Detail** (`/goal/:id`) — Full-size week-by-week line chart with target reference line, entry history, and goal management actions (edit/delete goal, edit/delete entries).

Data stored in a local `data.json` file served via Vite dev server middleware.

## Technical Approach

### Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.x |
| Build tool | Vite | 8.x |
| Language | TypeScript | 5.9.x (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`) |
| Routing | react-router | 7.x (declarative mode, import from `"react-router"` — NOT `react-router-dom`) |
| Charts | recharts | 3.x |
| Storage | JSON file via Vite `configureServer` middleware | — |
| Styling | CSS with custom properties + native nesting (existing convention) | — |

### TypeScript Constraints (from repo config)

- **No enums** — use `as const` objects or union types instead
- **`import type` required** for type-only imports (`verbatimModuleSyntax`)
- **No unused variables** — `noUnusedLocals` and `noUnusedParameters` are enabled
- **React Compiler is active** — do NOT use manual `useMemo`, `useCallback`, or `React.memo`

### Architecture

```
src/
  main.tsx                    # Entry point — BrowserRouter wrapping App
  App.tsx                     # Route definitions + layout (nav, FAB)
  App.css                     # Global layout styles
  index.css                   # CSS variables, resets (existing)
  types.ts                    # Goal, Entry, AppData type definitions
  api.ts                      # Fetch helpers (GET/POST /api/data)
  components/
    Dashboard.tsx             # Dashboard view — category sections + chart grid
    Dashboard.css
    GoalDetail.tsx            # Detail view — week chart + entry management
    GoalDetail.css
    GoalCard.tsx              # Small chart card for dashboard grid
    GoalCard.css
    QuickAddModal.tsx         # FAB + modal for logging entries
    QuickAddModal.css
    CreateGoalModal.tsx       # Modal for creating/editing goals
    CreateGoalModal.css
    EmptyState.tsx            # Reusable empty state component
  hooks/
    useAppData.ts             # Data fetching + mutation hook
```

### Data Model

```typescript
// src/types.ts

interface Goal {
  id: string                  // crypto.randomUUID()
  name: string
  category: string
  unit: string                // "lbs", "$", "books", etc.
  startValue: number
  targetValue: number
  createdAt: string           // ISO date string
  entries: Entry[]
}

interface Entry {
  id: string                  // crypto.randomUUID()
  date: string                // ISO date string (YYYY-MM-DD)
  value: number
}

interface AppData {
  goals: Goal[]
  categories: string[]        // user-defined list
}
```

Key decisions on data model:
- Entries get their own `id` for edit/delete targeting
- Multiple entries per date are allowed — chart plots all chronologically
- `categories` array is the master list; categories created inline during goal creation

### API Contract

Single-resource API via Vite `configureServer` middleware:

| Method | Endpoint | Body | Response | Description |
|---|---|---|---|---|
| `GET` | `/api/data` | — | `AppData` JSON | Read all data |
| `POST` | `/api/data` | `AppData` JSON | `{ ok: true }` | Write all data |

Implementation in `vite.config.ts` as a Vite plugin using the `configureServer` hook. Manual JSON body parsing required (Connect middleware, not Express). File path: `./data.json` at project root. If file doesn't exist on first `GET`, return `{ goals: [], categories: [] }`.

### Routing

```tsx
// src/main.tsx
import { BrowserRouter } from "react-router"
// ...
<BrowserRouter><App /></BrowserRouter>

// src/App.tsx
import { Routes, Route } from "react-router"
// ...
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/goal/:id" element={<GoalDetail />} />
</Routes>
```

### Chart Specifications

**Dashboard cards (GoalCard):**
- `ResponsiveContainer` width 100%, height ~80px
- `LineChart` with `Line` only (no axes, grid, tooltip, legend)
- `dot={false}`, `isAnimationActive={false}` for performance
- Stroke color: green if progressing toward target, red if regressing
- Target value shown as dashed `ReferenceLine` (subtle)
- Click handler navigates to `/goal/:id`

**Detail view (GoalDetail):**
- `ResponsiveContainer` width 100%, height 400px
- Full `LineChart` with `XAxis` (weeks), `YAxis`, `CartesianGrid`, `Tooltip`
- `ReferenceLine` for target value (dashed, labeled)
- `ReferenceLine` for start value (dotted, subtle)
- Data aggregated by week — if multiple entries in a week, use the latest value
- Gaps between weeks rendered as connected lines (no interpolation of missing data)

### Progress Calculation

```typescript
function calculateProgress(goal: Goal): number {
  if (goal.entries.length === 0) return 0
  const latest = goal.entries[goal.entries.length - 1].value
  const range = Math.abs(goal.targetValue - goal.startValue)
  if (range === 0) return 100
  const distance = Math.abs(latest - goal.startValue)
  const isCorrectDirection =
    goal.targetValue > goal.startValue
      ? latest >= goal.startValue
      : latest <= goal.startValue
  const progress = isCorrectDirection ? (distance / range) * 100 : 0
  return Math.min(progress, 100) // cap at 100% for display
}
```

- Bidirectional: works for both increase (savings) and decrease (weight) goals
- Progress capped at 100% for textual display; charts extend naturally beyond target
- Regression shows as 0% progress (not negative)

### User Flows (addressing SpecFlow gaps)

**Goal Creation:**
- "+" button on dashboard header opens `CreateGoalModal`
- Fields: name, category (dropdown + "New category" option), unit, start value, target value
- Validation: name required, start !== target, values must be numbers
- On submit: generates UUID, creates goal with empty entries, saves to API

**Goal Editing:**
- Edit button on `GoalDetail` page opens `CreateGoalModal` in edit mode
- Pre-filled with existing goal data
- Can change name, category, unit, target value (not start value — that's historical)

**Goal Deletion:**
- Delete button on `GoalDetail` page with confirmation dialog
- Removes goal from data, navigates back to dashboard
- Category remains in the categories list even if orphaned

**Entry Management (on GoalDetail):**
- Entry list below the chart showing date + value
- Click entry to edit (inline or modal)
- Swipe/button to delete with confirmation
- Entries sorted by date (newest first in list, chronological on chart)

**Empty States:**
- Dashboard with 0 goals: centered message + prominent "Create your first goal" CTA
- Goal detail with 0 entries: chart area shows target line + message "Log your first entry"
- Quick-add with 0 goals: modal shows message "Create a goal first" with link

**Goal Completion:**
- When latest entry meets/exceeds target: checkmark badge on dashboard card
- Goal remains active — entries can still be logged
- No archiving in v1

**Navigation:**
- Back button on GoalDetail header to return to dashboard
- Browser back/forward works naturally via React Router

### Validation Rules

| Field | Rule |
|---|---|
| Goal name | Required, 1-100 characters |
| Category | Required, 1-50 characters |
| Unit | Required, 1-20 characters |
| Start value | Required, finite number |
| Target value | Required, finite number, !== start value |
| Entry value | Required, finite number |
| Entry date | Valid ISO date, defaults to today, no future dates |

## Implementation Phases

### Phase 1: Foundation

Set up routing, data layer, and project structure.

**Tasks:**
- [ ] Install dependencies: `npm install react-router recharts`
- [ ] Create `src/types.ts` with `Goal`, `Entry`, `AppData` type definitions
- [ ] Add Vite API plugin in `vite.config.ts` (`configureServer` with `GET /api/data` and `POST /api/data`)
- [ ] Create seed `data.json` with empty initial structure `{ goals: [], categories: [] }`
- [ ] Create `src/api.ts` with `fetchData()` and `saveData()` helper functions
- [ ] Create `src/hooks/useAppData.ts` — custom hook for loading and mutating app data
- [ ] Update `src/main.tsx` — wrap App in `BrowserRouter`
- [ ] Update `src/App.tsx` — set up `Routes` with `/` and `/goal/:id`, add basic layout shell

**Success criteria:** App loads, routes work, API reads/writes `data.json` correctly.

### Phase 2: Dashboard View

Build the main dashboard with categorized goal cards.

**Tasks:**
- [ ] Create `src/components/Dashboard.tsx` — fetches data, groups goals by category, renders collapsible sections
- [ ] Create `src/components/GoalCard.tsx` — small line chart card with goal name, progress percentage, and sparkline chart
- [ ] Create `src/components/EmptyState.tsx` — reusable empty state with message and optional CTA
- [ ] Style dashboard grid layout (`Dashboard.css`) — responsive card grid, collapsible category headers
- [ ] Style goal cards (`GoalCard.css`) — card styling, hover state, click target
- [ ] Implement category collapse/expand with local state
- [ ] Handle empty dashboard state (0 goals) with "Create your first goal" CTA
- [ ] Wire up card click to navigate to `/goal/:id`

**Success criteria:** Dashboard renders goal cards in category sections, clicking navigates to detail, empty state shows for new users.

### Phase 3: Goal Detail View

Build the detail page with full chart and entry management.

**Tasks:**
- [ ] Create `src/components/GoalDetail.tsx` — full-size week-by-week line chart, back button, goal info header
- [ ] Implement week aggregation logic (group entries by ISO week, use latest value per week)
- [ ] Add `ReferenceLine` for target value and start value
- [ ] Add entry list below chart (date, value, edit/delete actions)
- [ ] Handle empty entries state ("Log your first entry")
- [ ] Handle invalid goal ID (redirect to dashboard)
- [ ] Style detail page (`GoalDetail.css`) — chart container, entry list, header with back nav

**Success criteria:** Detail page shows full chart with weekly data, target line, entry list with management actions.

### Phase 4: Goal CRUD

Add create, edit, and delete operations for goals.

**Tasks:**
- [ ] Create `src/components/CreateGoalModal.tsx` — modal form with all goal fields, category dropdown with "New category" inline creation
- [ ] Add "Create Goal" button to dashboard header
- [ ] Add "Edit Goal" button to GoalDetail page (reuses CreateGoalModal in edit mode)
- [ ] Add "Delete Goal" button to GoalDetail with confirmation dialog
- [ ] Implement form validation per validation rules table
- [ ] Wire all mutations through `useAppData` hook → `POST /api/data`
- [ ] Style modals (`CreateGoalModal.css`)

**Success criteria:** Full CRUD lifecycle for goals — create from dashboard, edit/delete from detail page, all changes persist to data.json.

### Phase 5: Quick-Add Entry Modal

Add the floating action button and entry logging.

**Tasks:**
- [ ] Create `src/components/QuickAddModal.tsx` — FAB + modal with goal picker, value input, optional date picker
- [ ] Position FAB as fixed bottom-right element in App layout
- [ ] Implement goal picker dropdown (searchable if 10+ goals)
- [ ] Default date to today, validate per rules
- [ ] Handle 0 goals state in modal ("Create a goal first")
- [ ] Entry edit/delete actions on GoalDetail entry list
- [ ] Style FAB and modal (`QuickAddModal.css`)

**Success criteria:** FAB always visible, modal opens for quick entry logging, entries appear on charts immediately after save.

### Phase 6: Polish

Visual refinement and edge case handling.

**Tasks:**
- [ ] Add progress percentage display on GoalCard
- [ ] Add completion badge (checkmark) when goal is met
- [ ] Add color coding: green stroke for progressing, red for regressing
- [ ] Add loading states for API calls
- [ ] Add error handling for API failures (toast or inline message)
- [ ] Responsive layout adjustments for mobile screens
- [ ] Dark mode support (extend existing CSS variable pattern)
- [ ] Clean up boilerplate from Vite starter template (remove hero, counter, etc.)

**Success criteria:** App feels polished, handles edge cases gracefully, works on mobile.

## System-Wide Impact

### Interaction Graph

User action → React state update → `POST /api/data` → `data.json` write → re-fetch triggers re-render. All mutations follow the same path: modify the in-memory `AppData` object, save the full object to the API, update React state. No callbacks, observers, or side effects beyond this.

### Error & Failure Propagation

API failures (file write errors, corrupt JSON) surface as fetch errors in `useAppData`. Display inline error messages. No retry logic needed for local file I/O — errors are immediate and deterministic.

### State Lifecycle Risks

**Concurrent writes from multiple tabs:** The single-resource API (read full → modify → write full) can cause data loss if two tabs write simultaneously. Acceptable for a personal single-user app. Mitigation: none in v1.

**Corrupt data.json:** If manually edited and broken, the `GET` endpoint should catch the JSON parse error and return an empty `AppData` structure (or an error response).

### API Surface Parity

Only two endpoints (`GET /api/data`, `POST /api/data`). All CRUD operations happen client-side on the full `AppData` object before posting the whole thing back. Simple but effective for a single-user local app.

## Acceptance Criteria

### Functional Requirements

- [ ] User can create goals with name, category, unit, start value, and target value
- [ ] User can log entries for any goal via the quick-add floating button
- [ ] Dashboard displays all goals as small line charts grouped by collapsible categories
- [ ] Dashboard X-axis shows the current year (Jan–Dec)
- [ ] Clicking a goal card navigates to the detail page
- [ ] Detail page shows a week-by-week line chart with target reference line
- [ ] User can edit and delete goals from the detail page
- [ ] User can edit and delete individual entries from the detail page
- [ ] Bidirectional goals work correctly (both increase and decrease toward target)
- [ ] Data persists across page reloads via `data.json`
- [ ] Empty states are handled for all views (0 goals, 0 entries)

### Non-Functional Requirements

- [ ] Charts render smoothly with 10+ goals on dashboard
- [ ] No manual `useMemo`/`useCallback` (React Compiler handles it)
- [ ] TypeScript strict mode passes with no errors
- [ ] Works in Chrome, Firefox, Safari (latest versions)

## Dependencies & Prerequisites

- `react-router` v7 — client-side routing
- `recharts` v3 — line chart components
- No other new dependencies needed

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Recharts React 19 rendering bug (#6857) | Medium | High | Pin working recharts version; test early in Phase 2 |
| `data.json` corruption from manual editing | Low | High | Catch JSON parse errors, return empty structure |
| Vite middleware not available in production | Certain | Medium | Documented as dev-only; production deploy is a future concern |
| 10+ chart cards slow on dashboard | Low | Medium | `isAnimationActive={false}` + `dot={false}` on thumbnails |

## Future Considerations (Not in v1)

- Data export/import (JSON download/upload)
- Production deployment with real backend
- Goal archiving and history
- Category management UI (rename, delete, reorder)
- Multiple years view / year picker
- Goal templates (common goals with preset units)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md](docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md) — Key decisions carried forward: bidirectional goals, React Router SPA, Recharts, Vite middleware storage, categorized dashboard

### External References

- React Router v7 declarative mode: import from `"react-router"` (not `react-router-dom`)
- Recharts v3 migration guide — `TooltipProps` renamed to `TooltipContentProps`, no `alwaysShow`, rendering order = z-index
- Recharts React 19 issue: GitHub #6857 — monitor for fixes
- Vite `configureServer` hook — pre-middleware pattern, manual JSON body parsing via `req.on('data')`
