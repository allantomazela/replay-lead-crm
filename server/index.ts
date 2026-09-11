import './load-env'
import { isProdEnv, projectRoot } from './load-env'

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { join } from 'path'
import { app } from './app'

const port = Number(process.env.API_PORT || 3001)
const distRoot = join(projectRoot, 'dist')

if (isProdEnv) {
  app.use('/*', serveStatic({ root: distRoot }))
  app.get('*', serveStatic({ path: join(distRoot, 'index.html') }))
}

serve({ fetch: app.fetch, port }, () => {
  console.log(
    `ReplayLead API ouvindo em http://localhost:${port} (${isProdEnv ? 'prod' : 'dev'})`,
  )
  console.log(`Env carregado de: ${projectRoot}`)
})
