---
status: pending
priority: p2
issue_id: "028"
tags: [code-review, architecture, agent-native]
dependencies: []
---

# Single-Goal "Copy Forward" Silently Locks targetValue — Breaks Acceptance Criteria

## Problem Statement

The dashboard `handleCopyForward` path calls `carryForwardGoal(goal, goal.targetValue)` with no UI for the user to change the new year's target (or start). The feature plan's acceptance criteria include letting the user adjust `targetValue` and `startValue`. `NewYearModal` exposes editable targets for bulk carry-forward; after the one-time new-year modal is dismissed, the per-goal GoalCard action becomes the main way to carry goals forward, and it does not offer that adjustment — so the product behavior is inconsistent with the stated criteria and with agent-native parity (no structured way to set a new target in that flow).

## Findings

- `src/components/Dashboard.tsx` lines 92–95: copy-forward uses the source goal's `targetValue` only.
- No confirmation or edit step; user cannot set a different target without editing after the fact (if that is even exposed).
- Contrasts with `NewYearModal`, where targets are editable before carry-forward.

## Proposed Solutions

- **Solution A:** Open a lightweight sheet or dialog with an editable target (and start if required) before committing carry-forward from the card.
- **Solution B:** Reuse `NewYearModal` (or shared form) in a "single goal" mode so one goal gets the same UX as bulk carry-forward.
- **Solution C (stopgap):** Toast copy such as "Goal copied — edit it to adjust the target" plus ensure post-copy editing exists and is discoverable.

Pick one primary approach; prefer A or B for criteria alignment.

## Acceptance Criteria

- [ ] User can set or adjust `targetValue` (and `startValue` if required by plan) on the GoalCard copy-forward path, OR an approved stopgap documents discoverable post-copy editing.
- [ ] Behavior matches plan acceptance criteria for adjustable targets on carry-forward.
- [ ] Agent/automation can perform the same adjustment (fields exposed in the same UI path).

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
