import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // API middleware for reading/writing data.json
    configureServer(server) {
      const dataFilePath = path.resolve(__dirname, 'data.json')

      // Helper to read data file
      async function readDataFile() {
        try {
          const content = await fs.readFile(dataFilePath, 'utf-8')
          return JSON.parse(content)
        } catch (error) {
          // If file doesn't exist or is invalid JSON, return empty structure
          if (error.code === 'ENOENT') {
            return { goals: [], categories: [] }
          }
          // For JSON parse errors, also return empty structure
          console.error('Error reading data.json:', error)
          return { goals: [], categories: [] }
        }
      }

      // Helper to write data file
      async function writeDataFile(data) {
        try {
          await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2))
        } catch (error) {
          console.error('Error writing data.json:', error)
          throw error
        }
      }

      // Middleware for /api/data endpoints
      server.middlewares.use('/api/data', async (req, res) => {
        // Set CORS headers for local development
        res.setHeader('Access-Control-Allow-Origin', '*')
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
          } catch (error) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Failed to read data' }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              await writeDataFile(data)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (error) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON or write failed' }))
            }
          })
          return
        }

        // Method not allowed
        res.statusCode = 405
        res.end()
      })
    }
  }
})
