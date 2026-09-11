import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const cwd = process.cwd()
const envProd = resolve(cwd, '.env-prod')
const envDev = resolve(cwd, '.env-dev')
const envDefault = resolve(cwd, '.env')

if (existsSync(envProd)) {
  config({ path: envProd })
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
} else if (existsSync(envDev)) {
  config({ path: envDev })
} else if (existsSync(envDefault)) {
  config({ path: envDefault })
}

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './app'

const port = Number(process.env.API_PORT || 3001)
const isProd = process.env.NODE_ENV === 'production' || existsSync(envProd)

if (isProd) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`ReplayLead API ouvindo em http://localhost:${port} (${isProd ? 'prod' : 'dev'})`)
})
