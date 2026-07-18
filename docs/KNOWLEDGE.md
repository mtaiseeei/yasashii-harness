# agentic-harness Knowledge Base

This document preserves the background, references, and design decisions behind this repository. Use it when handing the project to another agent or person.

For usage, see `README.md`. For the runtime loop, see `plugins/harness/skills/harness-loop/SKILL.md`.

Implemented design record: [`Codex model routing と自動昇格`](proposals/codex-model-routing.md).

## Summary

**A short instruction is the entry point. Keeping substantial development moving over time is the core product.**

Harness-driven development connects product decisions, implementation, independent evaluation, and state transitions through
three separate roles, file-backed sources of truth, and sprints. It can start from a short new idea or continue an existing
repository from its recorded state. The input can be small while the work spans many decisions, sessions, and sprints.

Planner, Generator, and Evaluator are three roles, not a promise that every host receives or launches exactly three Subagent
instances. Harness uses multiple agents when the host provides a real dispatch surface; otherwise it runs one role per
independent work unit. Generator and Evaluator remain separate in both modes.

```text
Planner -> Generator -> Evaluator
              ^             |
              |-------------|
              failed sprint
```

The central idea is adversarial separation: the agent that builds the product should not be the only judge of whether the product is good.

This is not a guarantee of unattended completion, enterprise scale, duration, or quality. Important product decisions remain
user-owned, every sprint crosses an evidence-backed evaluation gate, and three consecutive failures return to the user.

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
- Keep target repositories install-free by bundling required parser code and licenses inside the plugin.
- Use brainstorm -> plan -> execute -> verify.
- Support multiple host ecosystems without coupling to another plugin.

## Design Decisions In This Repository

### Product Positioning: Short Entry, Long-Running Core

The canonical message is: **"A short instruction is the entry point. Keeping substantial development moving over time is the core product."**

Earlier install-facing copy over-emphasized turning a short idea into an app and described the system as "three agents." That
framing made Harness sound like a one-shot generator and overstated what the Codex package distributes. The product is instead
positioned around continuing development that is too substantial to finish safely in one implementation request: for example,
a business system that is large for a small or midsize company, a new service built over multiple sprints, or long-term work in
an existing repository.

Short instructions remain important because they lower the cost of starting. Planner turns them into user-owned decisions,
specification files, and sprint contracts; they do not limit the size of the resulting product. For an existing Harness-managed
repository, the normal entry can instead be "continue from `docs/sprints/state.md`" or a request for the next sprint or patch.

The durable product promise is role separation and file-backed continuity:

- Planner owns product truth and sprint contracts.
- Generator implements one sprint and grows regression protection.
- Evaluator is independent from Generator and records evidence-backed pass/fail feedback.
- The orchestrator records every transition before the loop moves on and routes implementation failures, specification
  failures, and three-failure escalation to the appropriate owner.

Runtime lifecycle and per-role model/effort configuration support this method, but they are operational controls rather than
the top-level value proposition.

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

### No Target-Repository Dependency Installation

The core method does not require another plugin. Its TOML parser is fixed and bundled inside this plugin, so target
repositories need no package manifest, lockfile, `node_modules`, package-manager run, or network access. Playwright is
a CLI verification fallback, not a hard runtime dependency for every host.

### Multi-Host Support

This repository supports:

- Claude Code plugin marketplace via `.claude-plugin/marketplace.json`.
- Codex repo marketplace via `.agents/plugins/marketplace.json`.
- Claude Code plugin manifest via `plugins/harness/.claude-plugin/plugin.json`.
- Codex plugin manifest via `plugins/harness/.codex-plugin/plugin.json`.

The same three-role method is preserved across hosts, but the execution surfaces are not treated as identical. Claude Code can
use plugin role agents when its Subagent surface is available. Codex distribution carries skills rather than those role-agent
definitions, so Codex uses an existing capable spawn surface when present and independent role work units otherwise.

### Configurable Agent Runtime

Shared runtime intent lives in `.harness/config.toml`; `.harness/config.local.toml` supplies personal leaf-only
overrides and is ignored by the nested `.harness/.gitignore`. Resolution order is personal explicit value, shared
explicit value, then plugin default. Lifecycle defaults to `balanced`. Claude Code role model/effort defaults remain
`inherit`; Codex defaults Planner and Evaluator to `gpt-5.6-sol` / `high`, standard Generator to
`gpt-5.6-luna` / `xhigh`, and strong Generator to `gpt-5.6-sol` / `high`.

`balanced` reuses the same role between Sprints only when `resume: true` is backed by host metadata showing that the
routed model and effort are preserved; merely accepting a follow-up is insufficient. `fresh` rotates Generator and
Evaluator at a new Sprint boundary. Same-Sprint retries resume only with that same preservation evidence, and a
Generator model-tier change always forces fresh work.
Generator and Evaluator never share a session. Model and effort are resolved independently per host and role, with no
cross-host name translation. Unsupported leaves warn and fall back to inheritance. If standard Luna is confirmed
unavailable, routing tries the configured strong Sol/high pair; if Sol is also unavailable, both leaves inherit.
Terra is not an automatic standard, strong, or availability-fallback candidate.

Generator routing is file-backed through `Model Tier: standard | strong` and an explicit `Rotate` reason in
`docs/sprints/state.md`. High-risk Sprints start strong. The second consecutive `implementation-issue`, or an
evidence-verified Evaluator recommendation accepted by the orchestrator, changes the tier to strong. The orchestrator
records that transition before fresh dispatch and never resumes the old Luna Generator. The third consecutive failure
stops for user input. A `spec-issue` returns to Planner without consuming Generator escalation.
Failure/risk/recommendation-driven tier changes use `Rotate: model-escalation`; availability fallback from an unavailable
standard model uses `Rotate: model-availability`. When Generator is not the next role, its resolved model tier is null and
must not be persisted over the last actually dispatched tier.
The resolver receives the current state value through `currentModelTier` / `--current-model-tier`; it forces fresh work
only when the desired tier differs. Re-resolving an already-strong retry, high-risk Sprint, recommendation, or
availability fallback resumes the strong Generator only when routing-preserving resume is evidenced.
For a pre-routing state file with no `Model Tier`, the orchestrator passes `unknown` rather than assuming standard.
The resolver treats unknown-to-desired as a tier change, so the orchestrator records the desired `standard` or `strong`
value with `Rotate: runtime-migration` and performs one fresh dispatch. `unknown` is resolver input only and is never
persisted. If `Model Tier` exists and only `Rotate` is missing, the orchestrator adds `Rotate: none`. This lazy,
no-overwrite migration runs when Harness next continues the repository; installing or updating the plugin does not edit
existing Harness-managed repositories.
After a passing Sprint, state retains the tier of the last actually dispatched Generator while advancing Current ID and
resetting Retry Count. Step 2 passes that retained tier to the resolver, compares it with the next Sprint's desired tier,
then records Model Tier and Rotate before dispatch. Only terminal completion with no next dispatch resets the state to
`standard` / `none`; this preserves detection of a strong-to-standard change.

The shared TOML is self-describing through ordinary comments, including lifecycle semantics, parent-main-session
inheritance, fallback policy, and purpose-labelled official URLs. Comments never enter the resolved data. Model input
is only trimmed; the resolver never fuzzy-matches or translates an ambiguous name. Confirmed candidates may appear in
a warning, but are never selected automatically.

Legacy `.harness/config.json` and `.harness/config.local.json` remain read-compatible when no TOML config exists and
produce a migration warning. If either TOML config exists, TOML is canonical and legacy JSON is diagnosed but never
merged. The initializer does not create competing TOML in a repository that still contains legacy JSON.

Claude Code exposes a subagent model control, while role effort requires a concrete agent-definition frontmatter or
another explicitly observed role-level application path. The default Claude Code `roleEffort` capability is therefore
unknown, not true. The Codex plugin catalog distributes
skills, not agent definitions, so Codex needs an existing project custom agent or capable spawn surface. Harness never
overwrites `.claude/agents/`, `.codex/agents/`, guidance, or existing config to manufacture support.

The orchestrator owns capability collection at Harness start and whenever host state changes. It passes an observed
JSON file with `--capabilities <file>`; unknown fields stay null or omitted. Available value lists and actual role-level
`applicationPaths` are separate evidence. Missing, malformed, or mistyped capability files produce warnings and
conservative inheritance rather than a false applied state.

The resolver calls a value `dispatch-ready` only when availability and a concrete role-level application path are both
present. That result is not launch evidence. `launch-verified` requires model/effort metadata from the host session,
trace, or dispatch record; without it, actual Subagent launch remains unverified. The orchestrator is the current main
chat, not a spawned role, so runtime config never claims to change its model.

`scripts/resolve-runtime-config.mjs` loads the bundled `smol-toml@1.7.0` parser and defines merge/fallback behavior;
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
unit, strict file ownership, and never reusing Generator's self-evaluation as the verdict. Install-facing copy must therefore
describe Planner, Generator, and Evaluator as roles and place any multiple-Agent claim next to this host-dependent fallback.

### Model Policy

The plugin does not hardcode or infer Claude-specific model names such as `opus`; Claude Code inherits the host/user
model and effort unless the user supplies a host-valid explicit override. Codex uses the Sol/Luna role defaults described
above, but only through a confirmed Codex custom-agent or spawn surface. Codex names are never translated into Claude
names. A config or resolver value alone is not proof that a Subagent launched with it.

#### Verified Codex surface matrix (2026-07-18)

The full role-model routing path is currently verified on Codex CLI: a Sol/high CLI parent used native `spawn_agent`
with `fork_turns: "none"` to launch a fresh Luna/xhigh child, and the child rollout metadata recorded
`gpt-5.6-luna` / `xhigh`. This was a native CLI subagent launch, not a shell-level direct `codex exec -m luna` substitute.

Codex App is partially capable on the same date. Fresh Sol/high and Terra/xhigh overrides matched child metadata, while
an explicit Luna request failed with `Unknown model`. A follow-up turn on completed Sol/high and Terra/xhigh children
recorded Sol/low, so App resume is not treated as preserving routed model/effort. This is observed runtime evidence,
not a permanent product rule.

Shared `.harness/config.toml` therefore expresses desired role values only; it does not duplicate App and CLI settings.
The orchestrator supplies a current capability snapshot with available models, efforts, and role-level application paths.
If a future App snapshot includes Luna and native spawn arguments, the existing standard Generator setting resolves to
Luna/xhigh without a config migration. Until resume preservation is evidenced for the active surface, routed Codex role
work uses a fresh non-full-history spawn. Terra remains available for an explicit user override but is never an automatic
standard, strong, or availability-fallback choice.

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
