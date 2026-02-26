#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d "$HOME/.nvm/versions/node/v20.20.0/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
fi

echo "[1/6] Node check"
npm run check:node

echo "[2/6] Ensure PostgreSQL is reachable on localhost:5432"
if ! /Applications/Postgres.app/Contents/Versions/17/bin/psql postgresql://postgres:postgres@localhost:5432/postgres -c "select 1" >/dev/null 2>&1; then
  echo "PostgreSQL not reachable, trying to start Postgres.app cluster..."
  /Applications/Postgres.app/Contents/Versions/17/bin/pg_ctl -D "$HOME/.postgresapp-data17" -l /tmp/postgres.log start >/dev/null 2>&1 || true
  sleep 2
fi

if ! /Applications/Postgres.app/Contents/Versions/17/bin/psql postgresql://postgres:postgres@localhost:5432/postgres -c "select 1" >/dev/null 2>&1; then
  echo "ERROR: PostgreSQL is still not reachable at localhost:5432"
  echo "Start Postgres.app manually, then rerun: npm run local:up"
  exit 1
fi

echo "[3/6] Prisma generate/migrate/seed"
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

echo "[4/6] Runtime doctor"
npm run doctor

echo "[5/6] Stop stale Next.js processes"
pkill -f "next dev|next start|next-server" >/dev/null 2>&1 || true

echo "[6/6] Start app on http://127.0.0.1:3010"
exec npm run dev:3010
