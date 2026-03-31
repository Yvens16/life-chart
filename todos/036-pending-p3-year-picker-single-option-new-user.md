---
status: pending
priority: p3
issue_id: "036"
tags: [code-review, quality]
dependencies: []
---

# Year Picker Renders With Single Option for New Users — UI Noise

## Problem Statement

`App.tsx` renders the year picker unconditionally. A brand-new user with no history sees a `Select` with only one option (e.g. the current calendar year). That adds noise without a choice. The feature plan noted optionally hiding the picker when `availableYears.length <= 1`.

## Findings

- **Location:** `src/App.tsx:47-61`
- Single-option selects are redundant and can confuse users expecting multiple years
- Product spec already called out conditional visibility

## Proposed Solutions

### Option A

Wrap the year `Select` in `{availableYears.length > 1 && <Select ... />}`.

### Option B

When `availableYears.length <= 1`, show a static non-interactive badge or label with the year instead of a dropdown.

## Acceptance Criteria

- [ ] New users (or any state with a single available year) do not see a pointless single-option year dropdown, unless product explicitly requires it
- [ ] Multi-year users still get a working year picker
- [ ] Layout does not jump awkwardly when the picker is hidden vs shown (acceptable minimal shift only)

## Work Log

- _None yet_
