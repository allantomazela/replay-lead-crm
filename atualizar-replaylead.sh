#!/usr/bin/env bash
set -euo pipefail
cd /var/www/replay-lead-crm
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 delete replay-lead-crm >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save
curl -s http://127.0.0.1:3010/api/health || true
echo
