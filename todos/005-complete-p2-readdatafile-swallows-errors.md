---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, error-handling, data-integrity]
dependencies: ["004"]
---

# readDataFile Swallows Non-ENOENT Errors Silently

## Problem Statement

`readDataFile` in `vite.config.ts` catches all exceptions and returns `null` regardless of the error type. This means permission errors (`EACCES`), corrupt partial files, disk errors, and other real failures are silently treated as "no data found" — the app starts with an empty state and overwrites all existing data on the next write.

**Why it matters:** If the data file is corrupt (e.g., from a previous non-atomic write), the app silently resets to empty rather than alerting the developer. All goals and entries are lost permanently.

## Findings

**Location:** `vite.config.ts` — `readDataFile` function

```typescript
// CURRENT — catches everything, masks real errors
try {
  const raw = await fs.readFile(DATA_FILE, 'utf-8')
  const parsed = JSON.parse(raw)
  if (isValidAppData(parsed)) return parsed
  return null
} catch {
  return null  // WRONG: swallows EACCES, SyntaxError, etc.
}

// FIX — only suppress ENOENT (file not found is expected)
try {
  const raw = await fs.readFile(DATA_FILE, 'utf-8')
  const parsed = JSON.parse(raw) as unknown
  if (isValidAppData(parsed)) return parsed
  console.warn('[life-chart] Data file failed schema validation, starting fresh')
  return null
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
  throw err  // re-throw real errors: EACCES, SyntaxError on corrupt JSON, etc.
}
```

**Reported by:** security-sentinel

## Proposed Solutions

### Option A: Selective catch — re-throw non-ENOENT (Recommended)
Type-narrow the error and only suppress ENOENT.
- **Pros:** Minimal change, correct behavior, follows Node.js conventions
- **Cons:** Vite startup will fail on permission errors (this is correct behavior)
- **Effort:** Small
- **Risk:** Low

### Option B: Add startup health-check with user-visible error
Display a styled Vite plugin error banner when data file is unreadable.
- **Pros:** Better DX — developer sees the problem immediately
- **Cons:** More code
- **Effort:** Small
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `vite.config.ts`
- **Function:** `readDataFile`
- **Related:** todo 004 (atomic write) — once atomic writes are in place, corrupt files from crashes are less likely, but permission errors and manual corruption still possible

## Acceptance Criteria

- [ ] `ENOENT` (file not found) returns `null` — expected initial state
- [ ] `EACCES` (permission denied) throws and surfaces as Vite startup error
- [ ] Corrupt JSON (`SyntaxError`) throws and surfaces as Vite startup error
- [ ] Schema validation failure logs a warning and returns `null` (non-fatal)

## Work Log

- **2026-03-15** — Identified during third /ce:review pass. Agent: security-sentinel.

## Resources

- PR: current branch (life-chart)
- Node.js error codes: https://nodejs.org/api/errors.html#common-system-errors
