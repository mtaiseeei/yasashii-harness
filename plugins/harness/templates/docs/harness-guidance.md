# Agentic Harness Guidance

Use this file when the repository already has `CLAUDE.md` or `AGENTS.md` and the harness initializer must not overwrite them.

## Suggested Block For Existing Guidance Files

```markdown
## Harness-Driven Development

For substantial app, site, tool, or multi-step feature work, use Agentic Harness.

- Normal flow: the user can simply ask to build the app or feature; the harness entry skill should detect it.
- Explicit flow: use `/harness <idea>` (Claude Code) or `$using-harness <idea>` (Codex).
- Planner writes the specification source of truth and focuses on what the product should do:
  `docs/spec.md` as a short index, `docs/spec/*.md` for cross-sprint product details (including the
  scoring rubric `docs/spec/rubric.md`), and `docs/sprints/sprint-NNN.md` or
  `docs/sprints/sprint-NNN-patch-PPP.md` for sprint contracts.
- Planner asks the user to choose major product direction with short multiple-choice questions before writing the full spec.
- Generator writes the matching `docs/progress/sprint-*.md`, implements one sprint at a time, and grows
  an automated regression suite that protects accepted acceptance criteria.
- Evaluator writes the matching `docs/feedback/sprint-*.md` after operating the real app. A pass requires
  recorded evidence (commands, URL/DOM interactions, screenshots when visual quality is scored).
- The orchestrator (main agent) is the only writer of `docs/sprints/state.md`, the execution-state source
  of truth (Current ID, per-sprint status, retry count). Record every pass/fail there before moving on.
  Three consecutive failures on one sprint escalate to the user; spec-issue failures go back to Planner.
- Use zero-padded sprint IDs like `sprint-005.md`; do not create decimal IDs like `sprint-5.10.md`.
- In a harness-managed repository, classify small follow-ups instead of fixing them outside the loop:
  direct fix (non-behavioral), micro patch (`Type: micro`, lightweight evaluation), or a regular patch
  sprint such as `sprint-005-patch-001.md`.
- Treat an older `docs/sprints/current.md` as a legacy pointer (convert to `state.md` once) and any older
  `docs/progress.md` as a legacy reference log; do not append new sprint progress there.
- Do not cross file ownership boundaries.
- Do not mark work complete until Evaluator verifies the running product with evidence.
- Browser verification priority: app-native browser preview first, CLI Playwright second, manual fallback last.
```

## No-Overwrite Policy

- If `CLAUDE.md` or `AGENTS.md` already exists, do not overwrite it.
- Add the suggested block manually only after checking that it does not conflict with existing project rules.
- Keep project-specific commands and conventions in the existing guidance file. Harness guidance should only define the Planner -> Generator -> Evaluator workflow.
