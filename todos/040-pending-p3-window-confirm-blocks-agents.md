---
status: pending
priority: p3
issue_id: "040"
tags: [code-review, agent-native, quality]
dependencies: []
---

# window.confirm() for Delete Confirmations Blocks Browser Automation Agents

## Problem Statement

`Dashboard.tsx` and `GoalDetail.tsx` use native `window.confirm()` for delete confirmations. Native dialogs are awkward or impossible to drive reliably in headless automation without special hooks. A Radix `AlertDialog` (already available via the project’s dialog stack) renders in the DOM, is automatable, and aligns with the rest of the UI. A prior code review flagged the same pattern.

## Findings

- **Locations:** `src/components/Dashboard.tsx:62-65`; `src/components/GoalDetail.tsx` (`handleDeleteGoal`, `handleDeleteEntry`)
- `dialog.tsx` / AlertDialog primitives exist in the component library
- Agent-native parity: any destructive action a user can confirm should be confirmable through the same UI surface in automation

## Proposed Solutions

Replace `window.confirm` with inline Radix `AlertDialog` confirmation flows:

- Conditionally mount the dialog when a delete is requested; confirm proceeds with existing delete handlers; cancel closes without action
- Reuse existing button and typography patterns from nearby screens

## Acceptance Criteria

- [ ] No `window.confirm` for goal or entry deletion in `Dashboard.tsx` and `GoalDetail.tsx`
- [ ] Delete flows use `AlertDialog` (or equivalent in-project modal) with clear confirm/cancel actions
- [ ] Keyboard and focus behavior matches Radix defaults (trap focus, restore on close)
- [ ] Manual smoke test: delete goal and delete entry still work; automation can target confirm by role/label

## Work Log

- _None yet_
