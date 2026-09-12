# Harness-Driven Development

For substantial app/feature work or continuation of a Harness-managed repository, load the installed
`harness:using-harness` Skill (`skills/using-harness/SKILL.md` under the current plugin root).
It routes to `skills/harness-loop/SKILL.md`, the canonical normal flow. Read its references only when
that step applies; do not copy the entire loop into project guidance. Honor the current request and existing authorization.

## Boundaries

- Planner owns `docs/spec.md`, related `docs/spec/*.md` including rubric, and `docs/sprints/sprint-*.md` contracts.
- Generator owns implementation and `docs/progress/sprint-*.md`; Evaluator independently runs the product
  and owns `docs/feedback/sprint-*.md`. Do not reuse Generator self-evaluation as the verdict.
- Only the orchestrator writes `docs/sprints/state.md`; record outcomes before proceeding. Keep Status there only.
- A pass needs actual execution evidence. UI uses browser interaction; non-UI uses commands/API/input-output.
- Preserve user-owned decisions, existing dirty work, credentials and external-action authorization.
  Initialization never overwrites existing guidance, runtime configuration or Agent definitions.
  Explicitly authorized guidance maintenance may merge necessary edits while preserving project rules and dirty work;
  it does not authorize changing model settings or Agent definitions. Git publication needs session authorization.

## Conditional details in the installed plugin

- Small follow-ups, changed criteria or failures: `skills/harness-loop/references/scope.md`.
  It defines direct/micro/regular patches, bounded verification repair, user approval and dispatch limits.
- Evaluation or evidence reuse: `skills/harness-loop/references/evaluation.md`.
- Initial dispatch, host/config changes or model/lifecycle uncertainty: `skills/harness-loop/references/runtime.md`.
- Initialization, missing state fields or legacy migration: `skills/harness-loop/references/state.md`.
- Planning decisions: `agents/planner.md`; output examples only when needed:
  `skills/harness-loop/references/planner-templates.md`.

Claude Code and Codex inherit the host model/effort by default. Respect explicitly configured values through
the resolver; do not infer model aliases or claim launch verification without child metadata.
When subagents are unavailable, use separate role work units with the same ownership and independent evaluation.

Claude Code entry: `/harness <idea>` (ordinary requests also work).
