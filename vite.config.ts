import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AppData } from './src/types'
import type { IncomingMessage, ServerResponse } from 'node:http'

function apiPlugin(): Plugin {
  const dataFilePath = path.resolve(__dirname, 'data.json')

  function isValidEntry(e: unknown): boolean {
    if (typeof e !== 'object' || e === null) return false
    const entry = e as Record<string, unknown>
    return (
      typeof entry.id === 'string' &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
      typeof entry.value === 'number' &&
      Number.isFinite(entry.value)
    )
  }

  function isValidGoal(g: unknown): boolean {
    if (typeof g !== 'object' || g === null) return false
    const goal = g as Record<string, unknown>
    return (
      typeof goal.id === 'string' &&
      typeof goal.name === 'string' &&
      typeof goal.category === 'string' &&
      typeof goal.unit === 'string' &&
      typeof goal.startValue === 'number' &&
      Number.isFinite(goal.startValue) &&
      typeof goal.targetValue === 'number' &&
      Number.isFinite(goal.targetValue) &&
      typeof goal.createdAt === 'string' &&
      Array.isArray(goal.entries) &&
      (goal.entries as unknown[]).every(isValidEntry)
    )
  }

  function isValidAppData(data: unknown): data is AppData {
    if (typeof data !== 'object' || data === null) return false
    const d = data as Record<string, unknown>
    return (
      Array.isArray(d.goals) &&
      (d.goals as unknown[]).every(isValidGoal) &&
      Array.isArray(d.categories) &&
      (d.categories as unknown[]).every(c => typeof c === 'string')
    )
  }

  async function readDataFile(): Promise<AppData> {
    try {
      const content = await fs.readFile(dataFilePath, 'utf-8')
      const parsed: unknown = JSON.parse(content)
      if (!isValidAppData(parsed)) {
        console.warn('[life-chart] data.json failed schema validation — starting with empty state')
        return { goals: [], categories: [] }
      }
      return parsed
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code === 'ENOENT') {
        // File not found on first run — expected
        return { goals: [], categories: [] }
      }
      // Re-throw real errors (EACCES, SyntaxError on corrupt JSON, etc.)
      throw err
    }
  }

  async function writeDataFile(data: AppData): Promise<void> {
    // Atomic write: write to a temp file then rename so a crash mid-write
    // never corrupts the original file (fs.rename is POSIX-atomic).
    const tmpPath = dataFilePath + '.tmp'
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
    await fs.rename(tmpPath, dataFilePath)
  }

  return {
    name: 'api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/data')) {
          next()
          return
        }

        // Restrict CORS to same dev origin
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method === 'GET') {
          try {
            const data = await readDataFile()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Failed to read data' }))
          }
          return
        }

        if (req.method === 'POST') {
          const MAX_BODY = 1024 * 1024 // 1 MB
          let body = ''
          let tooLarge = false

          req.on('data', (chunk: Buffer) => {
            if (tooLarge) return
            body += chunk.toString()
            if (body.length > MAX_BODY) {
              tooLarge = true
              res.statusCode = 413
              res.end(JSON.stringify({ error: 'Payload too large' }))
              req.destroy()
            }
          })

          req.on('end', async () => {
            if (tooLarge) return
            try {
              const parsed: unknown = JSON.parse(body)
              if (!isValidAppData(parsed)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid data shape' }))
                return
              }

              // Enforce startValue immutability: once set, startValue cannot change.
              // Changing it would retroactively rewrite all progress history.
              const existing = await readDataFile()
              const existingGoalMap = new Map(existing.goals.map(g => [g.id, g]))
              for (const goal of parsed.goals) {
                const prev = existingGoalMap.get(goal.id)
                if (prev && prev.startValue !== goal.startValue) {
                  res.statusCode = 400
                  res.end(JSON.stringify({
                    error: `Cannot change startValue of existing goal "${goal.name}" (id: ${goal.id})`,
                  }))
                  return
                }
              }

              await writeDataFile(parsed)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON or write failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    apiPlugin(),
  ],
})
