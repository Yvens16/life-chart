# Life Chart — Goal Progress Tracker

**Date:** 2026-03-14
**Status:** Brainstorm complete

## What We're Building

A personal goal progress tracker that visualizes progress toward life goals using line charts. Users define goals with a starting value and end target, then log entries over time. The app displays progress visually across two views:

1. **Dashboard** (`/`) — All goals displayed as small line charts, grouped by category (Health, Finance, Learning, etc.). X-axis is the current year (Jan–Dec). Clicking a chart navigates to the detail view.

2. **Goal Detail** (`/goal/:id`) — A single goal shown as a week-by-week line chart. Allows closer inspection of short-term progress.

A **quick-add floating button** is accessible from any page, opening a modal to rapidly log a new value for any goal.

## Why This Approach

### Architecture: React Router SPA
- Clean URL-based navigation (`/`, `/goal/:id`)
- Back button works naturally
- Easy to extend with more views later
- Built on the existing Vite + React + TypeScript stack

### Storage: Vite API Route + JSON File
- A small server-side endpoint reads/writes `data.json` on disk
- Works well during development with Vite middleware
- Data is portable (it's just a JSON file)
- Would need a real backend for production deployment

### Charts: Recharts
- React-native, composable, declarative API
- Most popular React charting library
- Great for both small dashboard thumbnails and full detail charts

### Organization: Categories
- Goals grouped by user-defined categories (Health, Finance, Learning, Fitness, etc.)
- Collapsible sections on the dashboard
- Category assigned when creating a goal

## Key Decisions

1. **Bidirectional goals** — Support both decreasing targets (weight 200 → 170) and increasing targets (savings $0 → $10,000). Progress percentage calculated relative to direction.

2. **Two chart views:**
   - Dashboard: yearly overview (Jan–Dec X-axis), small chart cards in a grid
   - Detail: week-by-week view for granular progress

3. **Quick-add modal** — Floating action button always visible. Modal lets you pick a goal, enter a value, and optionally a date (defaults to today).

4. **Local JSON file storage** — Vite dev middleware serves a simple read/write API for `data.json`. No database needed.

5. **10+ goals supported** — Categorized dashboard with collapsible sections handles scale.

6. **Stack:** Vite + React 19 + TypeScript + React Router + Recharts

## Data Model (Conceptual)

```typescript
interface Goal {
  id: string
  name: string
  category: string
  unit: string           // "lbs", "$", "books", etc.
  startValue: number
  targetValue: number
  createdAt: string      // ISO date
  entries: Entry[]
}

interface Entry {
  date: string           // ISO date
  value: number
}

interface AppData {
  goals: Goal[]
  categories: string[]   // user-defined category list
}
```

## Open Questions

_None — all questions resolved during brainstorm._

## Resolved Questions

- **Storage:** Vite API route / middleware with local JSON file
- **Data entry:** Quick-add modal via floating action button
- **Goal direction:** Bidirectional (both increase and decrease toward target)
- **Scale:** 10+ goals, organized by categories with collapsible sections
- **Chart library:** Recharts
- **Architecture:** React Router SPA with client-side routing
