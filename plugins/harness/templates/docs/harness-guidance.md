# Agentic Harness Guidance

Use this file when the repository already has `CLAUDE.md` or `AGENTS.md` and the harness initializer must not overwrite them.

## Suggested Block For Existing Guidance Files

```markdown
## Harness-Driven Development

For substantial app, site, tool, or multi-step feature work, use Agentic Harness.

- Normal flow: the user can simply ask to build the app or feature; the harness entry skill should detect it.
- Explicit flow: use `/harness <idea>` or the installed harness skill directly.
- Planner writes the specification source of truth and focuses on what the product should do:
  `docs/spec.md` as a short index, `docs/spec/*.md` for cross-sprint product details, and
  `docs/sprints/sprint-N.md` for sprint contracts.
- Planner asks the user to choose major product direction with short multiple-choice questions before writing the full spec.
- Generator writes `docs/progress/sprint-N.md` and implements one sprint at a time.
- Evaluator writes `docs/feedback/sprint-N.md` after operating the real app.
- Treat any older `docs/progress.md` as a legacy reference log; do not append new sprint progress there.
- Do not cross file ownership boundaries.
- Do not mark work complete until Evaluator verifies the running product.
- Browser verification priority: app-native browser preview first, CLI Playwright second, manual fallback last.
```

## No-Overwrite Policy

- If `CLAUDE.md` or `AGENTS.md` already exists, do not overwrite it.
- Add the suggested block manually only after checking that it does not conflict with existing project rules.
- Keep project-specific commands and conventions in the existing guidance file. Harness guidance should only define the Planner -> Generator -> Evaluator workflow.
