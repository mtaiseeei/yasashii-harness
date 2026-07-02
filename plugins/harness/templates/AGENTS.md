# Harness-Driven Development

This repository can use Agentic Harness for substantial app or feature work. When the user asks to build an app, site, tool, or multi-step feature, prefer the harness loop instead of a single unstructured implementation pass.

In Codex, normally just ask Codex to build the app or feature. The harness entry skill should detect the request and start the loop. For explicit startup, use:

```text
$using-harness <short product idea>
```

or:

```text
$harness-loop <short product idea>
```

## Loop

1. Planner turns the idea into a short `docs/spec.md` index, detailed `docs/spec/*.md` files (including `docs/spec/rubric.md`), and sprint contracts in `docs/sprints/`.
2. Generator implements one sprint, grows the automated regression suite, and updates the matching `docs/progress/sprint-*.md`.
3. Evaluator runs the app, verifies behavior against the rubric with recorded evidence, and writes the matching `docs/feedback/sprint-*.md`.
4. The orchestrator records the outcome in `docs/sprints/state.md` before moving on. Failed sprints go back to Generator (or to Planner when feedback is classified as a spec issue). Passed sprints move forward. Three consecutive failures on one sprint escalate to the user.

If the host cannot dispatch subagents, run the three roles as strictly separated work units using the role definitions in the plugin's `agents/*.md`: one role per work unit, each writing only its own canonical files, and never reusing Generator's self-evaluation as the verdict.

## Canonical Files

| File | Purpose | Only writer |
|---|---|---|
| `docs/spec.md` | Short canonical index and links to required spec files | Planner |
| `docs/spec/product.md` | Product purpose, users, goals, non-goals, success state | Planner |
| `docs/spec/features.md` | Cross-sprint feature list and user-visible behavior | Planner |
| `docs/spec/constraints.md` | Cross-cutting constraints, prohibitions, safety and privacy rules | Planner |
| `docs/spec/domain.md` | Domain rules, conceptual data, KPI/calculation definitions | Planner |
| `docs/spec/ui.md` | Product-wide UI/UX requirements | Planner |
| `docs/spec/rubric.md` | Scoring thresholds and per-score anchor examples | Planner |
| `docs/sprints/state.md` | Execution state: Current ID, per-sprint status, retry count | Orchestrator (main agent) |
| `docs/sprints/sprint-NNN.md` | Main sprint contract, e.g. `sprint-005.md` | Planner |
| `docs/sprints/sprint-NNN-patch-PPP.md` | Patch sprint contract, e.g. `sprint-005-patch-001.md` | Planner |
| `docs/progress/sprint-*.md` | Implementation progress, self-evaluation, startup/test handoff | Generator |
| `docs/feedback/sprint-*.md` | Evaluator result, scores, evidence, bugs, reproduction steps | Evaluator |

Do not cross these ownership boundaries. If a role finds a problem outside its file, record it in its own handoff instead of editing another role's source of truth.
Sprint statuses in `state.md` are: `planned`, `active`, `awaiting-eval`, `done`, `deferred`, `superseded`. Never skip or reorder sprints silently; record `deferred`/`superseded` with a reason.
An older `docs/sprints/current.md` is a legacy pointer: convert it into `docs/sprints/state.md` once, then treat it as read-only reference. If an older `docs/progress.md` exists, treat it as a legacy reference log and do not append new sprint progress there.
Use zero-padded sprint IDs. Do not create decimal sprint IDs such as `sprint-5.1` or `sprint-5.10`.
For work between main sprints, use `sprint-NNN-patch-PPP`.

## Small Changes In A Harness-Managed Repository

Do not default to fixing things outside the loop. Classify every follow-up request:

1. Direct fix — typos, comments, docs, config values that do not change app behavior.
2. Micro patch (`Type: micro`) — a small behavior/UI change confined to one screen and one flow, already covered by an automated regression check. Gets a lightweight evaluation (completeness, stability, no-regression only).
3. Regular patch sprint or next main sprint — everything else.

## Planning Rules

- Planner describes what the product should do, not how to implement it.
- Planner should ask the user to decide major product direction before writing the full spec.
- Use Codex's structured user input UI when available. Ask at most three multiple-choice questions per round, with 2-3 options and a recommended option when appropriate.
- Continue the question loop until the target user, core experience, success state, scope boundaries, and experience direction are clear.
- If the user explicitly says to proceed or leave it to the agent, put cross-cutting uncertainty in `docs/spec/product.md` or `docs/spec/constraints.md`, and sprint-specific uncertainty in the target `docs/sprints/sprint-*.md`.
- Planner generates `docs/spec/rubric.md` at initialization, adjusting design/originality thresholds to the project type. Evaluator proposes rubric changes in feedback; only Planner applies them.
- Invariants confirmed by accepted sprints ("never regress this") are promoted into `docs/spec/constraints.md`, not accumulated in state files.
- Avoid premature stack, schema, endpoint, or component decisions in the spec files.
- If a decision changes the product direction, ask the user before implementation.
- Prefer ambitious but testable product behavior over a tiny CRUD-only MVP.

## Implementation Rules

- Generator works one sprint at a time.
- Keep the app runnable at the end of every sprint.
- Read `docs/spec.md`, the required `docs/spec/*.md` files, `docs/sprints/state.md`, and the target `docs/sprints/sprint-*.md` before editing code.
- When acceptance criteria pass, add automated checks that protect them to the regression suite, and record the suite's run command in the progress handoff. Checks assert behavior and data, not fragile visual string matches.
- Update the matching `docs/progress/sprint-*.md` with implemented features, known issues, startup command, test URL, regression-check command, and concrete evaluation scenarios.
- Fix failing feedback before starting a new sprint.
- Prefix Generator-authored commit messages with the sprint ID, e.g. `[sprint-010-patch-008]`. Never run `git init` inside an existing repository.
- Do not silently include user-requested work that is outside the current acceptance criteria. Record it as a scope change and route it to Planner for an automatically numbered patch sprint (micro when it qualifies).

## Evaluation Rules

- Evaluator must operate the real app before marking a sprint complete.
- Score against `docs/spec/rubric.md`; one failed threshold means the sprint fails.
- A pass requires recorded evidence: executed commands with results, and the concrete URL/DOM/browser interactions checked. Screenshots are mandatory whenever UI, responsiveness, or visual quality is scored. A pass without evidence is invalid.
- Run the handed-over regression suite as the baseline for the no-regression score, then manually verify the surfaces this sprint touched.
- Classify failures as `implementation-issue` (back to Generator) or `spec-issue` (back to Planner via the orchestrator).
- For patch sprints such as `sprint-005-patch-001`, verify the patch behavior, base sprint regression, and absence of next-main-sprint feature leakage. `Type: micro` patches get the lightweight scoring set.

Browser verification priority:

1. Codex App: Browser Use / `@Browser`.
2. Codex CLI: Playwright test or Playwright script; use a Playwright MCP only if the host already provides one.
3. Exceptions: real Chrome or Computer Use only when signed-in browser state or GUI-only behavior is required.
4. Fallback: build, HTTP checks, static screenshots, and explicit manual verification notes.

## Done Means Verified

Do not declare completion only because code was written. A sprint is complete only after Evaluator verifies the running product with evidence and the orchestrator records the result in `docs/sprints/state.md`.

## Model Policy

Do not pin this workflow to a host-specific model name in reusable guidance. Inherit the user's current model by default. If the host supports role-specific model choice and the user wants quality over cost, Planner and Evaluator may use the strongest available reasoning model for that host.
