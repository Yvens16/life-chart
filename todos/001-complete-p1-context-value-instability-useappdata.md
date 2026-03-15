---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, performance, architecture, react]
dependencies: []
---

# Context Value Instability — useAppData Returns New Object Every Render

## Problem Statement

`useAppData` returns a plain object literal `{ data, loading, error, mutate, ... }` on every render. Since `AppDataContext.Provider` receives this as `value`, React sees a new object reference every time any state changes — defeating React Compiler's memoization across all 4 context consumers (`Dashboard`, `GoalDetail`, `CreateGoalModal`, and App-level components). Every single state change causes all 4 consumers to re-render completely.

**Why it matters:** React Compiler can memoize components that consume stable context values. With an unstable value, all consumers re-render on every mutation (e.g., adding an entry re-renders the entire Dashboard including all GoalCards, even those unrelated to the mutated goal).

## Findings

**Location:** `src/hooks/useAppData.ts` — return statement at end of hook

```typescript
// CURRENT — new object every render
return {
  data, loading, error,
  mutate, updateGoals, updateCategories,
  addGoal, updateGoal, deleteGoal,
  addEntry, updateEntry, deleteEntry,
  refetch,
}

// FIX — stable reference when data/loading/error unchanged
return useMemo(() => ({
  data, loading, error,
  mutate, updateGoals, updateCategories,
  addGoal, updateGoal, deleteGoal,
  addEntry, updateEntry, deleteEntry,
  refetch,
}), [data, loading, error])
```

Note: mutation functions (mutate, addGoal, etc.) are defined inside the hook but should be stable (defined with stable closures over state setters). Only `data`, `loading`, and `error` change over time.

**Reported by:** kieran-typescript-reviewer, performance-oracle

## Proposed Solutions

### Option A: useMemo on return value (Recommended)
Wrap the returned object in `useMemo` depending on `[data, loading, error]`.
- **Pros:** Minimal change, stable value when state unchanged, aligns with React Compiler intent
- **Cons:** Mutation functions must not close over stale state (use functional setState pattern)
- **Effort:** Small
- **Risk:** Low

### Option B: Split context into DataContext + MutationsContext
Separate stable mutations from changing data into two contexts.
- **Pros:** Components that only call mutations never re-render on data changes
- **Cons:** More complex, two contexts to manage
- **Effort:** Medium
- **Risk:** Medium

### Option C: useReducer + dispatch pattern
Replace useState with useReducer so dispatch is always stable.
- **Pros:** Dispatch is referentially stable by spec
- **Cons:** Full rewrite of hook logic
- **Effort:** Large
- **Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/hooks/useAppData.ts`, `src/context/AppDataContext.tsx`
- **Components affected:** `Dashboard.tsx`, `GoalDetail.tsx`, `CreateGoalModal.tsx`

## Acceptance Criteria

- [ ] `useAppData` return value has stable object reference when `data`, `loading`, and `error` are unchanged
- [ ] Adding an entry to goal A does not cause GoalCard for goal B to re-render
- [ ] TypeScript compiles without errors
- [ ] React Compiler does not emit memoization warnings

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: kieran-typescript-reviewer, performance-oracle.

## Resources

- PR: current branch (life-chart)
- React docs: https://react.dev/reference/react/useMemo#memoizing-a-value
- React Compiler docs: https://react.dev/learn/react-compiler
