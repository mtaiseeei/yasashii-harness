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

# Seed a file with minimal headings so downstream no-overwrite checks can
# distinguish "scaffolded" from "authored". Never touches existing files.
seed_file() {
    local file="$1"
    local content="$2"
    if [[ ! -e "$file" ]]; then
        printf '%s\n' "$content" > "$file"
        printf 'created %s\n' "$file"
        created_any=true
    fi
}

ensure_dir "${TARGET_ROOT}/docs/spec"
ensure_dir "${TARGET_ROOT}/docs/sprints"
ensure_dir "${TARGET_ROOT}/docs/progress"
ensure_dir "${TARGET_ROOT}/docs/feedback"

seed_file "${TARGET_ROOT}/docs/spec.md" '# Spec Index

<!-- Planner が短い正本インデックスとして書く。詳細本文は docs/spec/*.md へ -->'
seed_file "${TARGET_ROOT}/docs/spec/product.md" '# Product

<!-- Planner が書く: 目的、対象ユーザー、ゴール/非ゴール、成功状態 -->'
seed_file "${TARGET_ROOT}/docs/spec/features.md" '# Features

<!-- Planner が書く: 機能IDとユーザーから見た振る舞い -->'
seed_file "${TARGET_ROOT}/docs/spec/constraints.md" '# Constraints

<!-- Planner が書く: 横断制約、禁止事項、安全方針、絶対に回帰させない条件 -->'
seed_file "${TARGET_ROOT}/docs/spec/domain.md" '# Domain

<!-- Planner が書く: 業務ルール、概念データ、KPI/計算方針 -->'
seed_file "${TARGET_ROOT}/docs/spec/ui.md" '# UI / UX

<!-- Planner が書く: 体験方針と非機能要件 -->'
seed_file "${TARGET_ROOT}/docs/spec/rubric.md" '# Evaluation Rubric

<!-- Planner が書く: プロジェクト種別、基準ごとの閾値、スコアのアンカー例 -->'
seed_file "${TARGET_ROOT}/docs/sprints/state.md" '# Sprint State

<!-- オーケストレーターだけが書く進行状態の正本 -->

- Current ID: TBD
- Retry Count: 0
- Next Planned: TBD

## スプリント一覧
| ID | Status | Contract | Progress | Feedback |
|----|--------|----------|----------|----------|

## Deferred / Superseded'

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
