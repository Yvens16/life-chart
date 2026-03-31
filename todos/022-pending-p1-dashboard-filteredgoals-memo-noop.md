---
status: pending
priority: p1
issue_id: "022"
tags: [code-review, performance, react]
dependencies: []
---

# Dashboard filteredGoals useMemo Is a No-Op — goals Is New Array Ref Each Render

## Problem Statement

In `Dashboard.tsx`, `goals` is assigned as `(data?.goals ?? []).filter(g => g.year === activeYear)`. That expression produces a **new array reference on every render**. The downstream `filteredGoals` `useMemo` lists `goals` as a dependency, so the dependency always changes when the parent re-renders. The memo never skips recomputation in practice. All `GoalCard` children receive new prop references each render even when underlying server data is unchanged, undermining memoization and adding avoidable work.

## Findings

- **Location:** `src/components/Dashboard.tsx:27-32` (approximate; line numbers may shift)
- `filter` always allocates a new array → unstable `goals` reference
- `useMemo` for `filteredGoals` cannot stabilize children when its primary input (`goals`) is unstable

## Proposed Solutions

### Solution A (preferred): Stabilize `goals`

Wrap the year-filtered list in `useMemo` with dependencies `[data?.goals, activeYear]` so `goals` keeps the same reference when data and year are unchanged.

- **Pros:** Preserves existing `filteredGoals` structure; fixes the root cause
- **Cons:** One extra hook; must keep dependency list accurate
- **Effort:** Small
- **Risk:** Low

### Solution B: Remove redundant `useMemo`

Drop the `filteredGoals` `useMemo` and inline category filtering, e.g. `const filteredGoals = !activeCategory ? goals : goals.filter(g => g.category === activeCategory)`, relying on React Compiler where applicable.

- **Pros:** Less misleading code if memo deps cannot be stabilized
- **Cons:** Does not fix child churn unless `goals` is still stabilized (combine with A if needed)
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Year-filtered `goals` reference is stable across renders when `data?.goals` and `activeYear` are unchanged
- [ ] `filteredGoals` / `GoalCard` props do not churn solely due to new array identity when data is unchanged (verify with React DevTools or compiler output as appropriate)
- [ ] Dashboard behavior and filtering semantics unchanged
- [ ] TypeScript compiles with no errors

## Work Log

- **2026-03-30** — Identified during code review of feat: add yearly versioning for goals (P1).
