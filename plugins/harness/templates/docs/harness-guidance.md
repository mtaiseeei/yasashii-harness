# Agentic Harness Guidance

Use this file when the repository already has `CLAUDE.md` or `AGENTS.md` and the harness initializer must not overwrite them.

## Suggested Block For Existing Guidance Files

```markdown
## Harness-Driven Development

For substantial app, site, tool, or multi-step feature work, use Agentic Harness.

- Planner writes `docs/spec.md` and focuses on what the product should do.
- Generator writes `docs/progress.md` and implements one sprint at a time.
- Evaluator writes `docs/feedback/sprint-N.md` after operating the real app.
- Do not cross file ownership boundaries.
- Do not mark work complete until Evaluator verifies the running product.
- Browser verification priority: app-native browser preview first, CLI Playwright second, manual fallback last.
```

## No-Overwrite Policy

- If `CLAUDE.md` or `AGENTS.md` already exists, do not overwrite it.
- Add the suggested block manually only after checking that it does not conflict with existing project rules.
- Keep project-specific commands and conventions in the existing guidance file. Harness guidance should only define the Planner -> Generator -> Evaluator workflow.

