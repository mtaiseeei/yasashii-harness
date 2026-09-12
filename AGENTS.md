# agentic-harness Development Guide

This repository builds the `harness` plugin for Claude Code and Codex. A short instruction is the entry point; the product's core value is keeping substantial development moving through separate Planner, Generator, and Evaluator roles, file-backed sources of truth, sprints, and independent evaluation.

For the design background and reference trail, read `docs/KNOWLEDGE.md`.

## Workflow source of truth

For implementation in this Harness-managed repository, start from
[using-harness](plugins/harness/skills/using-harness/SKILL.md) and the
[normal loop](plugins/harness/skills/harness-loop/SKILL.md). Read conditional references only when needed.
The checkout is the distribution source; edit it before applying the documented downstream sync.
Installed plugin caches are not source files and must not be edited to implement changes.

- Planner owns spec/rubric/contracts; Generator owns implementation/progress; independent Evaluator owns feedback.
- Only the orchestrator writes `docs/sprints/state.md`. Record each outcome before the next dispatch.
- Preserve current user intent, existing authorization, dirty work, initialization no-overwrite, and user-owned product decisions.
  Explicitly authorized guidance maintenance may merge necessary edits while preserving project rules and existing changes;
  it does not authorize changing runtime/model settings or Agent definitions.
- Completion requires independent execution evidence, with shortfalls preserved if the user explicitly accepts them.
- Change classification, bounded verification repair, semantic corrections, evidence reuse and limits live in
  [scope](plugins/harness/skills/harness-loop/references/scope.md) and
  [evaluation](plugins/harness/skills/harness-loop/references/evaluation.md). Do not duplicate their rules here.
- Runtime/model semantics live in the resolver and [runtime reference](plugins/harness/skills/harness-loop/references/runtime.md).

## Repository Map

- `.claude-plugin/marketplace.json`: Claude Code marketplace catalog.
- `.agents/plugins/marketplace.json`: Codex repo marketplace catalog.
- `plugins/harness/.claude-plugin/plugin.json`: Claude Code plugin manifest.
- `plugins/harness/.codex-plugin/plugin.json`: Codex plugin manifest.
- `plugins/harness/skills/using-harness/SKILL.md`: normal conversational entrypoint. It detects substantial build requests, initializes guidance, and routes into `harness-loop`.
- `plugins/harness/skills/harness-loop/SKILL.md`: orchestration brain.
- `plugins/harness/agents/*.md`: Claude Code role agents.
- `plugins/harness/commands/harness.md`: Claude Code command that initializes a target repo and starts the loop.
- `plugins/harness/templates/`: no-overwrite guidance templates for target repositories.

## Editing Rules

- Keep Claude Code and Codex behavior aligned where possible, but do not pretend their extension systems are identical. Codex plugin distribution carries skills only (no agents/commands), so the loop must stay runnable via the no-subagent fallback in `harness-loop`.
- Do not make Playwright MCP a hard dependency. It is a CLI fallback, not the default app path. Never declare it in agent frontmatter (`mcpServers`); use it only when the host already provides it.
- When Git commits are authorized, Generator-authored commits are prefixed with the sprint ID. `git init` is allowed only in a brand-new project, never inside an existing repository. Acceptance tags are opt-in and off by default.
- Do not let hooks write project guidance files. Guidance generation belongs to harness initialization, whether conversational or `/harness`, and must be no-overwrite.
- Keep install-facing text actionable: after installing, users should know they can just ask for an app, with `/harness <idea>` as an explicit shortcut.
- Keep interview necessity in the Planner Grilling gate and interview mechanics in the bundled grilling Skill. Preserve user decisions and explicit delegation; do not invent unresolved product choices.
- Do not hardcode Claude model names in reusable workflow files. Inherit host/user defaults unless the user opts into a stronger model.
- Bundle required parser code and licenses inside the plugin so target repositories need no dependency installation.

## Validation

- Run the checkout positioning regression with `node scripts/check-positioning.mjs`.
- Run the canonical loop-rule reachability and hook regression with `node scripts/check-loop-rules.mjs`.
- Run the runtime configuration regression suite with `node plugins/harness/scripts/check-runtime-config.mjs`.
- Check JSON manifests with `python3 -m json.tool`.
- If available, run `claude plugin validate plugins/harness`.
- For Codex, verify the local marketplace can install `harness@agentic-harness-local`.
- When changing hook behavior, test both cases:
  - no `CLAUDE_PLUGIN_ROOT`: no output, exit 0
  - `CLAUDE_PLUGIN_ROOT` set: emits Claude Code `hookSpecificOutput.additionalContext`
