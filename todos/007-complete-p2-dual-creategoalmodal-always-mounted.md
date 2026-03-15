---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, performance, react, memory]
dependencies: ["001"]
---

# Both CreateGoalModal Instances Always Mounted — Wasted Context Subscriptions

## Problem Statement

`Dashboard.tsx` renders two `<CreateGoalModal>` instances (one for create, one for edit) unconditionally — both are always mounted in the DOM. Each instance subscribes to `AppDataContext`, holds its own form state (16+ state slots), and renders a hidden modal. This doubles the context subscription count and keeps 32+ state values alive at all times, even when neither modal is ever opened.

**Why it matters:** Every context update (e.g., adding an entry) notifies both mounted modals even when they're not visible. For a modal that's only used occasionally, this is pure waste. Conditional rendering is the React idiom for this.

## Findings

**Location:** `src/components/Dashboard.tsx`

```tsx
// CURRENT — both always mounted
return (
  <>
    {/* ... all dashboard content ... */}
    <CreateGoalModal
      isOpen={createModalOpen}
      onClose={() => setCreateModalOpen(false)}
    />
    <CreateGoalModal
      isOpen={!!editingGoal}
      goal={editingGoal ?? undefined}
      onClose={() => setEditingGoal(null)}
    />
  </>
)

// FIX — only mount when needed
return (
  <>
    {/* ... all dashboard content ... */}
    {createModalOpen && (
      <CreateGoalModal
        isOpen
        onClose={() => setCreateModalOpen(false)}
      />
    )}
    {editingGoal && (
      <CreateGoalModal
        isOpen
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
      />
    )}
  </>
)
```

Note: Conditional rendering unmounts the modal on close, resetting form state for free — no need for `useEffect` cleanup.

**Reported by:** performance-oracle, kieran-typescript-reviewer

## Proposed Solutions

### Option A: Conditional JSX rendering (Recommended)
Wrap both `<CreateGoalModal>` in `{condition && <Modal />}`.
- **Pros:** React idiom, free form state reset on close, fewer context subscriptions
- **Cons:** Loses CSS transition animations (modal can't fade out after unmount)
- **Effort:** Small
- **Risk:** Low

### Option B: Keep mounted but use React.memo + stable props
Keep both mounted, wrap CreateGoalModal in React.memo, pass stable callbacks.
- **Pros:** Preserves potential close animation
- **Cons:** Still subscribes to context, more complex
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/components/Dashboard.tsx`
- **State slots saved:** ~16 useState hooks × 2 modal instances = 32 state slots unmounted

## Acceptance Criteria

- [ ] Only one or zero `CreateGoalModal` instances are mounted at any time
- [ ] Create modal opens with empty form, closes and resets correctly
- [ ] Edit modal opens pre-filled with goal data, closes and resets correctly
- [ ] No regressions in create/edit functionality

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agents: performance-oracle, kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- React docs: https://react.dev/learn/conditional-rendering
