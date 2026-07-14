# agentic-harness Knowledge Base

This document preserves the background, references, and design decisions behind this repository. Use it when handing the project to another agent or person.

For usage, see `README.md`. For the runtime loop, see `plugins/harness/skills/harness-loop/SKILL.md`.

## Summary

Harness-driven development starts from a short idea and uses a Planner -> Generator -> Evaluator loop to build an application through file-backed handoffs.

```text
Planner -> Generator -> Evaluator
              ^             |
              |-------------|
              failed sprint
```

The central idea is adversarial separation: the agent that builds the product should not be the only judge of whether the product is good.

## Core Concepts

### Separate What From How

Planner writes what the product should do in `docs/spec.md`, `docs/spec/*.md`, and `docs/sprints/*.md`.
`docs/spec.md` stays short as the canonical index. Cross-sprint product truth lives in `docs/spec/*.md`.
Sprint-specific goals and acceptance criteria live in `docs/sprints/sprint-NNN.md` for main sprints and
`docs/sprints/sprint-NNN-patch-PPP.md` for patch sprints. Planner should not decide stack,
database schema, endpoint shape, component structure, or other implementation details. If Planner guesses wrong,
the mistake propagates into Generator and Evaluator.

Generator owns how to implement the sprint.

Before writing the full spec, Planner must identify the small number of product decisions the user should own and ask them as structured multiple-choice questions. Claude Code should use `AskUserQuestion` when available. Codex should use its structured user input UI when available. If neither exists, ask concise numbered choices in chat. This keeps the product direction user-owned while keeping implementation details delegated to Generator.

The loop continues until the target user, core experience, success state, scope boundaries, and experience direction are clear.
If the user explicitly asks the agent to decide, remaining cross-cutting uncertainty becomes a written assumption in
`docs/spec/product.md` or `docs/spec/constraints.md`; sprint-specific uncertainty goes in the target
`docs/sprints/sprint-*.md`.

### Persist Handoffs In Files

The loop communicates through files:

- `docs/spec.md`: Planner-owned short index and read order.
- `docs/spec/*.md`: Planner-owned cross-sprint product truth, including the scoring rubric `docs/spec/rubric.md`.
- `docs/sprints/state.md`: orchestrator-owned execution state (Current ID, per-sprint status, retry count).
- `docs/sprints/sprint-NNN.md`: Planner-owned main sprint contract.
- `docs/sprints/sprint-NNN-patch-PPP.md`: Planner-owned patch sprint contract (`Type: patch` or `Type: micro`).
- `docs/progress/sprint-*.md`: Generator output for one sprint.
- `docs/feedback/sprint-*.md`: Evaluator output with evidence and failure classification.
- `docs/sprints/current.md`: legacy pointer from v0.1.x. Converted once into `state.md`, then read-only.

This makes state durable across sessions, keeps context recovery cheap, and prevents past sprint decisions from bloating
the current product source of truth.

### Keep One Writer Per Canonical File

Each file has exactly one owner:

| File | Only writer |
|---|---|
| `docs/spec.md` | Planner |
| `docs/spec/*.md` (including `rubric.md`) | Planner |
| `docs/sprints/sprint-*.md` (contracts) | Planner |
| `docs/sprints/state.md` | Orchestrator (main agent) |
| `docs/progress/sprint-*.md` | Generator |
| `docs/feedback/sprint-*.md` | Evaluator |

Sprint filenames use zero-padded IDs such as `sprint-005.md`. Decimal IDs such as `sprint-5.10.md` are avoided because
they sort and read ambiguously. Additional polish or small fixes around an accepted sprint become automatically numbered
patch sprints such as `sprint-005-patch-001.md`, unless they are required to satisfy failed Evaluator feedback.

Other roles may read the file but must not edit it.

### Separate Generation And Evaluation

Self-evaluation tends to be too positive. Evaluator must be independent and skeptical. It should score against acceptance criteria and quality thresholds, not against Generator's self-confidence.

### Use Thresholds

Each sprint is pass/fail. If one threshold fails, the sprint fails and returns to Generator. Give extra attention to areas models often handle poorly, especially design quality and originality.

### Verify The Running Product

Evaluator must operate the real app before completion. Code inspection is not enough. Capture screenshots or other evidence when UI quality matters.

### Agree Before Building, Verify Before Completion

Borrowed from the Superpowers workflow:

- Brainstorm before build: align on meaningful product direction before implementation.
- Verification before completion: do not call the work done until the real behavior is checked.

## Primary References

### Anthropic: Harness Design For Long-Running Application Development

https://www.anthropic.com/engineering/harness-design-long-running-apps

Key ideas used here:

- Planner turns a 1-4 sentence idea into an ambitious product specification.
- Planner avoids granular implementation details.
- Generator works in sprint-sized increments.
- Evaluator uses browser automation and hard thresholds.
- Design quality and originality need explicit scoring because models tend to under-serve them.
- File handoffs let sessions reset while preserving state.
- Harness parts encode assumptions about what the model cannot reliably do alone. As models improve, remove unnecessary scaffolding.

### Anthropic: Effective Harnesses For Long-Running Agents

https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

Key ideas used here:

- Keep a progress artifact so new sessions understand done vs not done.
- Prefer structured pass/fail feature tracking where possible.
- Read before execute.
- Use browser automation for end-to-end verification.
- Require verification before marking completion.
- Use git to recover known-good states.

### Anthropic: Building Agents With The Claude Agent SDK

https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk

Key idea used here: agents become more reliable when the loop includes inspection and improvement, not just generation.

## Reference Implementations

### Shin-sibainu/harness-sample-app

https://github.com/Shin-sibainu/harness-sample-app

Learned pattern:

- The orchestration brain can live in `CLAUDE.md`.
- It should include file ownership, evaluator thresholds, hard rules, and a `docs/` handoff structure.
- This repository moved that brain into `harness-loop` because a reusable plugin should not overwrite the target repository's project instructions.

### inoshinichi/bootcamp-company

https://github.com/inoshinichi/bootcamp-company

Learned pattern:

- Root marketplace file points to plugins under `plugins/<name>`.
- Each plugin has its own manifest plus skills, commands, agents, and hooks.
- Installation is marketplace add -> plugin install -> command invocation.

### obra/superpowers

https://github.com/obra/superpowers

Learned pattern:

- A SessionStart hook can inject an entry skill as additional context in Claude Code.
- Keep the methodology zero-dependency.
- Use brainstorm -> plan -> execute -> verify.
- Support multiple host ecosystems without coupling to another plugin.

## Design Decisions In This Repository

### Clean Plugin, No Sample App

The repository is a reusable plugin, not a sample application. The plugin should fit into any target repository without carrying a demo app.

### Skill And Runtime Context Instead Of Forced Instruction Overwrite

Target repositories may already have `CLAUDE.md` or `AGENTS.md`. The plugin must not overwrite them at install time or from hooks.

Instead:

- Claude Code uses `hooks/session-start.sh` to inject `using-harness` as temporary context.
- The normal user flow is conversational: the user asks to build an app or substantial feature, `using-harness` detects the intent, initializes target guidance, and routes into `harness-loop`. `/harness` is an explicit shortcut, not the primary requirement.
- Codex uses plugin-distributed skills and progressive disclosure.
- `/harness` initialization may generate guidance files only when they do not already exist.
- If custom guidance files exist, harness initialization writes `docs/harness-guidance.md` with a suggested block.

### Zero-Dependency By Default

The core method should not require another plugin. Playwright is a CLI verification fallback, not a hard runtime dependency for every host.

### Multi-Host Support

This repository supports:

- Claude Code plugin marketplace via `.claude-plugin/marketplace.json`.
- Codex repo marketplace via `.agents/plugins/marketplace.json`.
- Claude Code plugin manifest via `plugins/harness/.claude-plugin/plugin.json`.
- Codex plugin manifest via `plugins/harness/.codex-plugin/plugin.json`.

### Configurable Agent Runtime

Shared runtime intent lives in `.harness/config.json`; `.harness/config.local.json` supplies personal leaf-only
overrides and is ignored by the nested `.harness/.gitignore`. Resolution order is personal explicit value, shared
explicit value, then plugin default (`balanced`, with model/effort inherited from the parent session).

`balanced` reuses the same role between Sprints when resume is available; `fresh` rotates Generator and Evaluator at a
new Sprint boundary but resumes same-Sprint retries. Generator and Evaluator never share a session. Model and effort are
resolved independently per host and role, with no cross-host name translation. Unsupported or unavailable leaves warn
and fall back to inheritance.

Claude Code may apply role settings through a detected agent/dispatch surface. The Codex plugin catalog distributes
skills, not agent definitions, so Codex needs an existing project custom agent or capable spawn surface. Harness never
overwrites `.claude/agents/`, `.codex/agents/`, guidance, or existing config to manufacture support.

`scripts/resolve-runtime-config.mjs` defines the zero-dependency merge and fallback behavior;
`scripts/check-runtime-config.mjs` protects defaults, partial override, host isolation, lifecycle, invalid settings,
unsupported-host fallback, and no-overwrite initialization.

### Orchestration State Separation (v0.2.0)

The first real-world run (shiga-rinri-analysis, 10 main sprints + 41 patches) exposed a dead zone:
`docs/sprints/current.md` was Planner-owned, but the pass/fail transition never redispatched Planner,
so nobody advanced the pointer. The pointer went stale (`Status: Planned` after a recorded PASS),
two sprints stranded as contract-only files, and post-acceptance work bypassed the loop entirely.

Decision: execution state moved to `docs/sprints/state.md`, owned by the orchestrator, with an explicit
status vocabulary (`planned/active/awaiting-eval/done/deferred/superseded`), a retry counter,
a startup consistency check, and a mandatory record-then-advance step.

Alternatives rejected after an adversarial review (Codex):

- Making the orchestrator a second writer of `current.md` — breaks one-writer-per-file.
- Batching many small fixes into one open patch contract — conflicts with the scope-change gate
  (no scope growth after work starts). Instead, `Type: micro` patches keep one contract per change
  but get a lightweight evaluation (completeness, stability, no-regression only).
- Mandatory screenshots for every pass — stalls the loop when no browser surface is available.
  Evidence is tiered instead: commands + concrete URL/DOM interaction records always; screenshots
  only when visual quality is scored.

Related v0.2.0 changes driven by the same run: the entry skill no longer lets "small fixes" bypass a
harness-managed repository (classify as direct fix / micro patch / patch), Generator must grow an
automated regression suite (the real project grew `scripts/check-app.mjs` organically — now
institutionalized), scoring axes are unified across Generator and Evaluator with a Planner-owned
`docs/spec/rubric.md`, failures are classified `implementation-issue` vs `spec-issue` (spec issues
return to Planner), three consecutive failures escalate to the user, Generator commits carry sprint-ID
prefixes, and acceptance tags are opt-in.

### Codex Distribution Limits

The Codex plugin catalog schema distributes `skills` only — no `agents` or `commands` keys (verified
against the remote plugin catalog cache). Therefore `/harness` is Claude Code-only, and on hosts
without subagent dispatch the loop runs through the fallback in `harness-loop`: one role per work
unit, strict file ownership, and never reusing Generator's self-evaluation as the verdict.

### Model Policy

The plugin should not hardcode Claude-specific model names such as `opus` in reusable workflow files. Claude Code and Codex expose different model surfaces, and users may have their own default/cost settings. The default policy is to inherit the host/user model. If a host supports role-specific model choice and the user wants quality over cost, Planner and Evaluator are the best candidates for the strongest available reasoning model; Generator can usually inherit the default.

### Browser Verification Priority

Evaluator chooses the best available verification surface:

1. Codex App: Browser Use / `@Browser`.
2. Claude Code Desktop App: Preview pane / autoVerify.
3. Codex CLI / Claude Code CLI: Playwright test, script, or MCP.
4. Exceptions: Computer Use or real Chrome only when signed-in browser state or GUI-only behavior is required.
5. Fallback: build, HTTP checks, static screenshots, and manual verification notes.

### Naming

- Marketplace: `agentic-harness`.
- Plugin: `harness`.
- Claude command: `/harness`.
- Codex skills: `$using-harness`, `$harness-loop`.

## Repository Structure

```text
agentic-harness/
├── .claude-plugin/marketplace.json
├── .agents/plugins/marketplace.json
├── CLAUDE.md
├── AGENTS.md
├── docs/KNOWLEDGE.md
└── plugins/harness/
    ├── .claude-plugin/plugin.json
    ├── .codex-plugin/plugin.json
    ├── agents/
    ├── commands/
    ├── hooks/
    ├── scripts/
    ├── skills/
    └── templates/
```

## Future Work

- Add `feature_list.json` support for stricter pass/fail tracking (partially addressed by the
  v0.2.0 regression-suite duty; a structured format is still open).
- Add Windows-compatible hook/script paths.
- Add a tiny example project or recorded walkthrough without bloating the plugin.
- Consider a deterministic Playwright helper for CLI evaluation.
- Consider slimming the SessionStart hook injection (short pointer instead of the full skill text
  for repositories without harness markers).
