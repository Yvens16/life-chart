---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, ui-bug, quality]
dependencies: []
---

# Searchable Dropdown Stays Open After Goal Selection in QuickAddModal

## Problem Statement

In `QuickAddModal`, when the user has 10+ goals, a searchable dropdown is shown. After clicking a goal item (which calls `setSelectedGoalId` and `setSearchQuery('')`), the dropdown `<ul>` remains visible because there is no mechanism to close it. The list re-renders with all goals shown (search cleared) immediately after selection, which is confusing — the user selected a goal but sees a full list persisting below.

## Findings

- `QuickAddModal.tsx` lines 131-162: searchable dropdown `<ul>` is always rendered when `goals.length >= 10`
- Selection handler (`onClick` on `<li>`) calls `setSelectedGoalId(goal.id)` and `setSearchQuery('')` but does not hide the list
- After `setSearchQuery('')`, the `<ul>` shows all goals (unfiltered), creating visual noise after selection
- Performance oracle flagged this as both a UX bug and a minor render inefficiency

## Proposed Solutions

### Option 1: Add `showList` state controlled by focus and selection

**Approach:** Track whether the list is visible with a `showList` boolean. Set it `true` on input focus, `false` on selection or blur.

```tsx
const [showList, setShowList] = useState(false)

// On input:
onFocus={() => setShowList(true)}
onBlur={() => setTimeout(() => setShowList(false), 150)} // delay for click to register

// On li click:
onClick={() => {
  setSelectedGoalId(goal.id)
  setSearchQuery(goal.name)
  setShowList(false)
}}

// Conditionally render:
{showList && filteredGoals.length > 0 && <ul>...</ul>}
```

**Pros:**
- Standard combobox pattern
- List closes on selection, closes on blur/click-outside
- The delay on `onBlur` (150ms) allows the `<li>` click to register before the list disappears

**Cons:**
- `setTimeout` in blur handler is a common but inelegant pattern

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Show selected goal name in the input and close list

**Approach:** When a goal is selected, set `searchQuery` to the goal's name (instead of clearing it to `''`). This fills the input with the selection and makes clear what was chosen. Keep the `showList` toggle.

**Pros:**
- User sees what they selected in the input field — clear confirmation
- Eliminates confusion about whether a selection was registered

**Cons:**
- Slightly more state to track

**Effort:** 30 minutes

**Risk:** Low

---

## Recommended Action

Option 2 — fill the input with the selected goal name and close the list. This is the most user-friendly combobox behavior: the input shows what was chosen, and the list closes.

## Technical Details

**Affected files:**
- `src/components/QuickAddModal.tsx` lines 131-162 — searchable dropdown section

## Acceptance Criteria

- [ ] Clicking a goal in the dropdown closes the list
- [ ] Input field shows the selected goal name after selection
- [ ] List opens again when user focuses/edits the input
- [ ] Clicking outside the dropdown closes the list
- [ ] Keyboard navigation not required (but not broken)

## Work Log

### 2026-03-16 - Identified During Code Review

**By:** Claude Code (ce-review)

**Actions:**
- Performance oracle identified the UX bug during dropdown re-render analysis
