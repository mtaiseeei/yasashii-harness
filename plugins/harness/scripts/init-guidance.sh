#!/usr/bin/env bash
# Backward-compatible entrypoint. All hosts share the same preflight and writer.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "${SCRIPT_DIR}/harness.mjs" init --root "${1:-$(pwd)}"
