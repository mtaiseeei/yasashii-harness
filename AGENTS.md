# agentic-harness Development Guide

This repository builds the `harness` plugin for Claude Code and Codex. A short instruction is the entry point; the product's core value is keeping substantial development moving through separate Planner, Generator, and Evaluator roles, file-backed sources of truth, sprints, and independent evaluation.

For the design background and reference trail, read `docs/KNOWLEDGE.md`.

## Core Product

- `Planner` expands a short new idea or the next step in an existing repository into a short `docs/spec.md` index, detailed `docs/spec/*.md` files (including the scoring rubric `docs/spec/rubric.md`), and sprint contracts in `docs/sprints/`.
- Planner must first ask the user to choose major product direction with short multiple-choice questions when meaningful decisions are still open.
- `Generator` implements one sprint at a time, grows an automated regression suite protecting accepted acceptance criteria, and updates the matching `docs/progress/sprint-*.md`.
- `Evaluator` operates the running app, scores the sprint against the rubric with recorded evidence, and writes the matching `docs/feedback/sprint-*.md`. A pass without evidence is invalid. Evidence sufficiency is bounded (safe harbor): the evidence formats listed in the rubric and contract are enough for a pass, Evaluator never invents extra evidence formats or demands new evidence-collection infrastructure, and every finding carries a target class (`product` / `verification-infra`).
- The orchestrator (main agent) is the only writer of `docs/sprints/state.md`, the execution-state source of truth (Current ID, per-sprint status `planned/active/awaiting-eval/done/done-by-user-decision/deferred/superseded`, retry count, spec-issue count, lineage dispatch budget). Every pass/fail is recorded there before the loop moves on. An older `docs/sprints/current.md` is a legacy pointer converted once into `state.md`.
- Sprint IDs use zero-padded filenames such as `sprint-005.md`; never create decimal IDs such as `sprint-5.10.md`.
- Extra work around an accepted sprint becomes an automatic Patch Sprint such as `sprint-005-patch-001.md` unless it is required to fix failed Evaluator feedback. A small behavior/UI change confined to one feature surface and one flow (for products without screens: one command or one feature area) with existing automated regression coverage qualifies as a `Type: micro` patch with lightweight evaluation (completeness, stability, no-regression only).
- Failure routing: `implementation-issue` returns to Generator, `spec-issue` returns to Planner (incrementing `Spec-Issue Count`; the post-spec-issue contract diff passes user review, and the configured return limit stops for the user), and `verification-scope-issue` — a failure mainly about verification tooling or an evidence format the contract never required — goes directly to the user with options. Three consecutive failures on one sprint escalate to the user, as does the per-lineage dispatch budget (`Lineage Dispatches`, `limits` in `.harness/config.toml`).
- Tightening an active sprint's acceptance criteria, thresholds, or evidence formats requires user approval; a criterion added mid-loop hard-gates only from the next sprint. De-scoping and demoting checks to optional internal QA are legitimate recorded moves, proposed by Planner and approved by the user, and `done-by-user-decision` records a user-accepted completion with Evaluator's shortfall records preserved.
- The loop is intentionally adversarial: generation and evaluation are separate because self-evaluation is usually too positive. Adversarial pressure is bounded by proportionality: verification exists to ship the product, and the verification infrastructure itself is never a product requirement.

## Design Principles

1. Separate What from How. Planner writes product behavior and acceptance criteria, not stack choices, schemas, or API designs.
   Use host-native user-question UI for product decisions: Claude Code `AskUserQuestion` when available; Codex structured user input when available.
2. Persist handoffs in files. Use `spec.md` as a short index, `docs/spec/*.md` for cross-sprint product truth, `docs/sprints/sprint-NNN.md` or `docs/sprints/sprint-NNN-patch-PPP.md` for sprint contracts, `docs/sprints/state.md` for execution state, matching `docs/progress/sprint-*.md` for implementation handoff, and matching `docs/feedback/sprint-*.md` for evaluation.
3. Keep one writer per canonical file. Planner owns spec (including rubric) and sprint contracts, the orchestrator owns `state.md`, Generator owns progress files, Evaluator owns feedback. Invariants confirmed by accepted sprints are promoted into `docs/spec/constraints.md`, not accumulated in state files.
4. Gate progress with thresholds from `docs/spec/rubric.md`. One failed threshold means the sprint returns to Generator (or Planner for spec issues).
5. Verify the real app before completion, with recorded evidence. Do not mark work complete from code inspection alone.
6. Prefer local host-native browser verification: Codex App uses Browser Use, Claude Code Desktop uses Preview, CLI uses Playwright.
7. In a harness-managed repository, classify small follow-ups (direct fix / micro patch / regular patch) instead of silently fixing behavior outside the loop.
8. Keep verification proportional to risk and change size. The scope-change gate applies regardless of origin (user request, Evaluator feedback, or Planner revision), findings are classified `product` vs `verification-infra`, verification-only diffs and verification code outgrowing product code are reported to the user, and guard stops present options (fix / accept at a lower evidence level / de-scope) instead of silently aborting.

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
- Generator-authored commits are prefixed with the sprint ID. `git init` is allowed only in a brand-new project, never inside an existing repository. Acceptance tags are opt-in and off by default.
- Do not let hooks write project guidance files. Guidance generation belongs to harness initialization, whether conversational or `/harness`, and must be no-overwrite.
- Keep install-facing text actionable: after installing, users should know they can just ask for an app, with `/harness <idea>` as an explicit shortcut.
- The Planner question loop is mandatory for substantial builds. Do not collapse it into assumptions unless the user explicitly asks the agent to decide.
- Do not hardcode Claude model names in reusable workflow files. Inherit host/user defaults unless the user opts into a stronger model.
- Bundle required parser code and licenses inside the plugin so target repositories need no dependency installation.

## Validation

- Run the checkout positioning regression with `node scripts/check-positioning.mjs`.
- Run the loop-rule vocabulary regression with `node scripts/check-loop-rules.mjs`.
- Run the runtime configuration regression suite with `node plugins/harness/scripts/check-runtime-config.mjs`.
- Check JSON manifests with `python3 -m json.tool`.
- If available, run `claude plugin validate plugins/harness`.
- For Codex, verify the local marketplace can install `harness@agentic-harness-local`.
- When changing hook behavior, test both cases:
  - no `CLAUDE_PLUGIN_ROOT`: no output, exit 0
  - `CLAUDE_PLUGIN_ROOT` set: emits Claude Code `hookSpecificOutput.additionalContext`
