module.exports = {
  apps: [
    {
      name: 'replay-lead-crm',
      cwd: '/var/www/replay-lead-crm',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server/index.ts',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
