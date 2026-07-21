#!/usr/bin/env bash
# Initialize Agentic Harness guidance in a target repository.
# Existing guidance/config is never replaced. The only in-place additions are
# the exact current and legacy personal-config ignore rules when a safe regular file is present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_ROOT="${1:-$(pwd)}"
HARNESS_DIR="${TARGET_ROOT}/.harness"
IGNORE_FILE="${HARNESS_DIR}/.gitignore"
IGNORE_RULES=('config.local.toml' 'config.local.json')

changed_any=false
had_custom_guidance_target=false

fail() {
    printf 'Agentic Harness initialization refused: %s\n' "$1" >&2
    exit 1
}

# Validate every potentially dangerous path before creating docs, config, or
# guidance. In particular, never follow a symlinked Harness directory/ignore.
preflight_runtime_paths() {
    if [[ -L "$HARNESS_DIR" ]]; then
        fail "${HARNESS_DIR} is a symlink; no files were changed"
    fi
    if [[ -e "$HARNESS_DIR" ]] && [[ ! -d "$HARNESS_DIR" ]]; then
        fail "${HARNESS_DIR} is not a directory; no files were changed"
    fi
    if [[ -L "$IGNORE_FILE" ]]; then
        fail "${IGNORE_FILE} is a symlink; its target was not read or changed"
    fi
    if [[ -e "$IGNORE_FILE" ]]; then
        if [[ ! -f "$IGNORE_FILE" ]]; then
            fail "${IGNORE_FILE} is not a regular file; no files were changed"
        fi
        if [[ ! -r "$IGNORE_FILE" ]]; then
            fail "${IGNORE_FILE} is not readable; no files were changed"
        fi
        for rule in "${IGNORE_RULES[@]}"; do
            if ! grep -Fqx "$rule" "$IGNORE_FILE" && [[ ! -w "$IGNORE_FILE" ]]; then
                fail "${IGNORE_FILE} is not writable and lacks ${rule}; no files were changed"
            fi
        done
    elif [[ -d "$HARNESS_DIR" ]] && [[ ! -w "$HARNESS_DIR" ]]; then
        fail "${HARNESS_DIR} is not writable; no files were changed"
    elif [[ ! -e "$HARNESS_DIR" ]] && [[ ! -w "$TARGET_ROOT" ]]; then
        fail "${TARGET_ROOT} is not writable; no files were changed"
    fi
}

ensure_dir() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        printf 'created %s\n' "$dir"
        changed_any=true
    fi
}

seed_file() {
    local file="$1"
    local content="$2"
    if [[ ! -e "$file" ]]; then
        printf '%s\n' "$content" > "$file"
        printf 'created %s\n' "$file"
        changed_any=true
    fi
}

copy_if_missing() {
    local src="$1"
    local dst="$2"
    if [[ ! -e "$dst" ]]; then
        cp "$src" "$dst"
        printf 'created %s\n' "$dst"
        changed_any=true
    else
        printf 'kept existing %s\n' "$dst"
    fi
}

ensure_local_config_rule() {
    if [[ ! -e "$IGNORE_FILE" ]]; then
        cp "${PLUGIN_ROOT}/templates/.harness/.gitignore" "$IGNORE_FILE"
        printf 'created %s\n' "$IGNORE_FILE"
        changed_any=true
    else
        local added=false
        for rule in "${IGNORE_RULES[@]}"; do
            if ! grep -Fqx "$rule" "$IGNORE_FILE"; then
                if [[ -s "$IGNORE_FILE" ]] && [[ "$(tail -c 1 "$IGNORE_FILE" | wc -l | tr -d ' ')" -eq 0 ]]; then
                    printf '\n' >> "$IGNORE_FILE"
                fi
                printf '%s\n' "$rule" >> "$IGNORE_FILE"
                printf 'updated %s (added %s)\n' "$IGNORE_FILE" "$rule"
                changed_any=true
                added=true
            fi
        done
        if [[ "$added" == false ]]; then
            printf 'kept existing %s\n' "$IGNORE_FILE"
        fi
    fi

    if git -C "$TARGET_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        for rule in "${IGNORE_RULES[@]}"; do
            if git -C "$TARGET_ROOT" check-ignore -q --no-index -- ".harness/${rule}"; then
                printf 'verified git ignore for %s\n' "${TARGET_ROOT}/.harness/${rule}"
            else
                fail "git did not confirm .harness/${rule} as ignored"
            fi
        done
    else
        printf 'warning: ignore rule installed but git verification skipped (target is not a git worktree)\n' >&2
    fi
}

preflight_runtime_paths

# Secure the personal config path before creating any other Harness artifacts.
ensure_dir "$HARNESS_DIR"
ensure_local_config_rule

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
- Spec-Issue Count: 0
- Lineage Dispatches: 0
- Model Tier: standard
- Rotate: none
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

copy_if_missing "${PLUGIN_ROOT}/templates/CLAUDE.md" "${TARGET_ROOT}/CLAUDE.md"
copy_if_missing "${PLUGIN_ROOT}/templates/AGENTS.md" "${TARGET_ROOT}/AGENTS.md"
if [[ -e "${TARGET_ROOT}/.harness/config.toml" ]]; then
    printf 'kept existing %s\n' "${TARGET_ROOT}/.harness/config.toml"
elif [[ -e "${TARGET_ROOT}/.harness/config.json" ]] || [[ -e "${TARGET_ROOT}/.harness/config.local.json" ]]; then
    printf 'warning: kept legacy Harness JSON config; migrate manually to .harness/config.toml and .harness/config.local.toml (no competing TOML was created)\n' >&2
else
    copy_if_missing "${PLUGIN_ROOT}/templates/.harness/config.toml" "${TARGET_ROOT}/.harness/config.toml"
fi

if [[ "$had_custom_guidance_target" == true ]]; then
    copy_if_missing "${PLUGIN_ROOT}/templates/docs/harness-guidance.md" "${TARGET_ROOT}/docs/harness-guidance.md"
fi

if [[ "$changed_any" == true ]]; then
    printf 'Agentic Harness guidance initialized.\n'
else
    printf 'Agentic Harness guidance already present; no files overwritten.\n'
fi
