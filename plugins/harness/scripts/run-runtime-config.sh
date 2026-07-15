#!/usr/bin/env bash

set -u

if ! command -v node >/dev/null 2>&1; then
  printf '{"status":"inherit","reason":"node-unavailable"}\n'
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/resolve-runtime-config.mjs" "$@"
