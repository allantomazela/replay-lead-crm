import './load-env'
import { isProdEnv } from './load-env'

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './app'

const port = Number(process.env.API_PORT || 3001)

if (isProdEnv) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

serve({ fetch: app.fetch, port }, () => {
  console.log(
    `ReplayLead API ouvindo em http://localhost:${port} (${isProdEnv ? 'prod' : 'dev'})`,
  )
})
