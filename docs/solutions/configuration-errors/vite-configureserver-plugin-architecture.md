---
title: "Vite configureServer must be in a plugin, not in server options — plus security and TypeScript fixes"
date: 2026-03-14
category: configuration-errors
tags:
  - vite
  - vite8
  - react
  - react19
  - typescript
  - strict-mode
  - cors
  - security
  - middleware
  - plugin-api
  - configuration
  - custom-hooks
  - schema-validation
  - gitignore
  - request-body-limit
  - type-safety
problem_type: configuration_error
tech_stack:
  - Vite 8
  - React 19
  - TypeScript 5.9 (strict)
  - react-router v7
  - recharts v3
  - babel-plugin-react-compiler
  - Node.js
severity: high
solved: true
origin_plan: docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md
---

# Vite `configureServer` Must Be in a Plugin — Plus Security & TypeScript Fixes

Discovered during code review of `feat/goal-progress-tracker` (Phase 1 + Phase 2). Ten issues were identified and fixed in one pass.

## Root Cause

The primary issue was a fundamental misunderstanding of the Vite plugin architecture: `configureServer` — a Vite plugin hook — was placed inside the `server: {}` configuration block of `defineConfig()`, where it has no effect. This caused TypeScript compilation errors and meant the API middleware **silently never ran**. A secondary code review uncovered additional issues spanning TypeScript strict mode violations, security gaps, and architectural concerns.

---

## Solution

### Fix 1: Vite Plugin Architecture (Critical)

`configureServer` is a **plugin hook**, not a server configuration option. It must live inside a plugin object returned by a factory function and registered in the `plugins` array.

**TypeScript tells you immediately:** `configureServer` appearing inside `server: {}` produces *"Object literal may only specify known properties, and 'configureServer' does not exist in type 'ServerOptions'"* — treat this as a placement error, not a naming error.

**Before** (broken — TypeScript errors, middleware never runs):
```typescript
export default defineConfig({
  plugins: [react(), babel(...)],
  server: {
    configureServer(server) {  // ❌ WRONG LOCATION — not a valid server option
      server.middlewares.use(async (req, res, next) => { ... })
    }
  }
})
```

**After** (correct):
```typescript
function apiPlugin(): Plugin {
  return {
    name: 'api-plugin',
    configureServer(server: ViteDevServer) {  // ✅ Inside a plugin object
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => { ... })
    }
  }
}

export default defineConfig({
  plugins: [react(), babel(...), apiPlugin()],
})
```

> **Mental model:** Think of `server: {}` as "configure the dev server's host/port/proxy/etc." and plugins as "hook into the dev server's lifecycle." Middleware always goes in a plugin.

---

### Fix 2: TypeScript Strict Mode — Typed Catch Variables

In strict mode (`useUnknownInCatchVariables: true`, implied by `strict: true`), caught values are typed as `unknown`. Accessing properties directly is a type error.

**Before**:
```typescript
} catch (err) {
  if (err.code === 'ENOENT') { // ❌ err is 'unknown', property access disallowed
```

**After**:
```typescript
} catch (err) {
  const nodeErr = err as NodeJS.ErrnoException
  if (nodeErr.code === 'ENOENT') { // ✅ safely typed
```

---

### Fix 3: CORS Security — Restrict to Dev Origin

Wildcard `Access-Control-Allow-Origin: *` allows any open browser tab to read or overwrite local files via the dev API — a real risk given the API reads/writes personal data.

**Before**:
```typescript
res.setHeader('Access-Control-Allow-Origin', '*')  // ❌ any origin can read/write
```

**After**:
```typescript
res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')  // ✅ dev origin only
```

---

### Fix 4: Request Body Size Limit

Without a size cap, a malicious or accidental large POST can exhaust server memory.

**Before**: No limit on accumulated request body.

**After**:
```typescript
const MAX_BODY = 1024 * 1024 // 1 MB
let body = ''
req.on('data', (chunk: Buffer) => {
  body += chunk.toString()
  if (body.length > MAX_BODY) {
    res.statusCode = 413
    res.end(JSON.stringify({ error: 'Payload too large' }))
    req.destroy()
  }
})
```

---

### Fix 5: Schema Validation Before Writing JSON to Disk

Without shape validation, any valid JSON (including `{}`, `[]`, `null`) could be written directly to disk, corrupting the data file.

**After**:
```typescript
function isValidAppData(data: unknown): data is AppData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.goals) && Array.isArray(d.categories)
}

if (!isValidAppData(parsed)) {
  res.statusCode = 400
  res.end(JSON.stringify({ error: 'Invalid data shape' }))
  return
}
```

---

### Fix 6: Business Logic Out of types.ts

`calculateProgress()` had leaked into `src/types.ts`. Type files should contain only interfaces and type aliases — no runtime logic.

**After**: Moved to `src/utils/progress.ts` alongside `isGoalProgressing()`:

```typescript
// src/utils/progress.ts
export function calculateProgress(goal: Goal): number { ... }
export function isGoalProgressing(goal: Goal): boolean { ... }
```

---

### Fix 7: Silent Mutation Failures in Custom Hook

`if (!data) return` is a silent no-op — callers receive no signal that the operation was skipped.

**Before**:
```typescript
async function addGoal(goal: AppData['goals'][number]) {
  if (!data) return  // ❌ silent no-op — caller has no idea it failed
  await mutate({ ...data, goals: [...data.goals, goal] })
}
```

**After**:
```typescript
function requireData(): AppData {
  if (!data) throw new Error('Data not loaded yet')  // ✅ caller receives an actionable error
  return data
}

async function addGoal(goal: Goal) {
  const current = requireData()
  await mutate({ ...current, goals: [...current.goals, goal] })
}
```

---

### Fix 8: Unsafe `Partial<>` → `Pick<>`

`Partial<AppData['goals'][number]>` allowed callers to set required fields (like `entries`) to `undefined`.

**Before**:
```typescript
async function updateGoal(id: string, updates: Partial<AppData['goals'][number]>)
```

**After**:
```typescript
async function updateGoal(id: string, updates: Pick<Goal, 'name' | 'category' | 'unit' | 'targetValue'>)
```

---

### Fix 9: GoalCard Code Cleanup

Inline IIFE replaced with imported `isGoalProgressing()` from utils. Mutable const + `.push()` replaced with a named pure function:

```typescript
function buildChartData(goal: Goal) {
  if (goal.entries.length === 0) return [{ date: 'Start', value: goal.startValue }]
  return [...goal.entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(entry => ({ ... }))
}
```

---

### Fix 10: data.json Added to .gitignore

```gitignore
# Local data file — contains personal goal data, should not be committed
data.json
```

---

## Prevention Strategies

### Project Setup Checklist

- Add `data.json`, `*.local.json`, and any user-data files to `.gitignore` before first commit
- Enable `strict: true` in `tsconfig.json` — catches untyped catch variables and implicit `any` immediately
- Configure ESLint with `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unsafe-member-access`
- Create `src/utils/` at scaffold time to give business logic a home, preventing drift into `types.ts`

### Code Review Checklist

- [ ] Does any catch block access `err.code` / `err.message` without narrowing first?
- [ ] Does any custom hook return `undefined` silently instead of throwing?
- [ ] Does any POST handler accumulate a raw stream without a byte limit?
- [ ] Is user-supplied JSON written to disk without schema validation?
- [ ] Does `Partial<T>` appear in a mutation type where nested arrays could become `undefined`?
- [ ] Is CORS set to `*` on a server that reads or writes local files?
- [ ] Does `src/types.ts` contain anything other than `interface`/`type` declarations?

### When Adding Vite Middleware — Checklist

1. Create a plugin object: `{ name: 'my-plugin', configureServer(server) { ... } }`
2. Place it in the `plugins: []` array, **never** inside `server: {}`
3. Middleware runs **before** Vite's internal middleware by default — return a function to run **after**
4. TypeScript error *"configureServer does not exist in type ServerOptions"* = placement problem, not naming problem

### Common Patterns to Avoid

| Avoid | Use Instead |
|---|---|
| `catch (err) { err.code }` | `const nodeErr = err as NodeJS.ErrnoException; nodeErr.code` |
| `Partial<Goal>` for mutation updates | `Pick<Goal, 'name' \| 'category' \| 'unit'>` |
| `const items = []; items.push(...)` in render | Build array in one expression via `.map()` / `.filter()` |
| IIFE `(() => { ... })()` for derived values | Named function at module scope |
| `if (!data) return` in a hook | `throw new Error('...')` or return an error shape |
| Business logic in `types.ts` | Move to `utils/` |

---

## Related References

- [Vite Plugin API — `configureServer`](https://vite.dev/guide/api-plugin) — authoritative source for plugin hooks
- [Vite Server Options](https://vite.dev/config/server-options) — what *does* go in `server: {}` (host, port, cors, proxy, etc.)
- [TypeScript `useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig#useUnknownInCatchVariables) — why catch vars are `unknown`
- [TypeScript Utility Types — Pick vs Partial](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [OWASP: CORS Origin Header Scrutiny](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
- [OWASP: DoS via Request Body](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Related Project Docs

- [`docs/plans/2026-03-14-001-feat-goal-progress-tracker-plan.md`](../plans/2026-03-14-001-feat-goal-progress-tracker-plan.md) — implementation plan; the `configureServer` pattern was described but placed incorrectly in the first implementation
- [`docs/brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md`](../brainstorms/2026-03-14-life-chart-goal-tracker-brainstorm.md) — local-first storage rationale
