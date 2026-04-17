#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d "$HOME/.nvm/versions/node/v20.20.0/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
fi

APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-3000}"

echo "[runtime] Node check"
npm run check:node

echo "[runtime] Ensure PostgreSQL is reachable"
if ! /Applications/Postgres.app/Contents/Versions/17/bin/psql postgresql://postgres:postgres@localhost:5432/postgres -c "select 1" >/dev/null 2>&1; then
  echo "[runtime] PostgreSQL not reachable. Retrying start..."
  /Applications/Postgres.app/Contents/Versions/17/bin/pg_ctl -D "$HOME/.postgresapp-data17" -l /tmp/postgres.log start >/dev/null 2>&1 || true
  sleep 2
fi

if ! /Applications/Postgres.app/Contents/Versions/17/bin/psql postgresql://postgres:postgres@localhost:5432/postgres -c "select 1" >/dev/null 2>&1; then
  echo "[runtime] PostgreSQL is still unavailable at localhost:5432"
  exit 1
fi

echo "[runtime] Prisma generate/deploy"
npm run prisma:generate
npm run prisma:deploy

if [ ! -f ".next/BUILD_ID" ]; then
  echo "[runtime] No production build found. Building once..."
  npm run build
else
  echo "[runtime] Existing production build found. Skipping rebuild."
fi

echo "[runtime] Start app on http://${APP_HOST}:${APP_PORT}"
NEXT_BIN="$ROOT_DIR/node_modules/.bin/next"

if [ -x "$NEXT_BIN" ]; then
  exec "$NEXT_BIN" start -H "${APP_HOST}" -p "${APP_PORT}"
fi

RESOLVED_NEXT="$(node -p "require.resolve('next/dist/bin/next')" 2>/dev/null || true)"

if [ -n "$RESOLVED_NEXT" ] && [ -f "$RESOLVED_NEXT" ]; then
  exec node "$RESOLVED_NEXT" start -H "${APP_HOST}" -p "${APP_PORT}"
fi

echo "[runtime] ERROR: Could not resolve a working Next.js binary"
exit 1
