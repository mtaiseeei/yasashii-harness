# agentic-harness Development Guide

This repository builds the `harness` plugin for Claude Code and Codex. The plugin turns a short product idea into a file-backed Planner -> Generator -> Evaluator loop.

For the design background and reference trail, read `docs/KNOWLEDGE.md`.

## Core Product

- `Planner` expands a short idea into a short `docs/spec.md` index, detailed `docs/spec/*.md` files, and sprint contracts in `docs/sprints/`.
- Planner must first ask the user to choose major product direction with short multiple-choice questions when meaningful decisions are still open.
- `Generator` implements one sprint at a time and updates `docs/progress/sprint-N.md`.
- `Evaluator` operates the running app, scores the sprint, and writes `docs/feedback/sprint-N.md`.
- The loop is intentionally adversarial: generation and evaluation are separate because self-evaluation is usually too positive.

## Design Principles

1. Separate What from How. Planner writes product behavior and acceptance criteria, not stack choices, schemas, or API designs.
   Use host-native user-question UI for product decisions: Claude Code `AskUserQuestion` when available; Codex structured user input when available.
2. Persist handoffs in files. Use `spec.md` as a short index, `docs/spec/*.md` for cross-sprint product truth, `docs/sprints/sprint-N.md` for sprint contracts, `docs/progress/sprint-N.md` for implementation handoff, and `docs/feedback/sprint-N.md` for evaluation.
3. Keep one writer per canonical file. Planner owns spec and sprint contracts, Generator owns progress files, Evaluator owns feedback.
4. Gate progress with thresholds. One failed threshold means the sprint returns to Generator.
5. Verify the real app before completion. Do not mark work complete from code inspection alone.
6. Prefer local host-native browser verification: Codex App uses Browser Use, Claude Code Desktop uses Preview, CLI uses Playwright.

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

- Keep Claude Code and Codex behavior aligned where possible, but do not pretend their extension systems are identical.
- Do not make Playwright MCP a hard dependency. It is a CLI fallback, not the default app path.
- Do not let hooks write project guidance files. Guidance generation belongs to harness initialization, whether conversational or `/harness`, and must be no-overwrite.
- Keep install-facing text actionable: after installing, users should know they can just ask for an app, with `/harness <idea>` as an explicit shortcut.
- The Planner question loop is mandatory for substantial builds. Do not collapse it into assumptions unless the user explicitly asks the agent to decide.
- Do not hardcode Claude model names in reusable workflow files. Inherit host/user defaults unless the user opts into a stronger model.
- Preserve zero-dependency distribution unless a dependency removes real operational risk.

## Validation

- Check JSON manifests with `python3 -m json.tool`.
- If available, run `claude plugin validate plugins/harness`.
- For Codex, verify the local marketplace can install `harness@agentic-harness-local`.
- When changing hook behavior, test both cases:
  - no `CLAUDE_PLUGIN_ROOT`: no output, exit 0
  - `CLAUDE_PLUGIN_ROOT` set: emits Claude Code `hookSpecificOutput.additionalContext`
