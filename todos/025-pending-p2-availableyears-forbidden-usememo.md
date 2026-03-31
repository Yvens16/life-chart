---
status: pending
priority: p2
issue_id: "025"
tags: [code-review, react]
dependencies: []
---

# availableYears Uses Forbidden useMemo — React Compiler Convention Violated

## Problem Statement

`useAppData.ts` introduces `const availableYears = useMemo(...)`. The project rule is to avoid manual `useMemo`, `useCallback`, and `React.memo` because React Compiler handles memoization. The yearly versioning plan also states explicitly that no `useMemo` is needed for this derivation. Keeping `useMemo` here violates convention, misleads maintainers, and duplicates what the compiler already optimizes.

## Findings

- `src/hooks/useAppData.ts` lines 195–201: `availableYears` is wrapped in `useMemo`.
- Project guidance: React Compiler is active; manual memoization hooks are forbidden.
- Plan document (`feat: add yearly versioning for goals`): "No useMemo needed (React Compiler handles it)" for equivalent logic.

## Proposed Solutions

Remove the `useMemo` wrapper and compute `availableYears` as a plain derived value (e.g. inline computation from `data` / goals) so behavior stays identical while aligning with compiler-first conventions. Drop the `useMemo` import if it becomes unused in this file.

## Acceptance Criteria

- [ ] `availableYears` is no longer wrapped in `useMemo` in `useAppData.ts`.
- [ ] Derived years match previous behavior for the same `data`.
- [ ] No new manual `useMemo`/`useCallback`/`React.memo` added for this path.
- [ ] TypeScript compiles cleanly; unused React imports removed if applicable.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
