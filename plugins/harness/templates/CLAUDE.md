# Harness-Driven Development

This repository can use Agentic Harness for substantial app or feature work. When the user asks to build an app, site, tool, or multi-step feature, prefer the harness loop instead of a single unstructured implementation pass.

Normally, just ask Claude Code to build the app or feature. The harness entry skill should detect the request and start the loop. For explicit startup, use:

```text
/harness <short product idea>
```

## Loop

1. Planner turns the idea into a short `docs/spec.md` index, detailed `docs/spec/*.md` files (including `docs/spec/rubric.md`), and sprint contracts in `docs/sprints/`.
2. Generator implements one sprint, grows the automated regression suite, and updates the matching `docs/progress/sprint-*.md`.
3. Evaluator runs the app, verifies behavior against the rubric with recorded evidence, and writes the matching `docs/feedback/sprint-*.md`.
4. The orchestrator records the outcome in `docs/sprints/state.md` before moving on. Failed sprints go back to Generator (or to Planner when feedback is classified as a spec issue). A `verification-scope-issue` — where the failure is mainly about verification tooling or an evidence format the contract never required — goes directly to the user with options instead of looping. Passed sprints move forward. Three consecutive failures on one sprint escalate to the user, as do the `Spec-Issue Count` and `Lineage Dispatches` limits (see Proportional Verification below).

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
| `docs/sprints/state.md` | Execution state: Current ID, per-sprint status, retry count, spec-issue count, lineage dispatch budget | Orchestrator (main agent) |
| `docs/sprints/sprint-NNN.md` | Main sprint contract, e.g. `sprint-005.md` | Planner |
| `docs/sprints/sprint-NNN-patch-PPP.md` | Patch sprint contract, e.g. `sprint-005-patch-001.md` | Planner |
| `docs/progress/sprint-*.md` | Implementation progress, self-evaluation, startup/test handoff | Generator |
| `docs/feedback/sprint-*.md` | Evaluator result, scores, evidence, bugs, reproduction steps | Evaluator |

Do not cross these ownership boundaries. If a role finds a problem outside its file, record it in its own handoff instead of editing another role's source of truth.
Sprint statuses in `state.md` are: `planned`, `active`, `awaiting-eval`, `done`, `done-by-user-decision`, `deferred`, `superseded`. Never skip or reorder sprints silently; record `deferred`/`superseded` with a reason. `done-by-user-decision` records a completion the user explicitly accepted with remaining shortfalls; keep Evaluator's feedback unchanged and reference the unmet items in `state.md`.
An older `docs/sprints/current.md` is a legacy pointer: convert it into `docs/sprints/state.md` once, then treat it as read-only reference. If an older `docs/progress.md` exists, treat it as a legacy reference log and do not append new sprint progress there.
If an existing `state.md` has no `Model Tier`, pass `unknown` to the resolver once, persist only the returned `standard` or `strong` tier with `Rotate: runtime-migration`, and fresh-dispatch Generator. Never persist `unknown`. If only `Rotate` is absent, add `Rotate: none`. If an existing `state.md` has no `Spec-Issue Count` or `Lineage Dispatches`, add them once with `0` (or the value countable from the recorded history) on the next continuation.
For a real Generator tier change, use the resolver's rotate reason: `model-escalation` for failure/risk/recommendation routing and `model-availability` for an unavailable standard-model fallback. When Generator is not the next role, its routing tier is null and must not replace the last dispatched tier in state.
Use zero-padded sprint IDs. Do not create decimal sprint IDs such as `sprint-5.1` or `sprint-5.10`.
For work between main sprints, use `sprint-NNN-patch-PPP`.

## Small Changes In A Harness-Managed Repository

Do not default to fixing things outside the loop. Classify every follow-up request:

1. Direct fix — typos, comments, docs, config values that do not change app behavior.
2. Micro patch (`Type: micro`) — a small behavior/UI change confined to one feature surface and one flow (for products without screens: one command or one feature area), already covered by an automated regression check. Gets a lightweight evaluation (completeness, stability, no-regression only).
3. Regular patch sprint or next main sprint — everything else.

## Planning Rules

- Planner describes what the product should do, not how to implement it.
- Planner should ask the user to decide major product direction before writing the full spec.
- Use Claude Code's `AskUserQuestion` when available. Ask at most three multiple-choice questions per round, with 2-3 options and a recommended option when appropriate.
- Continue the question loop until the target user, core experience, success state, scope boundaries, and experience direction are clear.
- If the user explicitly says to proceed or leave it to the agent, put cross-cutting uncertainty in `docs/spec/product.md` or `docs/spec/constraints.md`, and sprint-specific uncertainty in the target `docs/sprints/sprint-*.md`.
- Planner generates `docs/spec/rubric.md` at initialization, adjusting design/originality thresholds to the project type. Evaluator proposes rubric changes in feedback; only Planner applies them.
- Invariants confirmed by accepted sprints ("never regress this") are promoted into `docs/spec/constraints.md`, not accumulated in state files.
- Avoid premature stack, schema, endpoint, or component decisions in the spec files.
- Do not put verification-infrastructure implementation into specs, acceptance criteria, or the rubric: no evidence schemas, attestation formats, or collector/driver/attestor designs. Specify what to confirm; leave how to prove it to Generator and Evaluator. Never make the verification infrastructure itself a product requirement without an explicit user request.
- The rubric lists the sufficient evidence formats per criterion (safe harbor), written as whatever the chosen verification surface naturally produces. Each sprint contract fixes its verification scope (target surfaces, required scenarios, evidence formats) at start; growing it afterwards is a scope change.
- Tightening an active sprint's acceptance criteria, thresholds, or evidence formats — including after a spec-issue return — requires explicit user approval, and a criterion added mid-loop becomes a hard gate only from the next sprint. Relaxing, de-scoping, or demoting checks to optional internal QA is a legitimate, recordable move, proposed by Planner and approved by the user.
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
- Score against `docs/spec/rubric.md`; one failed threshold means the sprint fails — for criteria that existed in the contract and rubric when the sprint started. Criteria added mid-loop are advisory for the current sprint until the user approves hard-gating them.
- A pass requires recorded evidence: executed commands with results, and the concrete URL/DOM/browser interactions checked. Screenshots are mandatory whenever UI, responsiveness, or visual quality is scored. A pass without evidence is invalid.
- Evidence sufficiency (safe harbor): the evidence formats listed in the rubric and contract are sufficient for a pass. Evaluator must not invent additional evidence formats (approval manifests, digest pinning, attestation, a unified cross-surface evidence schema) as pass conditions. Whatever the chosen verification surface naturally produces (command output, interaction records, screenshots, host-owned session records) is acceptable, and building new evidence-collection infrastructure is never a pass condition. Stronger-evidence ideas go to improvement proposals for user approval. The listed formats can never fall below the evidence floor above; if the rubric and contract list no evidence formats, the floor itself is the safe harbor. The safe harbor bounds what may be demanded as pass conditions, not what Evaluator may observe: product defects observed outside the fixed verification scope remain valid findings against criteria that existed at sprint start.
- Classify every finding as `product` or `verification-infra`; when unsure, classify it as `product`. A `verification-infra` finding alone does not fail the sprint; severe ones are classified `verification-scope-issue` and go to the user with options. A no-regression score cannot pass while the handed-over regression suite is unrunnable or failing; if the suite itself is the main cause, that is a `verification-scope-issue` for the user.
- Re-evaluation within one sprint is incremental: verify the changed surfaces plus the regression suite, carry over recorded evidence for unchanged surfaces, and reuse recorded evidence for an unchanged commit. Changed surfaces are determined from the actual git diff, not Generator's self-report; evidence carry-over requires the handed-over regression suite to run green, and unchanged-commit reuse requires a clean working tree.
- A user-declared real-host confirmation, once recorded in `state.md` by the orchestrator, may serve as evidence for the matching criteria (Generator self-reports still cannot). Record it with the timestamp, the quoted declaration, the matching criteria, and the commit hash; it expires when related code changes after that commit.
- Run the handed-over regression suite as the baseline for the no-regression score, then manually verify the surfaces this sprint touched.
- Classify failures as `implementation-issue` (back to Generator), `spec-issue` (back to Planner via the orchestrator), or `verification-scope-issue` (directly to the user with options; never auto-routed to Generator or Planner).
- For patch sprints such as `sprint-005-patch-001`, verify the patch behavior, base sprint regression, and absence of next-main-sprint feature leakage. `Type: micro` patches get the lightweight scoring set.

Browser verification priority:

1. Claude Code Desktop App: Preview pane / autoVerify.
2. Claude Code CLI: Playwright test or Playwright script; use a Playwright MCP only if the host already provides one.
3. Exceptions: real Chrome or Computer Use only when signed-in browser state or GUI-only behavior is required.
4. Fallback: build, HTTP checks, static screenshots, and explicit manual verification notes.

## Done Means Verified

Do not declare completion only because code was written. A sprint is complete only after Evaluator verifies the running product with evidence and the orchestrator records the result in `docs/sprints/state.md`.

The one exception is `done-by-user-decision`: the user may explicitly accept a sprint with recorded shortfalls. The orchestrator records the reasons and remaining risks in `state.md`, Evaluator's feedback stays unchanged, and later sprints can see what was not verified.

## Proportional Verification

Verification exists to ship the product; the verification infrastructure itself is not a product requirement.

- Before each Generator/Evaluator dispatch the orchestrator checks `Lineage Dispatches` in `state.md`: at the configured limit (`limits.max_lineage_dispatches` in `.harness/config.toml`, default 10), stop and give the user options instead of dispatching; otherwise record the increment, then dispatch. The counter always equals actual dispatches, and a synchronous pre-child-creation launch rejection consumes no budget. It accumulates across retries, spec-issue returns, patch sprints, and fresh role rotations of the same base sprint, and resets only when moving to the next main sprint or on an explicit user reset.
- A spec-issue return increments `Spec-Issue Count` without consuming Retry Count. Reaching `limits.max_spec_issue_returns` (default 2) on one sprint stops for user confirmation, and every post-spec-issue contract change passes user review before Step 2 resumes.
- If a sprint round's diff contains only verification code (no product code) twice in a row, or the repository's verification code outgrows the product code, report it to the user before dispatching again.
- Guard stops present options — fix as demanded, accept at a lower evidence level, or de-scope — rather than silently aborting. Removing a check that the contract explicitly de-scoped is not "deleting tests to pass".

## Model Policy

Do not infer or translate model names across hosts. Claude Code inherits the user's current model and effort by default. Codex runtime defaults are Planner `gpt-5.6-sol` / `high`, Generator `gpt-5.6-luna` / `xhigh`, and Evaluator `gpt-5.6-sol` / `high`. Do not ask Codex to identify itself as App or CLI. Codex CLI may omit `model`, `reasoning_effort`, and `agent_type` from its displayed spawn schema even when the runtime parser accepts them; schema omission alone must not force `inherit`. When native `spawn_agent` is available, dispatch the actual role once with the resolver's exact `dispatch-attempt` values. Use `agent_type`, never `agent_role`, to select a custom agent. Apply this rule to every exact model/effort selected by shared config, personal config, or the user, not only Luna/Sol.

Feed an `Unknown model` or invalid-effort refusal back through `--launch-rejected-model` or `--launch-rejected-effort` only when it occurs before child creation. An `unknown field` rejection instead means that application path is unavailable. Never treat implementation failure as launch rejection, and never use Terra or `codex exec` as an automatic fallback. Neither `dispatch-ready` nor `dispatch-attempt` proves which model actually launched; mark `launch-verified` only after child host metadata matches the dispatched values.

Shared Harness runtime settings live in `.harness/config.toml`; personal leaf overrides live in the git-ignored
`.harness/config.local.toml`. The default lifecycle is `balanced`. A high-risk Sprint, the second consecutive implementation failure, or an evidence-verified Evaluator recommendation selects the strong tier. A tier change always starts fresh. The same tier may resume only when host metadata proves that resume preserves the routed model and effort; follow-up support alone is insufficient. The third consecutive failure stops for user input; a spec issue returns to Planner without consuming Generator escalation.
Never overwrite existing guidance, `.claude/agents/`, `.codex/agents/`, or Harness configuration to apply these settings.
