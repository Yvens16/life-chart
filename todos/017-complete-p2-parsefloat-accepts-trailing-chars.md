---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, security, validation, quality]
dependencies: []
---

# `parseFloat` Silently Accepts Trailing Non-Numeric Characters in Entry Validation

## Problem Statement

`QuickAddModal`'s validation uses `parseFloat(value)` then checks `isNaN()`. But `parseFloat("3.14abc")` returns `3.14` — `isNaN` passes, and `3.14` is stored as the entry value. The user typed something invalid, receives no error, and the stored value silently differs from what they entered. The same pattern likely exists in `CreateGoalModal.tsx` for `startValue` and `targetValue`.

## Findings

- `QuickAddModal.tsx` lines 50-57: `parseFloat` then `isNaN` check — fails to reject `"3.14abc"`
- Security reviewer: `parseFloat("3.14abc") === 3.14` — `isNaN` returns `false`, validation passes
- `CreateGoalModal.tsx` lines 69-74: same `parseFloat` + `isNaN` pattern used for `startValue` and `targetValue` (appears 4 times)
- The `<input type="number">` browser control prevents most user entry of trailing chars, but programmatic form submission or autofill can bypass it
- The fix is to validate the string before parsing, not after

## Proposed Solutions

### Option 1: Use `Number()` instead of `parseFloat()`

**Approach:** Replace `parseFloat(value)` with `Number(value.trim())`. `Number("3.14abc")` returns `NaN`, so the existing `isNaN` check then correctly rejects it.

```ts
// Before
const numValue = parseFloat(value)
if (isNaN(numValue)) { ... }

// After
const numValue = Number(value.trim())
if (isNaN(numValue)) { ... }
```

**Pros:**
- One-character change per call site
- `Number()` is strict — rejects trailing characters, empty strings become `NaN`
- No regex required

**Cons:**
- `Number("")` returns `0`, not `NaN` — but the empty check `value.trim() === ''` runs first, so this is safe in the existing validation order

**Effort:** 15 minutes (QuickAddModal + CreateGoalModal)

**Risk:** Low

---

### Option 2: Add regex pre-validation

**Approach:** Test the string with `/^-?\d+(\.\d+)?$/.test(value.trim())` before parsing.

**Pros:**
- Explicit and self-documenting
- Works with `parseFloat` unchanged

**Cons:**
- More verbose; regex is harder to read at a glance
- Does not handle scientific notation (`1e5`) which `Number()` handles

**Effort:** 20 minutes

**Risk:** Low

---

## Recommended Action

Option 1 — replace `parseFloat` with `Number`. Apply to both `QuickAddModal.tsx` and `CreateGoalModal.tsx` validation logic.

## Technical Details

**Affected files:**
- `src/components/QuickAddModal.tsx` lines 50, 90 — value parsing in validate() and handleSubmit()
- `src/components/CreateGoalModal.tsx` lines 69-74 — startValue and targetValue parsing

**Note:** `handleSubmit` in QuickAddModal also calls `parseFloat(value)` after validation passes (line 90). Replace there too, or extract the parsed value from validate() and thread it through.

## Acceptance Criteria

- [ ] `parseFloat` replaced with `Number(value.trim())` in all validation paths in QuickAddModal
- [ ] Same fix applied to CreateGoalModal for startValue and targetValue
- [ ] Input `"3.14abc"` correctly shows validation error
- [ ] Input `"3.14"` still passes validation
- [ ] Input `"-5"` still passes validation (negative values allowed)

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Security reviewer identified `parseFloat("3.14abc")` passes `isNaN` check
- Confirmed same pattern in CreateGoalModal
