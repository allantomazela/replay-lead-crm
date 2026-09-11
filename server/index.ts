import './load-env'
import { isProdEnv, projectRoot } from './load-env'

import { serve } from '@hono/node-server'
import { app } from './app'

const port = Number(process.env.API_PORT || 3001)

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err)
})

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname: '127.0.0.1',
  },
  (info) => {
    console.log(
      `ReplayLead API ouvindo em http://127.0.0.1:${info.port} (${isProdEnv ? 'prod' : 'dev'})`,
    )
    console.log(`Projeto: ${projectRoot}`)
  },
)

server.on('error', (err) => {
  console.error('[server.error]', err)
  process.exit(1)
})
