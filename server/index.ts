import fs from 'node:fs'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import { api } from './api.ts'
import { config, ROOT } from './db.ts'
import { isSeeded } from './store.ts'
import { seedDemo } from './seed.ts'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '256kb' }))

app.use('/api', api)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' })
})

/* Serve the built front-end when it exists (i.e. after `npm run build`). */
const distDir = path.join(ROOT, 'dist')
const hasBuild = fs.existsSync(path.join(distDir, 'index.html'))
if (hasBuild) {
  app.use(express.static(distDir, { maxAge: '1h', index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.use((_req, res) => {
    res
      .status(503)
      .type('html')
      .send(
        `<pre style="font:14px ui-monospace;padding:2rem;line-height:1.6">
No build found.

  Development:  npm run dev      → http://localhost:5173
  Production:   npm run build && npm start

API is up on http://localhost:${config.port}/api/club</pre>`,
      )
  })
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500
  if (status >= 500) console.error('[bookclub]', err)
  res.status(status).json({ error: err.message || 'Something went wrong.' })
})

if (!isSeeded() && config.seedDemo) {
  const seeded = seedDemo()
  if (seeded) {
    console.log('→ Loaded the demo club. `npm run reset` wipes it whenever you like.')
  }
}

const shownHost = config.host === '0.0.0.0' || config.host === '::' ? 'localhost' : config.host

app.listen(config.port, config.host, () => {
  console.log('')
  console.log(`  📚  ${config.clubName}`)
  console.log(`      ${config.clubTagline}`)
  console.log('')
  console.log(`      Listening  http://${shownHost}:${config.port}`)
  console.log(`      API        http://${shownHost}:${config.port}/api/club`)
  console.log(`      Database   ${config.dbPath}`)
  if (config.passcode) console.log('      Passcode   required to join')
  if (!hasBuild) console.log('      UI         npm run dev (Vite on :5173)')
  console.log('')
})
