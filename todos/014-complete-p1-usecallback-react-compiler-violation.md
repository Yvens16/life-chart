---
status: pending
priority: p1
issue_id: "014"
tags: [code-review, react, react-compiler, quality]
dependencies: []
---

# Manual `useCallback` in ToastContext Contradicts Active React Compiler

## Problem Statement

`ToastContext.tsx` contains four manual `useCallback` wrappers (`dismiss`, `addToast`, `showError`, `showSuccess`). The project's React Compiler (`compound-engineering.local.md`: "React Compiler is active — no manual useMemo/useCallback/React.memo") handles memoization automatically. Manual `useCallback` is redundant noise, creates a brittle four-level dependency chain, and actively misleads future maintainers about whether the Compiler is actually managing this file.

## Findings

- `ToastContext.tsx` lines 20-33: `dismiss`, `addToast`, `showError`, `showSuccess` all wrapped in `useCallback`
- Project constraint documented in `compound-engineering.local.md`: "no manual useMemo/useCallback/React.memo"
- TypeScript reviewer, performance oracle, and simplicity reviewer all independently flagged this
- The chain `dismiss → addToast → showError/showSuccess` means any future dep-array mistake cascades through all four levels
- React Compiler introspects the function body and tracks dependencies automatically — the manual `useCallback` creates double-bookkeeping

## Proposed Solutions

### Option 1: Remove all `useCallback` wrappers

**Approach:** Replace all four `useCallback` calls with plain function declarations (or inline arrow functions). React Compiler handles the rest.

```tsx
// Before
const dismiss = useCallback((id: number) => {
  setToasts(prev => prev.filter(t => t.id !== id))
}, [])

// After
function dismiss(id: number) {
  setToasts(prev => prev.filter(t => t.id !== id))
}
```

**Pros:**
- Consistent with every other component in the codebase
- Removes 4 dependency arrays that must be kept in sync manually
- Shorter, cleaner code

**Cons:**
- None — React Compiler handles referential stability

**Effort:** 10 minutes

**Risk:** Low

---

## Recommended Action

Remove all four `useCallback` wrappers. This is a strict simplification with no functional change — the Compiler produces equivalent output.

## Technical Details

**Affected files:**
- `src/context/ToastContext.tsx` lines 20-33

## Resources

- **PR branch:** `feat/quick-add-entry`
- **Project constraint:** `compound-engineering.local.md` — "React Compiler is active — no manual useMemo/useCallback/React.memo"

## Acceptance Criteria

- [ ] All `useCallback` wrappers removed from `ToastContext.tsx`
- [ ] Functions declared plainly inside `ToastProvider`
- [ ] TypeScript compiles with no errors
- [ ] `useCallback` import removed from `ToastContext.tsx` if no longer used
- [ ] Behavior is unchanged (toasts still auto-dismiss, dismiss works correctly)

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- TypeScript reviewer flagged `useCallback` as violating project constraints
- Performance oracle confirmed Compiler handles this automatically
- Simplicity reviewer confirmed same finding independently
