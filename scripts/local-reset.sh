#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d "$HOME/.nvm/versions/node/v20.20.0/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
fi

echo "WARNING: This will reset local DB schema and delete local data."
echo "Type RESET to continue:"
read -r answer
if [ "$answer" != "RESET" ]; then
  echo "Aborted."
  exit 1
fi

npm run check:node
npx prisma migrate reset --force
echo "Local DB reset complete."
