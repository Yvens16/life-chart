---
status: pending
priority: p1
issue_id: "013"
tags: [code-review, performance, react, context]
dependencies: []
---

# ToastContext Returns New Object on Every Render — Unnecessary Consumer Re-renders

## Problem Statement

`ToastProvider` constructs a new `{ showError, showSuccess }` object literal on every render and passes it as the context value. Because object identity changes on every render, every component that calls `useToast()` (currently Dashboard, GoalDetail, CreateGoalModal, QuickAddModal) re-renders whenever any toast is added or dismissed — even though `showError` and `showSuccess` themselves have not changed. This is the same bug that was previously hit and fixed in `useAppData` (see `todos/001-complete-p1-context-value-instability-useappdata.md`).

## Findings

- `ToastContext.tsx` line 35: `<ToastContext value={{ showError, showSuccess }}>` — the object literal is recreated every render
- `useAppData` hook (already fixed) wraps its return in `useMemo` to prevent this exact pattern
- Every toast add triggers a `setToasts` state update, which re-renders `ToastProvider`, which creates a new context value object, which re-renders all 4 consumers
- Every 5-second auto-dismiss fires the same cascade again
- Learnings researcher confirmed this is a known P1 pattern in this codebase

## Proposed Solutions

### Option 1: Wrap context value in `useMemo`

**Approach:** Stabilize the context value object with `useMemo([showError, showSuccess])`.

```tsx
const contextValue = useMemo(
  () => ({ showError, showSuccess }),
  [showError, showSuccess]
)

return (
  <ToastContext value={contextValue}>
    {children}
    {/* toast list */}
  </ToastContext>
)
```

**Pros:**
- Consistent with the existing `useAppData` pattern in this codebase
- Context consumers only re-render when the functions themselves change (essentially never)
- One-line fix

**Cons:**
- None for this scale

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Split into actions context + state context

**Approach:** Separate `{ showError, showSuccess }` (stable) from `{ toasts }` (volatile) into two contexts. Components rendering toasts subscribe to the volatile context; all other consumers subscribe to the stable actions context.

**Pros:**
- Architecturally cleanest — zero re-renders on consumers that only call `showError`
- Scales well as more components consume the toast actions

**Cons:**
- More code than necessary for 4 consumers
- Over-engineered for current app size

**Effort:** 1 hour

**Risk:** Low

---

## Recommended Action

Apply Option 1 immediately. This is a one-line fix that matches the existing `useAppData` pattern. Option 2 is a future optimization only if consumer count grows significantly.

## Technical Details

**Affected files:**
- `src/context/ToastContext.tsx` lines 33-40 — return JSX with context value

**Related components:**
- Dashboard.tsx — calls `useToast()`
- GoalDetail.tsx — calls `useToast()`
- CreateGoalModal.tsx — calls `useToast()`
- QuickAddModal.tsx — calls `useToast()`

**Prior art in codebase:**
- `src/context/AppDataContext.tsx` — uses `useMemo` on returned context value (already fixed pattern)

## Resources

- **Related todo:** `todos/001-complete-p1-context-value-instability-useappdata.md` (same bug, already fixed in AppDataContext)
- **PR branch:** `feat/quick-add-entry`

## Acceptance Criteria

- [ ] `ToastContext` value is wrapped in `useMemo`
- [ ] `useToast()` consumers do not re-render when a toast is added/dismissed
- [ ] TypeScript compiles with no errors

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Performance oracle flagged context value object identity issue
- Learnings researcher found identical P1 bug in `useAppData` (already resolved)
- TypeScript reviewer confirmed `useCallback` chain does not help — the object literal still recreates

**Learnings:**
- Any context provider that passes an object literal as value must stabilize it with `useMemo`
- This is a recurring pattern risk whenever new contexts are added
