---
status: pending
priority: p2
issue_id: "031"
tags: [code-review, react]
dependencies: []
---

# currentYear Missing From useAppData Return useMemo Deps — Stale Value Across Midnight

## Problem Statement

The object returned from `useAppData` is wrapped in `useMemo` whose dependency list includes `data`, `loading`, `error`, `activeYear`, `availableYears`, `showNewYearPrompt`, but not `currentYear`. The returned value exposes `currentYear`. If the calendar rolls from Dec 31 to Jan 1 without any of the listed dependencies changing, consumers can keep seeing the previous `currentYear` until something else triggers a re-render — plausible for a personal app left open across midnight.

## Findings

- `src/hooks/useAppData.ts` lines 206–232: return `useMemo` omits `currentYear` from the dependency array.
- `currentYear` is part of the returned API; stale closure risk if it is computed outside the memo or derived from time.

## Proposed Solutions

Add `currentYear` to the return `useMemo` dependency array so when `currentYear` updates, the returned context/value updates. If `currentYear` is itself derived inside the hook, ensure the derivation runs on relevant ticks (e.g. same source as `currentYear` updates) and the memo lists every value from the hook scope that is included in the returned object.

## Acceptance Criteria

- [ ] `currentYear` is listed in the return `useMemo` dependency array (or the memo is removed in favor of compiler-friendly patterns consistent with project rules).
- [ ] After a date boundary change, consumers receive updated `currentYear` without requiring an unrelated state change.
- [ ] No regressions to other returned fields.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
