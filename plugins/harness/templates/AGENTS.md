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

1. Planner turns the idea into a short `docs/spec.md` index, detailed `docs/spec/*.md` files, and sprint contracts in `docs/sprints/`.
2. Generator implements one sprint and updates `docs/progress/sprint-N.md`.
3. Evaluator runs the app, verifies behavior, and writes `docs/feedback/sprint-N.md`.
4. Failed sprints go back to Generator. Passed sprints move forward.

## Canonical Files

| File | Purpose | Only writer |
|---|---|---|
| `docs/spec.md` | Short canonical index and links to required spec files | Planner |
| `docs/spec/product.md` | Product purpose, users, goals, non-goals, success state | Planner |
| `docs/spec/features.md` | Cross-sprint feature list and user-visible behavior | Planner |
| `docs/spec/constraints.md` | Cross-cutting constraints, prohibitions, safety and privacy rules | Planner |
| `docs/spec/domain.md` | Domain rules, conceptual data, KPI/calculation definitions | Planner |
| `docs/spec/ui.md` | Product-wide UI/UX requirements | Planner |
| `docs/sprints/current.md` | Current/next sprint pointer and required handoff paths | Planner |
| `docs/sprints/sprint-N.md` | Sprint-specific goal, assumptions, and acceptance criteria | Planner |
| `docs/progress/sprint-N.md` | Implementation progress, self-evaluation, startup/test handoff | Generator |
| `docs/feedback/sprint-N.md` | Evaluator result, scores, bugs, reproduction steps | Evaluator |

Do not cross these ownership boundaries. If a role finds a problem outside its file, record it in its own handoff instead of editing another role's source of truth.
If an older `docs/progress.md` exists, treat it as a legacy reference log and do not append new sprint progress there.

## Planning Rules

- Planner describes what the product should do, not how to implement it.
- Planner should ask the user to decide major product direction before writing the full spec.
- Use Codex's structured user input UI when available. Ask at most three multiple-choice questions per round, with 2-3 options and a recommended option when appropriate.
- Continue the question loop until the target user, core experience, success state, scope boundaries, and experience direction are clear.
- If the user explicitly says to proceed or leave it to the agent, put cross-cutting uncertainty in `docs/spec/product.md` or `docs/spec/constraints.md`, and sprint-specific uncertainty in `docs/sprints/sprint-N.md`.
- Avoid premature stack, schema, endpoint, or component decisions in the spec files.
- If a decision changes the product direction, ask the user before implementation.
- Prefer ambitious but testable product behavior over a tiny CRUD-only MVP.

## Implementation Rules

- Generator works one sprint at a time.
- Keep the app runnable at the end of every sprint.
- Read `docs/spec.md`, the required `docs/spec/*.md` files, `docs/sprints/current.md`, and the target `docs/sprints/sprint-N.md` before editing code.
- Update `docs/progress/sprint-N.md` with implemented features, known issues, startup command, test URL, and concrete evaluation scenarios.
- Fix failing feedback before starting a new sprint.

## Evaluation Rules

- Evaluator must operate the real app before marking a sprint complete.
- Capture or reference visual evidence when UI quality matters.
- Score against thresholds; one failed threshold means the sprint fails.
- Be strict about regressions. Existing accepted behavior must keep working.

Browser verification priority:

1. Codex App: Browser Use / `@Browser`.
2. Codex CLI: Playwright test, Playwright script, or Playwright MCP.
3. Exceptions: real Chrome or Computer Use only when signed-in browser state or GUI-only behavior is required.
4. Fallback: build, HTTP checks, static screenshots, and explicit manual verification notes.

## Done Means Verified

Do not declare completion only because code was written. A sprint is complete only after Evaluator verifies the running product and writes feedback.

## Model Policy

Do not pin this workflow to a host-specific model name in reusable guidance. Inherit the user's current model by default. If the host supports role-specific model choice and the user wants quality over cost, Planner and Evaluator may use the strongest available reasoning model for that host.
