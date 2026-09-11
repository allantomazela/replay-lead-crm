#!/usr/bin/env bash
set -euo pipefail
cd /var/www/replay-lead-crm
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart replay-lead-crm || pm2 start pnpm --name replay-lead-crm --cwd /var/www/replay-lead-crm -- start:prod
pm2 save
