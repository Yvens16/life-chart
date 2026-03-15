---
status: pending
priority: p3
issue_id: "012"
tags: [code-review, quality, dead-code, p3]
dependencies: []
---

# Dead console.log in Dashboard Category Empty Button Handler

## Problem Statement

`Dashboard.tsx` line ~141 has a category "Add entry" or similar button that calls `console.log('TODO...')` as its `onClick` handler. This is dead placeholder code left from scaffolding. It ships to users (even in dev mode it pollutes the console), and the button appears functional but does nothing.

**Why it matters:** Users clicking the button see no response. Console pollution in development. Dead `TODO` comments indicate unfinished work.

## Findings

**Location:** `src/components/Dashboard.tsx` ~line 141

```tsx
// CURRENT — dead placeholder
<button onClick={() => console.log('TODO...')}>
  Add entry
</button>

// FIX options:
// 1. Remove button if feature is not ready
// 2. Wire it to the planned QuickAddModal (Phase 5)
// 3. Replace with disabled button + tooltip "Coming soon"
```

**Reported by:** agent-native-reviewer, kieran-typescript-reviewer

## Proposed Solutions

### Option A: Remove button until QuickAddModal (Phase 5) is built
Simply delete the dead button for now.
- **Pros:** Clean, no dead UI
- **Cons:** Feature not accessible until Phase 5
- **Effort:** Trivial
- **Risk:** Low

### Option B: Wire to GoalDetail navigation (interim solution)
Navigate to the goal detail page on click — user can add entry there.
- **Pros:** Functional immediately, no dead UI
- **Cons:** Less convenient than a quick-add modal
- **Effort:** Small
- **Risk:** Low

### Option C: Disabled button with "Coming soon" tooltip
Keep button visible but disabled.
- **Pros:** Shows intent, no dead handler
- **Cons:** Creates expectation for a feature not yet built
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/Dashboard.tsx`
- **Line:** ~141
- **Related:** Phase 5 — QuickAddModal

## Acceptance Criteria

- [ ] No `console.log('TODO')` calls remain in production/dev code
- [ ] Button either works, is removed, or is visually disabled with a tooltip
- [ ] No console pollution when user interacts with Dashboard

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: agent-native-reviewer, kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- Plan: `docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md` — Phase 5 (QuickAddModal)
