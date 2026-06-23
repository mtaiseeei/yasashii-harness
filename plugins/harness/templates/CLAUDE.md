# Harness-Driven Development

This repository can use Agentic Harness for substantial app or feature work. When the user asks to build an app, site, tool, or multi-step feature, prefer the harness loop instead of a single unstructured implementation pass.

Start with:

```text
/harness <short product idea>
```

## Loop

1. Planner turns the idea into `docs/spec.md`.
2. Generator implements one sprint and updates `docs/progress.md`.
3. Evaluator runs the app, verifies behavior, and writes `docs/feedback/sprint-N.md`.
4. Failed sprints go back to Generator. Passed sprints move forward.

## Canonical Files

| File | Purpose | Only writer |
|---|---|---|
| `docs/spec.md` | Product specification and sprint acceptance criteria | Planner |
| `docs/progress.md` | Implementation progress, self-evaluation, startup/test handoff | Generator |
| `docs/feedback/sprint-N.md` | Evaluator result, scores, bugs, reproduction steps | Evaluator |

Do not cross these ownership boundaries. If a role finds a problem outside its file, record it in its own handoff instead of editing another role's source of truth.

## Planning Rules

- Planner describes what the product should do, not how to implement it.
- Avoid premature stack, schema, endpoint, or component decisions in `docs/spec.md`.
- If a decision changes the product direction, ask the user before implementation.
- Prefer ambitious but testable product behavior over a tiny CRUD-only MVP.

## Implementation Rules

- Generator works one sprint at a time.
- Keep the app runnable at the end of every sprint.
- Update `docs/progress.md` with implemented features, known issues, startup command, test URL, and concrete evaluation scenarios.
- Fix failing feedback before starting a new sprint.

## Evaluation Rules

- Evaluator must operate the real app before marking a sprint complete.
- Capture or reference visual evidence when UI quality matters.
- Score against thresholds; one failed threshold means the sprint fails.
- Be strict about regressions. Existing accepted behavior must keep working.

Browser verification priority:

1. Claude Code Desktop App: Preview pane / autoVerify.
2. Claude Code CLI: Playwright test, Playwright script, or Playwright MCP.
3. Exceptions: real Chrome or Computer Use only when signed-in browser state or GUI-only behavior is required.
4. Fallback: build, HTTP checks, static screenshots, and explicit manual verification notes.

## Done Means Verified

Do not declare completion only because code was written. A sprint is complete only after Evaluator verifies the running product and writes feedback.

