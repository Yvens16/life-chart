---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, quality, dead-code]
dependencies: []
---

# `showSuccess` Is Exported But Never Called — Dead Code

## Problem Statement

`ToastContext.tsx` exports `showSuccess` as part of `ToastContextValue`. Zero call sites exist in the codebase. The function is wired up, wrapped in `useCallback`, included in the context value object, and exported via the hook — but never invoked. This is a YAGNI violation that adds dead weight to an interface that is otherwise minimal and clear.

## Findings

- `ToastContext.tsx` lines 11, 32, 35: `showSuccess` declared in interface, wrapped in `useCallback`, passed as context value
- Simplicity reviewer searched all of `src/` — zero usages of `showSuccess`
- Currently every consumer only destructures `showError`
- The `addToast(message, type)` intermediate is also only needed if `showSuccess` exists

## Proposed Solutions

### Option 1: Remove `showSuccess` (and simplify `addToast`)

**Approach:** Delete `showSuccess` from the interface, the `useCallback`, and the context value. Inline `addToast` into `showError` since it has only one caller.

```tsx
interface ToastContextValue {
  showError: (message: string) => void
}

// no addToast needed
function showError(message: string) {
  const id = ++nextId
  setToasts(prev => [...prev, { id, message, type: 'error' }])
  setTimeout(() => dismiss(id), 5000)
}
```

**Pros:**
- Removes dead interface surface area
- Simplifies the implementation — `addToast` intermediary disappears
- Consumers cannot import a function they don't need

**Cons:**
- If success toasts are needed later, need to re-add

**Effort:** 10 minutes

**Risk:** Low

---

### Option 2: Keep but mark with comment

**Approach:** Add `// unused: add when success confirmation is needed` comment and leave it.

**Pros:**
- Zero churn if success toasts are added soon

**Cons:**
- Dead code ships in production; comment debt

**Effort:** 2 minutes

**Risk:** Low (no functional impact)

---

## Recommended Action

Option 1 — remove `showSuccess`. When a feature genuinely needs success toasts, re-add it at that point with a real call site.

## Technical Details

**Affected files:**
- `src/context/ToastContext.tsx` — remove from interface, useCallback, context value

## Acceptance Criteria

- [ ] `showSuccess` removed from `ToastContextValue` interface
- [ ] `showSuccess` `useCallback` removed
- [ ] `addToast` helper simplified or inlined into `showError`
- [ ] No existing call sites broken (there are none)
- [ ] TypeScript compiles cleanly

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Simplicity reviewer confirmed zero usages via full codebase grep
