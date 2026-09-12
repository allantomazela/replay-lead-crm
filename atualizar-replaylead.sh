#!/usr/bin/env bash
set -euo pipefail

cd /var/www/replay-lead-crm

git pull origin main
pnpm install --frozen-lockfile
pnpm build

pm2 delete replay-lead-crm >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save

API_PORT=3001
if [[ -f .env-prod ]]; then
  RAW_PORT="$(sed -n 's/^API_PORT=//p' .env-prod | head -n1)"
  RAW_PORT="${RAW_PORT%\"}"
  RAW_PORT="${RAW_PORT#\"}"
  RAW_PORT="${RAW_PORT%\'}"
  RAW_PORT="${RAW_PORT#\'}"
  RAW_PORT="$(echo "$RAW_PORT" | tr -d '[:space:]')"
  if [[ -n "$RAW_PORT" ]]; then
    API_PORT="$RAW_PORT"
  fi
fi

echo "Healthcheck em http://127.0.0.1:${API_PORT}/api/health"
curl -sf "http://127.0.0.1:${API_PORT}/api/health"
echo
echo "Deploy concluído."
