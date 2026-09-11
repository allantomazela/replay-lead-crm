/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'

const localEnv = existsSync(path.resolve(__dirname, '.env-dev'))
  ? '.env-dev'
  : existsSync(path.resolve(__dirname, '.env'))
    ? '.env'
    : null
if (localEnv) {
  loadDotenv({ path: path.resolve(__dirname, localEnv) })
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.API_PORT || process.env.API_PORT || '3001'

  return {
    server: {
      host: '::',
      port: 8080,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: mode === 'development' ? 'dev-dist' : 'dist',
      minify: mode !== 'development',
      cssMinify: 'lightningcss',
      sourcemap: mode === 'development',
      rolldownOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return
          }
          warn(warning)
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode ?? process.env.NODE_ENV ?? 'production'),
    },
    envDir: process.cwd(),
    envPrefix: ['VITE_'],
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, './src'),
        },
        {
          find: /zod\/v4\/core/,
          replacement: path.resolve(__dirname, 'node_modules', 'zod', 'v4', 'core'),
        },
      ],
    },
  }
})
