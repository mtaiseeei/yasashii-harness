#!/usr/bin/env bash
# SessionStart hook for the agentic-harness plugin.
# Injects the `using-harness` skill content as additionalContext so the main
# agent is aware of the harness from the start of every session.

set -euo pipefail

# This hook output contract is for Claude Code. Codex may discover plugin
# hooks/hooks.json, but it does not consume Claude's additionalContext output.
# In non-Claude hosts, exit successfully without emitting misleading context.
if [[ -z "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

using_harness_content=$(cat "${PLUGIN_ROOT}/skills/using-harness/SKILL.md" 2>&1 || echo "Error reading using-harness skill")

# Escape a string for safe embedding inside a JSON string literal.
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

content_escaped=$(escape_for_json "$using_harness_content")

session_context="<IMPORTANT>\nThis project has agentic-harness available.\n\n**Below is your 'harness:using-harness' skill — the entry point to harness-driven development. When the user wants to build an app or a substantial feature, follow it and open the 'harness-loop' skill via the Skill tool.**\n\n${content_escaped}\n</IMPORTANT>"

# Claude Code reads hookSpecificOutput.additionalContext (nested).
printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
