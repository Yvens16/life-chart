---
status: pending
priority: p2
issue_id: "027"
tags: [code-review, quality]
dependencies: []
---

# getFinalValue in NewYearModal Duplicates getFinalEntryValue From goalChain.ts

## Problem Statement

`NewYearModal.tsx` defines a local `getFinalValue` helper that matches the logic already exported as `getFinalEntryValue` from `src/utils/goalChain.ts`. Duplicated logic doubles maintenance cost and risks drift when one copy is updated and the other is not.

## Findings

- `src/components/NewYearModal.tsx` lines 25–29: local `getFinalValue` implementation.
- `src/utils/goalChain.ts`: exported `getFinalEntryValue` — same behavior as the local function.
- Two sources of truth for "final entry value" semantics.

## Proposed Solutions

Delete the local helper. Import `getFinalEntryValue` from `../utils/goalChain` (adjust relative path as needed) and replace all `getFinalValue` usages with `getFinalEntryValue` (or a thin alias if naming must stay local for readability).

## Acceptance Criteria

- [ ] Local duplicate `getFinalValue` removed from `NewYearModal.tsx`.
- [ ] Modal uses `getFinalEntryValue` from `goalChain.ts` everywhere the old helper was used.
- [ ] No behavioral change for valid goal/entry data.
- [ ] TypeScript compiles; no unused imports.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
