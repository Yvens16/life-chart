---
status: pending
priority: p2
issue_id: "029"
tags: [code-review, security, data-integrity]
dependencies: []
---

# migrateData Produces year:NaN When createdAt Is Invalid — Permanent Empty State

## Problem Statement

In `vite.config.ts`, `migrateData` derives a goal year with `new Date(createdAt).getFullYear()`. If `createdAt` is a string that does not parse to a valid date (e.g. empty string, placeholder text), `getFullYear()` returns `NaN`. `typeof NaN === "number"` is true, but `Number.isInteger(NaN)` is false, so validation rejects the goal. If enough goals fail, `isValidAppData` can fail and every GET may return empty `goals` / `categories`, leaving the user stuck until `data.json` is repaired manually.

## Findings

- `vite.config.ts` lines 74–75: year derived without checking finiteness.
- Invalid `createdAt` values in the wild can corrupt migration output in a way that fails strict validation.
- Risk: silent data wipe from the app's perspective (empty state) despite file on disk.

## Proposed Solutions

Guard the parsed year before assigning, for example:

```ts
const rawYear = new Date(createdAt).getFullYear();
const year = Number.isFinite(rawYear) ? rawYear : new Date().getFullYear();
```

Alternatively, use a fixed fallback year from migration rules or skip-invalid with logging; the important part is never persisting `NaN` as `year`.

## Acceptance Criteria

- [ ] Migrated goals never receive `year: NaN` from invalid `createdAt`.
- [ ] Fallback behavior is defined (e.g. current calendar year or explicit default) and documented in code if non-obvious.
- [ ] Existing valid data migrates identically to before the fix.
- [ ] Add or extend a test or fixture for malformed `createdAt` if the project has migration tests.

## Work Log

- _Pending — opened from code review of feat: yearly versioning for goals._
