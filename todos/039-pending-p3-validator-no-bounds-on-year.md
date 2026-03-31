---
status: pending
priority: p3
issue_id: "039"
tags: [code-review, security, quality]
dependencies: []
---

# isValidGoal Has No Bounds on year — Nonsense Values Pass Validation

## Problem Statement

`vite.config.ts` validates goals with `typeof goal.year === 'number' && Number.isInteger(goal.year)`. Values such as `0`, `-999`, or `9007199254740991` pass. The same applies to `promptShownForYear` if validated similarly. Corrupt or hand-edited `data.json` could surface junk years in the year picker or related UI.

## Findings

- **Location:** `vite.config.ts:41-42` (and parallel checks for `promptShownForYear` if present)
- Integer check is necessary but not sufficient for domain-valid calendar years
- Bad data degrades UX and could interact poorly with date logic elsewhere

## Proposed Solutions

### Solution A (strict)

Add range check: `goal.year >= 1900 && goal.year <= 2200` (adjust to product needs).

### Solution B (moderate)

More permissive window: `goal.year >= 1970 && goal.year <= 2100`.

Apply the same bounds to `promptShownForYear` (and any other year-like persisted fields validated in the same pipeline).

## Acceptance Criteria

- [ ] Goal validation rejects out-of-range `year` values per chosen bounds
- [ ] `promptShownForYear` (and similar) use consistent bounds
- [ ] Legitimate user data and migration paths still validate; document chosen range in code comment if non-obvious

## Work Log

- _None yet_
