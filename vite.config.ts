import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AppData } from './src/types'
import type { IncomingMessage, ServerResponse } from 'node:http'

function apiPlugin(): Plugin {
  const dataFilePath = path.resolve(__dirname, 'data.json')

  function isValidAppData(data: unknown): data is AppData {
    if (typeof data !== 'object' || data === null) return false
    const d = data as Record<string, unknown>
    return Array.isArray(d.goals) && Array.isArray(d.categories)
  }

  async function readDataFile(): Promise<AppData> {
    try {
      const content = await fs.readFile(dataFilePath, 'utf-8')
      return JSON.parse(content) as AppData
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code === 'ENOENT') {
        return { goals: [], categories: [] }
      }
      console.error('Error reading data.json:', err)
      return { goals: [], categories: [] }
    }
  }

  async function writeDataFile(data: AppData): Promise<void> {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2))
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
