---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, data-integrity, api, validation]
dependencies: []
---

# startValue Is Immutable in UI But Mutable via API — No Server Enforcement

## Problem Statement

The UI correctly treats `startValue` as immutable after goal creation — there's no edit field for it in GoalDetail. However, the Vite plugin server endpoint that handles `PUT /api/data` accepts any valid `AppData` payload, including one with a modified `startValue`. A client (or curl command) can change `startValue`, which would retroactively alter all historical progress calculations silently.

**Why it matters:** `startValue` is the baseline for all progress percentages. Changing it after goal creation would make all historical progress data meaningless. The UI intent (immutable) is not enforced by the server.

## Findings

**Location:** `vite.config.ts` — PUT `/api/data` handler

The current handler accepts the entire `AppData` blob and writes it directly. There's no diff-check to prevent `startValue` mutation on existing goals:

```typescript
// CURRENT — accepts any valid AppData including startValue changes
server.middlewares.use(async (req, res, next) => {
  if (req.method === 'PUT' && req.url === '/api/data') {
    // ... parses body, validates schema, writes to disk
    // No check: did startValue change for any existing goal?
  }
})
```

**Fix approach:** When processing a PUT, load existing data and verify that no `startValue` has changed for existing goals:

```typescript
const existing = await readDataFile()
if (existing) {
  const existingGoalMap = new Map(existing.goals.map(g => [g.id, g]))
  for (const goal of newData.goals) {
    const prev = existingGoalMap.get(goal.id)
    if (prev && prev.startValue !== goal.startValue) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Cannot change startValue of existing goal ${goal.id}` }))
      return
    }
  }
}
```

**Reported by:** security-sentinel

## Proposed Solutions

### Option A: Server-side startValue immutability check (Recommended)
Compare incoming goals against stored goals; reject if startValue differs.
- **Pros:** Enforces UI contract at data layer, prevents accidental mutation
- **Cons:** Adds a read-before-write (already doing this for tooLarge check)
- **Effort:** Small
- **Risk:** Low

### Option B: Deep-freeze startValue in Zod schema (planned)
Add Zod validation that compares against current state.
- **Pros:** Composable with other schema checks
- **Cons:** Requires reading existing state into Zod context (non-standard)
- **Effort:** Medium
- **Risk:** Low

### Option C: Accept mutable startValue as a valid use case
Let users correct a wrong startValue intentionally.
- **Pros:** More flexible
- **Cons:** No audit trail, progress history silently rewritten
- **Effort:** None
- **Risk:** High (data integrity)

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `vite.config.ts`
- **Endpoint:** `PUT /api/data`
- **Type concern:** `Goal.startValue` should conceptually be `readonly` in TypeScript type

## Acceptance Criteria

- [ ] PUT request that changes `startValue` of an existing goal returns 400
- [ ] PUT request that adds a new goal with any `startValue` succeeds
- [ ] PUT request that doesn't change `startValue` succeeds normally
- [ ] Error response is JSON with descriptive `error` field

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agent: security-sentinel.

## Resources

- PR: current branch (life-chart)
