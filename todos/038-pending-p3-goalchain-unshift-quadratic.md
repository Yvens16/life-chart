---
status: pending
priority: p3
issue_id: "038"
tags: [code-review, performance, quality]
dependencies: []
---

# buildGoalChain Uses chain.unshift() — O(n²) in Chain Length

## Problem Statement

`goalChain.ts` builds the ancestor chain with `chain.unshift(ancestor)` inside a loop. Each `unshift` shifts existing elements, so cost is O(1) + O(2) + … + O(depth) = O(depth²). `MAX_CHAIN_DEPTH` caps depth (e.g. 50), so worst case is still small in absolute terms, but the algorithm is semantically quadratic and worth fixing for clarity and future limit changes.

## Findings

- **Location:** `src/utils/goalChain.ts:21`
- Bounded by `MAX_CHAIN_DEPTH` today (~2500 element moves worst case) but pattern is easy to copy elsewhere unbounded

## Proposed Solutions

Collect ancestors with `chain.push(ancestor)` while walking up, then `return chain.reverse()` after the loop. Amortized O(1) per push plus one O(depth) reverse.

## Acceptance Criteria

- [ ] `buildGoalChain` produces the same ordering as before for all valid inputs
- [ ] No `unshift` in the hot loop; use push + reverse (or equivalent O(depth) construction)
- [ ] Existing tests for goal chains still pass; add a test if none assert order

## Work Log

- _None yet_
