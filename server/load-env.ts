import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envProd = resolve(rootDir, '.env-prod')
const envDev = resolve(rootDir, '.env-dev')
const envDefault = resolve(rootDir, '.env')

if (existsSync(envProd)) {
  config({ path: envProd, override: true })
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'
} else if (existsSync(envDev)) {
  config({ path: envDev, override: true })
} else if (existsSync(envDefault)) {
  config({ path: envDefault, override: true })
}

export const projectRoot = rootDir
export const isProdEnv =
  process.env.NODE_ENV === 'production' || existsSync(envProd)
