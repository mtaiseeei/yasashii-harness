# Agentic Harness Guidance

Use this suggested block only when an existing AGENTS.md/CLAUDE.md needs a Harness pointer.
Preserve project-specific rules and existing files; the initializer never overwrites them.

```markdown
## Harness

For substantial development or an existing Sprint, load the installed `harness:using-harness` Skill
(`skills/using-harness/SKILL.md` under the plugin root), then follow its conditional links to
`skills/harness-loop/SKILL.md`. Ordinary user requests work; explicit entries are `/harness <idea>`
(Claude Code) and `$using-harness <idea>` (Codex).

Planner owns specs/contracts, Generator owns implementation/progress, independent Evaluator owns
feedback, and only the orchestrator writes docs/sprints/state.md. Evidence is required for completion.
Honor existing authorization; preserve dirty work, user-owned decisions and initialization no-overwrite.
Authorized guidance maintenance may merge necessary edits while preserving project rules and existing changes;
it does not authorize changing runtime/model settings or Agent definitions.
Runtime, migration, small patches and special failures are defined in the loop's conditional references;
do not duplicate their full text here.
```
