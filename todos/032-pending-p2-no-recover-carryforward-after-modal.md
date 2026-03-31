---
status: pending
priority: p2
issue_id: "032"
tags: [code-review, architecture, agent-native]
dependencies: []
---

# No Recoverable UI Path to carryForwardGoals After New-Year Modal Is Dismissed

## Problem Statement

Bulk `carryForwardGoals` (custom targets for many goals) is only invoked from `NewYearModal`. After `promptShownForYear` is persisted for the current calendar year, the modal does not show again. If the user dismissed it or skipped bulk setup, the only remaining carry-forward path is the single-goal control on each card, which uses `carryForwardGoal` and does not offer the same bulk, per-target UX — and may lock targets per related todo 028. There is no durable CTA to reopen bulk carry-forward from the empty dashboard or settings.

## Findings

- `src/App.tsx`: modal visibility tied to new-year prompt / year state; no second entry point documented for bulk carry-forward.
- `src/components/Dashboard.tsx`: empty state does not offer "carry over from last year" when the current year has no goals but the prior year does.
- Agents and users lack a stable, discoverable action equivalent to the first-run modal.

## Proposed Solutions

Add a persistent call to action when appropriate, e.g. "Set up [currentYear] goals" or "Carry over from [priorYear]" on the empty state for the active year when prior-year goals exist and current-year goals are empty. Wire it to open a dedicated modal or reuse `NewYearModal` in a mode that calls `carryForwardGoals` without requiring the one-time prompt flag to be unset.

## Acceptance Criteria

- [ ] Users can open bulk carry-forward (or equivalent UX) after dismissing the initial new-year modal, when prior-year goals exist and current year is empty (or other product-defined conditions).
- [ ] Same capability is reachable without hidden-only state (agent-native: one clear UI path).
- [ ] Does not reset or corrupt `promptShownForYear` semantics unless product intentionally allows "show again".

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
