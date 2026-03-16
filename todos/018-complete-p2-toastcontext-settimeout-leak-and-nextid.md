---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, memory-leak, react, quality]
dependencies: ["014"]
---

# ToastContext: `setTimeout` Not Cleaned Up + `nextId` at Module Scope

## Problem Statement

Two related issues in `ToastContext.tsx`:

1. `setTimeout` return values are never stored or cancelled. If `ToastProvider` unmounts while a toast is pending, the callback fires and calls `setToasts` on an unmounted component, producing a React dev warning (and wasted work in production).

2. `let nextId = 0` lives at module scope — a mutable singleton. In strict mode dev, repeated mounting/unmounting of the provider means the counter never resets. In test environments, this leaks counter state between test cases.

## Findings

- `ToastContext.tsx` line 26: `setTimeout(() => dismiss(id), 5000)` — handle not stored, cannot be cancelled
- `ToastContext.tsx` line 1 (module scope): `let nextId = 0` — shared mutable state across component instances
- Performance oracle: `ToastProvider` wraps the entire app so unmount-while-pending is unlikely in normal use, but the pattern is still wrong
- TypeScript reviewer: recommends storing handles in a `useRef<Map<number, ReturnType<typeof setTimeout>>>` and clearing on unmount
- Security reviewer: module-level `nextId` is an architectural smell that leaks state in tests and SSR contexts

## Proposed Solutions

### Option 1: Move `nextId` into `useRef` and track timer handles

**Approach:** Replace module-level `nextId` with a `useRef`, and store timer handles in a `useRef<Map>`. Clear all timers on unmount via `useEffect` cleanup.

```tsx
const nextId = useRef(0)
const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

function dismiss(id: number) {
  clearTimeout(timers.current.get(id))
  timers.current.delete(id)
  setToasts(prev => prev.filter(t => t.id !== id))
}

function addToast(message: string, type: Toast['type']) {
  const id = ++nextId.current
  setToasts(prev => [...prev, { id, message, type }])
  const timer = setTimeout(() => {
    timers.current.delete(id)
    dismiss(id)
  }, 5000)
  timers.current.set(id, timer)
}

useEffect(() => {
  return () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }
}, [])
```

**Pros:**
- Correct lifecycle behavior
- Timer IDs are encapsulated to the component instance
- `dismiss` can optionally cancel early (clicking ×) rather than waiting for timeout
- No state leaks between test cases or component instances

**Cons:**
- ~10 extra lines

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Ignore (document the limitation)

**Approach:** Add a comment explaining that `ToastProvider` is a singleton wrapping the entire app and will never realistically unmount during normal use.

**Pros:**
- Zero code change

**Cons:**
- Pattern is wrong and will cause test environment issues
- Comment debt

**Effort:** 2 minutes

**Risk:** Low (for production), Medium (for test suites)

---

## Recommended Action

Option 1. The fix is clean and correct. Bonus: it allows the × dismiss button to also cancel the pending timer, so clicking × immediately prevents the redundant timer callback. This should be done after todo #014 (remove useCallback) so the functions are plain declarations when the timer refs are added.

## Technical Details

**Affected files:**
- `src/context/ToastContext.tsx` — add `nextId` ref, `timers` ref, `useEffect` cleanup

**Dependency:** Resolve #014 (remove useCallback) first so this refactor starts from plain functions.

## Acceptance Criteria

- [ ] `nextId` moved from module scope into `useRef` inside `ToastProvider`
- [ ] Timer handles stored in `useRef<Map<number, ReturnType<typeof setTimeout>>>`
- [ ] `useEffect` cleanup cancels all pending timers on unmount
- [ ] `dismiss` clears the timer handle when called early (× button)
- [ ] TypeScript compiles cleanly

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- TypeScript reviewer flagged both issues
- Security reviewer independently flagged module-level `nextId`
- Performance oracle confirmed provider scope makes this low urgency in production
