---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, css, quality, architecture]
dependencies: []
---

# Modal CSS Duplicated Between QuickAddModal.css and CreateGoalModal.css

## Problem Statement

`QuickAddModal.css` contains ~148 lines that are near-exact copies of rules already in `CreateGoalModal.css`. Both files define identical `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-close`, `.form-field`, `.btn-primary`, `.btn-secondary`, `@keyframes fadeIn`, `@keyframes slideUp`, and responsive overrides. This creates a maintenance hazard: any visual change to modal buttons or inputs requires two edits. The duplicate `@keyframes` declarations are particularly problematic — browser behavior when two keyframes share the same name depends on load order, which can break unpredictably.

## Findings

- `src/components/QuickAddModal.css` lines 4-151: 148 lines that duplicate `CreateGoalModal.css`
- Simplicity reviewer confirmed: 54% of QuickAddModal.css (148/276 lines) are exact duplicates
- Both files declare `@keyframes fadeIn` and `@keyframes slideUp` with identical bodies — browser deduplicates silently, but this will break if load order changes or if one animation is customized
- `App.tsx` also imports `QuickAddModal.css` directly (line 7), creating a second owner for the file
- `CreateGoalModal.css` would shrink from ~190 to ~40 unique lines after extraction

## Proposed Solutions

### Option 1: Extract shared modal styles to `modal.css`

**Approach:** Create `src/components/modal.css` (or `src/styles/modal.css`) with all shared rules. Both `CreateGoalModal.css` and `QuickAddModal.css` import it; each file keeps only its private rules.

Shared → `modal.css`:
- `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-close`
- `.form-field` and all variants
- `.btn-primary`, `.btn-secondary` and variants
- `@keyframes fadeIn`, `@keyframes slideUp`
- `@media (max-width: 768px) .modal-content`

Private to `QuickAddModal.css`:
- `.empty-state`, `.fab`, `.searchable-dropdown`, `.dropdown-empty`, mobile FAB sizing

Private to `CreateGoalModal.css`:
- Any CreateGoalModal-specific overrides (minimal)

**Pros:**
- Single source of truth for modal styling
- Any button/input style change is one edit
- Eliminates duplicate keyframe declarations
- `QuickAddModal.css` shrinks from 276 → ~115 lines; `CreateGoalModal.css` shrinks from 190 → ~40 lines

**Cons:**
- Requires importing `modal.css` in both component CSS files (one extra line each)
- Minor refactor churn

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Use `CreateGoalModal.css` as the canonical modal stylesheet

**Approach:** Import `CreateGoalModal.css` from `QuickAddModal.tsx` instead of duplicating. `QuickAddModal.css` keeps only its private rules.

**Pros:**
- No new file needed

**Cons:**
- Semantic mismatch — QuickAddModal importing CreateGoalModal's CSS is confusing
- Would need to rename if CreateGoalModal is ever deleted

**Effort:** 15 minutes

**Risk:** Low

---

## Recommended Action

Option 1 — extract to `modal.css`. The naming is neutral and survives component renames. This is the idiomatic CSS organisation approach for shared component styles.

Also: remove the direct `QuickAddModal.css` import from `App.tsx` (line 7); it should only be imported from `QuickAddModal.tsx`.

## Technical Details

**Affected files:**
- `src/components/QuickAddModal.css` — keep only private rules
- `src/components/CreateGoalModal.css` — keep only private rules
- `src/components/modal.css` — new shared file
- `src/App.tsx` line 7 — remove `import './components/QuickAddModal.css'`

## Acceptance Criteria

- [ ] `modal.css` created with all shared rules
- [ ] `QuickAddModal.css` and `CreateGoalModal.css` each import `modal.css` and retain only private rules
- [ ] Duplicate `@keyframes` declarations eliminated
- [ ] Visually identical before/after (no regressions)
- [ ] `App.tsx` no longer imports `QuickAddModal.css` directly

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Simplicity reviewer confirmed 148 duplicate lines (54% of QuickAddModal.css)
- Identified duplicate `@keyframes fadeIn` and `slideUp` as highest-risk duplication
