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
links; PROJECT.md, legacy docs/sprints/current.md and linked current.md are reused
rather than creating a second current-state document. Explicit source flags support
other layouts. Multiple existing candidates
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

For a large state, start from the latest explicit user instruction and current sources.
Search across the source for the relevant work's approvals, constraints, unresolved
items, counters and return destination; do not truncate inspection at the first 200
lines or require an audit of every past Sprint. Retain the original purpose and
completion condition, current work, unresolved/held items, next action, interruption
exit/return destination when relevant, authorization/constraints, specification links
and validation revision/evidence. Keep current counters without resetting them for
cleanup; do not infer approvals, verdicts or budgets from historical duplicates.
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

Put the live values in one fixed `## 現在地` section at the start of the same canonical
state. Mark any retained old body as `旧状態（履歴・現行値は先頭の現在地へ移管済み）`;
old Current IDs and counters are historical, not competing current values. On future
resume read that current section and necessary references, not the whole old body or
archive. Resolve a specific contradiction against the latest human instruction and
current sources; leave uncertain authority pending and continue authorized independent work.

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

If a compact candidate fails protection checks, retain the exact original body and
prepare a fallback candidate in the same state: one short `## 現在地` section followed
by the explicitly marked old body. If a current section already exists, replace it
rather than stacking another one. Reuse preview/apply and preserve protected text;
do not weaken checks, build a summarizer, or start an all-history investigation.
Record `整理未完了`, the protection failure and a separate maintenance follow-up in the
current section, together with the authorized independent next action and any held
operation whose approval is unknown. This fallback establishes current meaning but
does not claim that archival cleanup succeeded. If it also fails, leave the source
untouched and report the specific blocker; continue work independent of that write.
Do not repeatedly archive the unchanged old body merely to meet a size target.

Finish by checking the relevant current source/spec references, unresolved items,
active approvals, old rules and the requested product behavior. Record the migrated
revision and evidence by replacing the current section at handoff, completion, review
or return. Keep dated reports and full verification output in existing progress,
feedback or reports, with only necessary links in state. Do not update installed caches or unrelated repositories
unless authorized separately.

## v0.6.1の読込先と旧規則の合成例

Claude Codeは`/harness`から、Codexは`$using-harness`から同じusing-harnessへ進む。
新規repoはinit後のAGENTS.md / CLAUDE.mdを読む。既存guidanceがあるrepoではinitは本文を保護し、
`docs/harness-guidance.md`へ入口候補を置く。**supplementを生成しただけで適用済みにしない**。
既存root guidanceのHarness部分へ候補の短い指示を取り込むか、そこからsupplementを明示的に読む導線を作り、
上のupgrade inventory → candidate → preview → applyを使う。目的・既決事項・現在の承認を引き継ぐ。
開始/復帰時の目的・復帰先、評価前のevaluation、再開/引き渡し時のstateへの導線を実際に読む。

以下は実業務の本文を使わない合成例。inventoryの旧規則検出は参考であり、意味の衝突はAgentが確認する。

| 合成の既存記述 | 候補での扱い |
|---|---|
| `Owner rule: never upload customer data.` / `Authorization: local implementation and tests only.` | 原文を残し、planのpreserveにも指定。独自規則や公開未承認を弱めない |
| `Fix every product finding.` | 該当する旧Harness規則だけretireへ指定し、評価前のevaluation読込へ置換 |
| `Deferred findings still fail the review.` | retireへ指定。見送りだけの不合格を廃止し、評価正本へ渡す |
| `Append every progress report to state.` | retireへ指定。再開/引き渡しのstate読込へ置換。履歴を消さない |
| 10,000行の旧state、200行より後の承認・制約、複数の旧Current ID | 上の長state手順で必要事項を検索・保持。短い現在地と原文退避、保護拒否なら同一stateのfallback |
| repo外の個人global `review-convergence:v1` | この移行では変更しない。対象repoの新規則の実読込・既存規則との整合確認までは元ブロックを保持 |

合成試験ではglobal相当ブロックを一時repo内のMarkdownへ置ける。個人globalの変更権限を意味しない。
まず旧Harness指示3件を置換し、独自規則・承認・global相当ブロック・無関係なdirtyをそのまま保つpreview/applyを確認する。
次に実読込するplugin rootの`skills/using-harness/SKILL.md`、`skills/harness-loop/references/evaluation.md`、
`scope.md`、`state.md`とroot guidanceを確認する。衝突が残れば対象差分を解消し、確認前にglobalを縮めない。
その確認後、別途承認されたglobal保守だけで以下の短いfallbackへ置換できる。周辺の独自規則は保持する。

### global fallback候補（7行）

```markdown
<!-- review-convergence:v1 -->
ユーザーの明示依頼・承認範囲を優先する。Harnessの現行収束規則を読める場合は、その規則とrepoの明示設定に従う。それ以外は以下を使う。
各指摘に発生条件・頻度F(0〜10)・影響I(1〜10)を付け、具体的条件を示せなければF=0。
F×I>=20またはF>=1かつI>=8を修正対象とし、他は完了報告に残す。
明示受け入れ条件の未達、今回の変更による実証回帰、具体的なセキュリティ/権限/情報漏えい/データ消失・破損/課金・請求の欠陥は閾値に関係なく対処する。
見送り指摘は新しい関連変更・具体的事実・明示再評価がなければ再掲しない。頼まれていない稀な・将来用の設計は追加しない。
<!-- /review-convergence:v1 -->
```

最後に、sourceの対象版、installed version、fresh sessionで実読込したpath/内容、消費repoへの適用を別々に報告する。
source checkoutの参照を読んだ事実をinstalled版の動作確認へ置き換えない。既存sessionの指示は自動更新されない。
新しいsessionへ目的・承認・現在地を引き継ぐか、明示的に新しい正本を読み直す。
