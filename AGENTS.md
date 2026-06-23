# agentic-harness Development Guide

This repository builds the `harness` plugin for Claude Code and Codex. The plugin turns a short product idea into a file-backed Planner -> Generator -> Evaluator loop.

For the design background and reference trail, read `docs/KNOWLEDGE.md`.

## Core Product

- `Planner` expands a short idea into `docs/spec.md`.
- `Generator` implements one sprint at a time and updates `docs/progress.md`.
- `Evaluator` operates the running app, scores the sprint, and writes `docs/feedback/sprint-N.md`.
- The loop is intentionally adversarial: generation and evaluation are separate because self-evaluation is usually too positive.

## Design Principles

1. Separate What from How. Planner writes product behavior and acceptance criteria, not stack choices, schemas, or API designs.
2. Persist handoffs in files. Use `spec.md -> progress.md -> feedback/sprint-N.md` so sessions can restart cheaply.
3. Keep one writer per canonical file. Planner owns spec, Generator owns progress, Evaluator owns feedback.
4. Gate progress with thresholds. One failed threshold means the sprint returns to Generator.
5. Verify the real app before completion. Do not mark work complete from code inspection alone.
6. Prefer local host-native browser verification: Codex App uses Browser Use, Claude Code Desktop uses Preview, CLI uses Playwright.

## Repository Map

- `.claude-plugin/marketplace.json`: Claude Code marketplace catalog.
- `.agents/plugins/marketplace.json`: Codex repo marketplace catalog.
- `plugins/harness/.claude-plugin/plugin.json`: Claude Code plugin manifest.
- `plugins/harness/.codex-plugin/plugin.json`: Codex plugin manifest.
- `plugins/harness/skills/using-harness/SKILL.md`: entry skill injected in Claude Code and discoverable in Codex.
- `plugins/harness/skills/harness-loop/SKILL.md`: orchestration brain.
- `plugins/harness/agents/*.md`: Claude Code role agents.
- `plugins/harness/commands/harness.md`: Claude Code command that initializes a target repo and starts the loop.
- `plugins/harness/templates/`: no-overwrite guidance templates for target repositories.

## Editing Rules

- Keep Claude Code and Codex behavior aligned where possible, but do not pretend their extension systems are identical.
- Do not make Playwright MCP a hard dependency. It is a CLI fallback, not the default app path.
- Do not let hooks write project guidance files. Guidance generation belongs to `/harness` initialization and must be no-overwrite.
- Keep install-facing text actionable: after installing, users should know to run `/harness <idea>`.
- Preserve zero-dependency distribution unless a dependency removes real operational risk.

## Validation

- Check JSON manifests with `python3 -m json.tool`.
- If available, run `claude plugin validate plugins/harness`.
- For Codex, verify the local marketplace can install `harness@agentic-harness-local`.
- When changing hook behavior, test both cases:
  - no `CLAUDE_PLUGIN_ROOT`: no output, exit 0
  - `CLAUDE_PLUGIN_ROOT` set: emits Claude Code `hookSpecificOutput.additionalContext`
