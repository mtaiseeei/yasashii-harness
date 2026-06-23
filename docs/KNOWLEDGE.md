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

Planner writes what the product should do in `docs/spec.md`. Planner should not decide stack, database schema, endpoint shape, component structure, or other implementation details. If Planner guesses wrong, the mistake propagates into Generator and Evaluator.

Generator owns how to implement the sprint.

### Persist Handoffs In Files

The loop communicates through files:

- `docs/spec.md`: Planner output.
- `docs/progress.md`: Generator output.
- `docs/feedback/sprint-N.md`: Evaluator output.

This makes state durable across sessions and keeps context recovery cheap.

### Keep One Writer Per Canonical File

Each file has exactly one owner:

| File | Only writer |
|---|---|
| `docs/spec.md` | Planner |
| `docs/progress.md` | Generator |
| `docs/feedback/sprint-N.md` | Evaluator |

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
- Codex uses plugin-distributed skills and progressive disclosure.
- `/harness` initialization may generate guidance files only when they do not already exist.
- If guidance files exist, `/harness` writes `docs/harness-guidance.md` with a suggested block.

### Zero-Dependency By Default

The core method should not require another plugin. Playwright is a CLI verification fallback, not a hard runtime dependency for every host.

### Multi-Host Support

This repository supports:

- Claude Code plugin marketplace via `.claude-plugin/marketplace.json`.
- Codex repo marketplace via `.agents/plugins/marketplace.json`.
- Claude Code plugin manifest via `plugins/harness/.claude-plugin/plugin.json`.
- Codex plugin manifest via `plugins/harness/.codex-plugin/plugin.json`.

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

- Add `feature_list.json` support for stricter pass/fail tracking.
- Add Windows-compatible hook/script paths.
- Add a tiny example project or recorded walkthrough without bloating the plugin.
- Consider a deterministic Playwright helper for CLI evaluation.

