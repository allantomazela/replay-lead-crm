import './load-env'
import { isProdEnv, projectRoot } from './load-env'

import { serve } from '@hono/node-server'
import { app } from './app'

const port = Number(process.env.API_PORT || 3001)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `ReplayLead API ouvindo em http://localhost:${info.port} (${isProdEnv ? 'prod' : 'dev'})`,
  )
  console.log(`Projeto: ${projectRoot}`)
})
