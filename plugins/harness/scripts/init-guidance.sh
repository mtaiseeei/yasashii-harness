#!/usr/bin/env bash
# Initialize Agentic Harness guidance in a target repository.
# This script is intentionally no-overwrite: it never replaces existing
# CLAUDE.md, AGENTS.md, or docs/harness-guidance.md.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_ROOT="${1:-$(pwd)}"

created_any=false
had_custom_guidance_target=false

ensure_dir() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        printf 'created %s\n' "$dir"
        created_any=true
    fi
}

ensure_file() {
    local file="$1"
    if [[ ! -e "$file" ]]; then
        touch "$file"
        printf 'created %s\n' "$file"
        created_any=true
    fi
}

ensure_dir "${TARGET_ROOT}/docs/spec"
ensure_dir "${TARGET_ROOT}/docs/sprints"
ensure_dir "${TARGET_ROOT}/docs/progress"
ensure_dir "${TARGET_ROOT}/docs/feedback"

ensure_file "${TARGET_ROOT}/docs/spec.md"
ensure_file "${TARGET_ROOT}/docs/spec/product.md"
ensure_file "${TARGET_ROOT}/docs/spec/features.md"
ensure_file "${TARGET_ROOT}/docs/spec/constraints.md"
ensure_file "${TARGET_ROOT}/docs/spec/domain.md"
ensure_file "${TARGET_ROOT}/docs/spec/ui.md"
ensure_file "${TARGET_ROOT}/docs/sprints/current.md"

if [[ -e "${TARGET_ROOT}/CLAUDE.md" ]] && ! cmp -s "${PLUGIN_ROOT}/templates/CLAUDE.md" "${TARGET_ROOT}/CLAUDE.md"; then
    had_custom_guidance_target=true
fi

if [[ -e "${TARGET_ROOT}/AGENTS.md" ]] && ! cmp -s "${PLUGIN_ROOT}/templates/AGENTS.md" "${TARGET_ROOT}/AGENTS.md"; then
    had_custom_guidance_target=true
fi

copy_if_missing() {
    local src="$1"
    local dst="$2"
    if [[ ! -e "$dst" ]]; then
        cp "$src" "$dst"
        printf 'created %s\n' "$dst"
        created_any=true
    else
        printf 'kept existing %s\n' "$dst"
    fi
}

copy_if_missing "${PLUGIN_ROOT}/templates/CLAUDE.md" "${TARGET_ROOT}/CLAUDE.md"
copy_if_missing "${PLUGIN_ROOT}/templates/AGENTS.md" "${TARGET_ROOT}/AGENTS.md"

if [[ "$had_custom_guidance_target" == true ]]; then
    copy_if_missing "${PLUGIN_ROOT}/templates/docs/harness-guidance.md" "${TARGET_ROOT}/docs/harness-guidance.md"
fi

if [[ "$created_any" == true ]]; then
    printf 'Agentic Harness guidance initialized.\n'
else
    printf 'Agentic Harness guidance already present; no files overwritten.\n'
fi
