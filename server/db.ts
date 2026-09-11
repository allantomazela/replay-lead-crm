import './load-env'

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida. Configure .env-prod (produção) ou .env-dev (local).')
}

const sql = neon(databaseUrl)
export const db = drizzle(sql, { schema })
