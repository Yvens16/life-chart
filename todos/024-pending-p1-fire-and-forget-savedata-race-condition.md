---
status: pending
priority: p1
issue_id: "024"
tags: [code-review, data-integrity, react]
dependencies: []
---

# Fire-and-Forget saveData for promptShownForYear Races With carry-forward Mutations

## Problem Statement

In `useAppData.ts` `load()`, `saveData(updated)` is invoked **without awaiting**. The `updated` snapshot written in that path does not include goals carried forward for the new year. If the user immediately confirms “Carry forward all” in the new-year prompt, **two concurrent POSTs** can be in flight: (1) the unawaited save with no new carried-forward goals, and (2) `carryForwardGoals` (or equivalent) with the new goals. If request (1) completes **after** request (2), the server persists the stale snapshot and **drops** the carried-forward goals — data loss. The race window is small on loopback (~10–50ms) but real on slower networks.

## Findings

- **Location:** `src/hooks/useAppData.ts:32-35` (approximate; line numbers may shift)
- **Pattern:** Fire-and-forget async write before UI allows another mutation that also persists full state
- Ordering of HTTP responses, not call order, determines final stored document if both bodies are full replacements

## Proposed Solutions

### Solution A (preferred): Await the prompt snapshot save

`await saveData(updated)` before calling `setData` / `setShowNewYearPrompt` (or before any user action can trigger `carryForwardGoals`). Ensures the persisted baseline is written before the user can issue a second save.

- **Pros:** Simple linearization; no overlapping full-document writes from this path
- **Cons:** Slightly longer `load()` until network completes
- **Effort:** Small
- **Risk:** Low if error handling on failed save is defined

### Solution B: Serialize with a ref to in-flight save

Hold a ref to the in-flight `saveData` promise and `await` it at the start of `carryForwardGoals` before performing its own mutate.

- **Pros:** Allows load to proceed without blocking if designed carefully; still serializes conflicting writers
- **Cons:** More moving parts; easy to miss other entry points that also persist
- **Effort:** Medium
- **Risk:** Medium

## Acceptance Criteria

- [ ] No overlapping full-data `saveData` / persist calls where a later-arriving older snapshot can overwrite newer carried-forward state
- [ ] “Carry forward all” immediately after new-year prompt cannot lose carried-forward goals under concurrent or slow network
- [ ] Failed saves during load are handled (user-visible error or retry) without leaving inconsistent local vs server state
- [ ] TypeScript compiles with no errors

## Work Log

- **2026-03-30** — Identified during code review of feat: add yearly versioning for goals (P1).
