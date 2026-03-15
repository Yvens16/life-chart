---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, bug, data, progress]
dependencies: []
---

# calculateProgress Uses Array Index Instead of Latest-by-Date Entry

## Problem Statement

`calculateProgress` and `isGoalProgressing` in `src/utils/progress.ts` use `goal.entries[goal.entries.length - 1]` — the last element by insertion order — to determine the "current" value. If a user edits an older entry or adds entries out of chronological order, the wrong value is used for progress calculation. The chart (which sorts by date) and the progress badge will show **divergent values**, breaking user trust.

**Why it matters:** The progress badge in GoalCard shows "X% toward goal" based on the wrong entry. A user who added last week's weight before this week's weight would see stale progress displayed permanently.

## Findings

**Location:** `src/utils/progress.ts`

```typescript
// CURRENT — uses insertion order (WRONG after edits or out-of-order adds)
const latestEntry = goal.entries[goal.entries.length - 1]

// FIX — uses latest by date
const latestEntry = goal.entries.reduce(
  (max, e) => (e.date > max.date ? e : max),
  goal.entries[0],
)
```

String comparison works correctly for ISO-8601 `YYYY-MM-DD` format (lexicographic = chronological).

**Reported by:** kieran-typescript-reviewer, security-sentinel (data integrity angle)

## Proposed Solutions

### Option A: reduce to find max date (Recommended)
Single-pass O(n) reduce — no sort allocation.
- **Pros:** Minimal, correct, no extra dependencies
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Option B: Sort entries by date before indexing
`[...goal.entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)`
- **Pros:** Also fixes any callers that iterate entries in display order
- **Cons:** Allocates new array + sort; mutates logic should maintain sorted order instead
- **Effort:** Small
- **Risk:** Low

### Option C: Maintain sorted invariant on insert/update
Always insert entries in sorted position; use index as before.
- **Pros:** O(1) access in calculateProgress
- **Cons:** Significant change to all mutation paths
- **Effort:** Large
- **Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `src/utils/progress.ts`
- **Functions:** `calculateProgress`, `isGoalProgressing`
- **Guard needed:** Return early when `goal.entries.length === 0` (already present? verify)

## Acceptance Criteria

- [ ] `calculateProgress` returns correct progress when entries are added out of chronological order
- [ ] `calculateProgress` returns correct progress after editing an older entry
- [ ] Chart value and progress badge show the same "current" value
- [ ] Empty entries array still returns 0 / false without throwing

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agent: kieran-typescript-reviewer.

## Resources

- PR: current branch (life-chart)
- `src/utils/progress.ts`
