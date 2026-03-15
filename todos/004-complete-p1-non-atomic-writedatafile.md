---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, data-integrity, file-system, atomicity]
dependencies: []
---

# Non-Atomic writeDataFile — Data Loss on Process Crash During Write

## Problem Statement

`writeDataFile` in `vite.config.ts` writes directly to the target file using `fs.writeFile`. If the Node process crashes, is killed, or the disk fills up mid-write, the data file is left partially written and corrupt. On next startup, the app reads a truncated JSON file and loses all data.

**Why it matters:** A SIGKILL during `vite dev` (e.g., `Ctrl+C` during a save) can permanently destroy the user's goal and entry data. There is no recovery path.

## Findings

**Location:** `vite.config.ts` — `writeDataFile` function

```typescript
// CURRENT — direct overwrite, not atomic
await fs.writeFile(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8')

// FIX — write to temp, then atomic rename
const tmpFile = DATA_FILE + '.tmp'
await fs.writeFile(tmpFile, JSON.stringify(appData, null, 2), 'utf-8')
await fs.rename(tmpFile, DATA_FILE)  // atomic on POSIX (same filesystem)
```

`fs.rename` on the same filesystem is atomic at the OS level — the old file is replaced in a single syscall. If the process crashes before `rename`, the original file is untouched.

**Secondary issue:** `readDataFile` catches all errors but only re-uses the "file not found" path for `ENOENT`. Other errors (permission denied, disk full, corrupt JSON from a partial write) are silently swallowed and treated as "no data":

```typescript
// CURRENT — swallows all errors
} catch {
  return null  // ENOENT is fine, but EACCES / EISDIR / corrupt JSON should throw
}

// FIX — only suppress ENOENT
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
  throw err
}
```

**Reported by:** security-sentinel, performance-oracle (this was flagged in review pass 2 as todo 013 but was not fixed)

## Proposed Solutions

### Option A: Write to .tmp then fs.rename (Recommended)
Two extra lines, POSIX atomic rename, industry standard pattern.
- **Pros:** Zero data loss guarantee on POSIX, widely understood pattern
- **Cons:** Not atomic on Windows across drives (not relevant for dev tool)
- **Effort:** Small
- **Risk:** Low

### Option B: Write to timestamped backup then replace
Keep a rolling backup of last N versions.
- **Pros:** Also enables rollback
- **Cons:** More complexity, disk usage
- **Effort:** Medium
- **Risk:** Low

### Option C: Use SQLite via better-sqlite3
Replace JSON file with embedded SQLite for true ACID transactions.
- **Pros:** Full ACID, concurrent access safe
- **Cons:** New dependency, significant rewrite of vite plugin
- **Effort:** Large
- **Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

- **Affected files:** `vite.config.ts`
- **Functions:** `writeDataFile`, `readDataFile`
- **OS behavior:** `fs.rename` on same filesystem is O_RENAME syscall — atomic at kernel level
- **Cleanup:** Delete `.tmp` file if `rename` throws (edge case: disk full after write)

## Acceptance Criteria

- [ ] Sending SIGKILL during a write operation leaves original data file intact
- [ ] Next startup after crash reads complete, valid JSON
- [ ] `readDataFile` re-throws non-ENOENT errors instead of returning null
- [ ] `.tmp` file is cleaned up on startup if present (optional but nice)

## Work Log

- **2026-03-15** — Third /ce:review pass. Previously identified in pass 2 as todo 013 but not resolved. Escalated to P1 due to continued unfixed status.

## Resources

- PR: current branch (life-chart)
- Node.js fs.rename docs: https://nodejs.org/api/fs.html#fsrenameoldpath-newpath-callback
- POSIX rename(2) man page: atomic within same filesystem
