#!/usr/bin/env bash
# SessionStart hook for the agentic-harness plugin.
# Adds a short applicability pointer; never injects the entire Skill.

set -euo pipefail

# This hook output contract is for Claude Code. Codex may discover plugin
# hooks/hooks.json, but it does not consume Claude's additionalContext output.
# In non-Claude hosts, exit successfully without emitting misleading context.
if [[ -z "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

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

# Short applicability pointer only; the Skill is loaded conditionally by the main agent.
session_context="Agentic Harness preserves goals, decisions and current state. Small reversible changes can be implemented and verified directly. For normal features or substantial development, load harness:using-harness at ${PLUGIN_ROOT}/skills/using-harness/SKILL.md for proportional planning and independent completion review. Read only relevant current specs; do not load all history. Questions and init/check/upgrade-only requests do not start development. Role subagents continue their assigned task."
content_escaped=$(escape_for_json "$session_context")

# Claude Code reads hookSpecificOutput.additionalContext (nested).
printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$content_escaped"
