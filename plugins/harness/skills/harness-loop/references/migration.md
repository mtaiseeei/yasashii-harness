# Existing repository guidance maintenance

Plugin installation does not rewrite repository instructions. Initialization remains
no-overwrite; explicitly authorized maintenance is a separate operation. Reuse the
user's existing authorization for the intended documents. Source hashes bind the reviewed
bytes and are not a new human approval gate. Do not migrate unrelated consumer repos.

## Inspect and choose existing sources

```bash
node <plugin>/scripts/harness.mjs upgrade --root <repo>
node <plugin>/scripts/harness.mjs check --root <repo>
node <plugin>/scripts/harness.mjs init --root <repo> --spec-path planning/requirements.md --state-path planning/current.md
```

`upgrade` without a plan inventories only root guidance, the Harness supplement and
current spec/state candidates, reporting bytes, lines, hashes and possible old rules.
It does not enumerate or read all Sprint history. Legacy matches are prompts for a
semantic inspection, not proof that every conflicting instruction was detected.
`init` creates only missing root guidance/config, a short specification index and
current state when none is discovered. It never seeds six domain documents or
CONTEXT.md. It recognizes conventional source names and relevant root guidance
links; explicit source flags support other layouts. Multiple existing candidates
are reported rather than replaced. Follow the project's actual canonical source;
do not treat every candidate as a required read. Use explicit flags when checking
or initializing a layout that discovery cannot identify.

## Prepare the reviewed candidate

The acting Agent reads the current source, the relevant specification and only the
history needed to resolve contradictions. It prepares replacement Markdown and a
JSON plan outside the target documents. The CLI does not infer a semantic summary
or decide which customer rules can be removed. For a managed block, replace only
that block and retain all surrounding bytes in `content`. An unknown document needs
an explicit scoped candidate. Never change runtime configuration or Agent definitions
through this maintenance command.

```json
{
  "version": 1,
  "id": "guidance-20260912-a1",
  "files": [{
    "path": "AGENTS.md",
    "beforeSha256": "<SHA256 of the exact current bytes>",
    "content": "<complete reviewed UTF-8 replacement>",
    "preserve": ["<exact existing custom rule or active constraint>"],
    "retire": ["<exact superseded instruction removed from the candidate>"]
  }]
}
```

Every entry names an existing Markdown document inside the repository, including
custom canonical layouts such as `planning/current.md`. No deletions, config,
Agent definitions, hidden directories, plugin implementation, path traversal, symlink destinations or duplicate paths are
accepted. `preserve` and `retire` are required arrays: populate them with the rules
relevant to the change. Preserve effective approvals, constraints and unresolved
items verbatim; the command additionally checks unchecked tasks and recognized
unresolved/approval/constraint sections. This mechanical check does not recognize
all natural-language decisions. The reviewing Agent must check any other active
rules and state meaning, then include exact important fragments in `preserve`.

For a large state, retain the current purpose, work, unresolved items, next action,
authorization/constraints, specification links and validation revision/evidence.
Distinguish implemented, verified and deployed. Do not create competing current
state in NEXT_SESSION/PROJECT. The original state remains in the migration archive.
When the candidate needs a historical link, choose the optional stable `id` before
writing the candidate (8-64 lowercase letters/digits/hyphens, unique per plan), then
link `.harness/migrations/<id>/originals/<original-path>` relative to the live document.
Preview permits only those exact archive targets that this plan will preserve;
post-apply checks verify that they exist. This avoids making the archive link depend
on the hash of its own content. Without an explicit `id`, a plan hash supplies the id.
Link that archive only when the original historical detail is needed. Do not turn
an approximate size target into a stopping condition or compress into giant lines.
A replaced decision must be identified as superseded in its relevant specification
or decision record, with the old decision retained in history.

## Preview, apply, verify

```bash
node <plugin>/scripts/harness.mjs upgrade --root <repo> --plan <reviewed.json>
node <plugin>/scripts/harness.mjs upgrade --root <repo> --plan <reviewed.json> --apply
```

Preview writes nothing and prints the exact before/after document text, paths,
byte counts and hashes. Review changes within the authorized scope, including
custom rules, obsolete constraints and links. Apply rejects stale source hashes,
missing protected text, retained `retire` rules, unsafe paths and broken relative
file links in the candidates. Markdown anchors and prose semantics need Agent review.
The command uses no Git reset/stash/index writes, preserves unrelated dirty files,
and records exact original bytes plus the plan under
`.harness/migrations/<plan-id>/originals/<original-path>` with an applied result.
Those archived originals are byte-preserved audit copies, not relocated live specs:
resolve their historical relative links from their original paths recorded by the
plan. Check live-document links, not links inside raw backup copies. The archive may
contain private project context; it belongs to that project and is not a public fixture.

Apply checks output hashes and links, then reports the recovery path. Repeating a
fully applied plan is a no-op. A changed source requires a new candidate and preview,
not overwriting with an old plan. Partial/failed applies retain backups; inspect the
reported archive before recovery. In-process failures attempt rollback only while
the document still equals this command's output, so another writer's edit is not
reverted. This is a local maintenance operation, not a crash-proof transaction.

Finish by checking the relevant current source/spec references, unresolved items,
active approvals, old rules and the requested product behavior. Record the migrated
revision and evidence in the current state, preserving history without appending
unbounded follow-up logs. Do not update installed caches or unrelated repositories
unless authorized separately.
