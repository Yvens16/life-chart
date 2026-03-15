---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, performance, react, memoization]
dependencies: ["001"]
---

# goalsByCategory Recomputed on Every Dashboard Render Without useMemo

## Problem Statement

In `Dashboard.tsx`, `goalsByCategory` is computed by filtering and grouping `data.goals` inside the component body without `useMemo`. Even though React Compiler may hoist some computations, this expensive grouping (iterating all goals for each category) runs on every render — including renders triggered by unrelated state changes like modal open/close.

**Why it matters:** Once context value instability (todo 001) is fixed, the Dashboard still re-renders when data changes. For users with many goals across many categories, recomputing the grouped structure on every render is wasteful. With React Compiler active, adding `useMemo` is the correct signal.

## Findings

**Location:** `src/components/Dashboard.tsx`

```typescript
// CURRENT — recomputed every render
const goalsByCategory = categories.map(cat => ({
  category: cat,
  goals: goals.filter(g => g.categoryId === cat.id),
}))

// FIX — memoized on goals + categories
const goalsByCategory = useMemo(
  () => categories.map(cat => ({
    category: cat,
    goals: goals.filter(g => g.categoryId === cat.id),
  })),
  [categories, goals],
)
```

Note: With React Compiler's `babel-plugin-react-compiler`, it *may* already be memoizing this — but explicit `useMemo` is the cleaner signal and guarantees correct behavior regardless of compiler version.

**Reported by:** performance-oracle

## Proposed Solutions

### Option A: Add useMemo with [categories, goals] deps (Recommended)
Single `useMemo` wrapper around the existing expression.
- **Pros:** Explicit, readable, guaranteed memoization
- **Cons:** React Compiler may warn about manual memo (but this is a data transform, not a component, so it's fine)
- **Effort:** Small
- **Risk:** Low

### Option B: Rely entirely on React Compiler
Trust the compiler to memoize derived values automatically.
- **Pros:** Zero code change
- **Cons:** Implicit, harder to reason about, may change across compiler versions
- **Effort:** None
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/Dashboard.tsx`
- **Complexity:** O(categories × goals) per render

## Acceptance Criteria

- [ ] `goalsByCategory` reference is stable when `goals` and `categories` arrays are unchanged
- [ ] Opening/closing a modal does not recompute `goalsByCategory`
- [ ] TypeScript compiles without errors

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agent: performance-oracle.

## Resources

- PR: current branch (life-chart)
