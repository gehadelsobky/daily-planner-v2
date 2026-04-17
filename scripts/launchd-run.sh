#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$HOME/Library/Logs/daily-planner-v2"
mkdir -p "$LOG_DIR"

exec "$ROOT_DIR/scripts/runtime-boot.sh" >>"$LOG_DIR/stdout.log" 2>>"$LOG_DIR/stderr.log"
