#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${DAILY_PLANNER_RUNTIME_DIR:-$HOME/apps/daily-planner-v2-runtime}"
LAUNCH_AGENT_LABEL="${DAILY_PLANNER_LAUNCH_AGENT_LABEL:-com.gehad.daily-planner-v2}"
APP_URL="${DAILY_PLANNER_APP_URL:-http://127.0.0.1:3000}"

echo "[1/7] Sync source into runtime copy"
mkdir -p "$(dirname "$RUNTIME_DIR")"
/usr/bin/rsync -a --delete \
  --exclude '.git' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'tmp' \
  --exclude 'coverage' \
  "$ROOT_DIR/" "$RUNTIME_DIR/"

cd "$RUNTIME_DIR"

echo "[2/7] Install dependencies"
npm install

echo "[3/7] Prisma generate"
npm run prisma:generate

echo "[4/7] Prisma deploy"
npm run prisma:deploy

echo "[5/7] Production build"
npm run build

echo "[6/7] Restart launch agent"
launchctl kickstart -k "gui/$(id -u)/$LAUNCH_AGENT_LABEL"

echo "[7/7] Health check"
sleep 3
curl -fsSI "$APP_URL/api/health"

echo
echo "Runtime sync complete."
echo "App URL: $APP_URL/login"
