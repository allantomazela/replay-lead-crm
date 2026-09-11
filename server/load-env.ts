import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

const cwd = process.cwd()
const envProd = resolve(cwd, '.env-prod')
const envDev = resolve(cwd, '.env-dev')
const envDefault = resolve(cwd, '.env')

if (existsSync(envProd)) {
  config({ path: envProd, override: true })
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
} else if (existsSync(envDev)) {
  config({ path: envDev, override: true })
} else if (existsSync(envDefault)) {
  config({ path: envDefault, override: true })
}

export const isProdEnv =
  process.env.NODE_ENV === 'production' || existsSync(envProd)
