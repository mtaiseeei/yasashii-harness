# Sprint 004 Patch 003 — 配布・適用導線の実装と検証

親目的は #12 → #13 → #14 → #15を順に独立評価し、v0.6.1候補を一つのsource PRへまとめること。
担当は#15の配布導線・合成repo移行・候補版・統合検証まで。終了条件は実装と必要確認の記録、復帰先は親の独立評価 → source PR作成。
本記録はGeneratorの実装・検証結果であり、独立合否や4Issue全体の完了を代用しない。

## 対象と変更

- 対象: `0216585`（#14独立PASS後）+ 本Patch差分、v0.6.1候補。source基点はv0.6.0 `dd05b7e`。
- `plugins/harness/templates/{AGENTS,CLAUDE}.md` と `templates/docs/harness-guidance.md`: 開始/復帰の目的・復帰先、評価前のevaluation、再開/引き渡しのstate読込を短く明示。閾値全文は複製しない。
- `skills/using-harness/SKILL.md` と `commands/harness.md`: 両hostの開始・復帰導線を共通正本へ接続。小変更の直接完了を維持。
- `skills/harness-loop/SKILL.md`: 再開・引き渡し時にstate正本を読む契機を明記。
- `references/migration.md`: 既存root guidanceにsupplementの指示を取り込む手順、旧規則の残す/置換する合成例、7行のglobal fallbackを追加。実読込・整合確認までは旧globalを保持。
- Claude/Codex plugin manifestsとClaude marketplaceのversionを0.6.1へ整合。Codex marketplaceにはversion欄がなく、既存のlocal sourceと識別を保持して整合検査した。
- `README.md` と `docs/releases/v0.6.1.md`: 公開前候補、正式更新・文書移行の区別、確認する4段階を記載。v0.6.0履歴は変更していない。
- `scripts/check-guidance-migration.mjs`: 新規initの両host template一致と、既存両host guidanceへの2段階移行を既存検査へ追加。CLI・parser・検証基盤の新設なし。

実装変更は配布文書・metadataと既存検査に限定。実stateのdirtyは親所有として保持し、仕様・契約・feedback・runtime設定は変更していない。
検証のみdiffではなく、追加検証52行に対し製品文書・配布差分はそれ以上。別プロセス・server・watcherの常駐なし。commit/stage/pushは未実施。

## 統合検証（2026-11-05）

| コマンド | 実測 |
|---|---|
| `node scripts/check-positioning.mjs` | exit 0、5 checks PASS。両manifest version、両marketplace source/識別、入口を確認 |
| `node scripts/check-loop-rules.mjs` | exit 0、4 surfaces PASS。hook環境変数なし/あり、正本の参照到達性を含む |
| `node plugins/harness/scripts/check-runtime-config.mjs` | exit 0、57 checks PASS |
| `node scripts/check-guidance-migration.mjs` | exit 0、10 checks PASS（直前9→10） |
| 4 manifest/marketplace各々の `python3 -m json.tool` | exit 0、4ファイルPASS |
| `claude plugin validate plugins/harness` | exit 0、Validation passed |
| `git diff --check` | exit 0 |

合成例は一時repoのみ。新規init後のAGENTS/CLAUDEが配布templatesと一致し、再initが既存bytesを変えない。
既存guidanceありrepoではinitがroot本文を保持してsupplementを生成し、upgrade previewが無書込、apply後に両host root本文が候補と一致する。
独自のデータupload禁止、local実装/検証だけの承認、無関係dirty、runtime設定、原文archiveを保持した。
旧「全product修正」「見送りでもFAIL」「stateへ追記」はretireへ指定して置換し、旧global相当ブロックは第一段階でそのまま残した。
別候補のpreview/applyで7行fallbackへ縮められ、周辺規則が保持されることを確認した。これは個人globalを変更した証拠ではない。
機械検査はbytes/リンク/保護動作の証拠であり、自然言語の全矛盾やLLM判断を証明しない。

#13の既存合成長state検査も統合実行した。10,000行/210,150 bytes → 22行/900 bytes、後半の承認・制約・counter・復帰先保持、原文archive一致。
保護拒否、同一stateのfallbackと複数回の現在地置換もPASS。実顧客本文や実業務repoは利用していない。

## 実読込と先行判断証拠の再利用

このnative Codex fresh Generatorは解決済みmodel/effort=inherit。source root
`/Users/taisei/workspace/agentic-harness/plugins/harness/` の以下を実読込した。
`commands/harness.md` → `skills/using-harness/SKILL.md` → `skills/harness-loop/SKILL.md`、
`skills/harness-loop/references/{evaluation,scope,state,migration}.md`、両host templatesとsupplement。
目的・復帰先、閾値/例外/見送り、現在欄置換の同じ正本へ到達し、小変更に3役やSprintを追加する指示ではないことを確認した。
これはsource候補の読込であり、installed v0.6.1の読込とは報告しない。

- Claude Code収束判断は親がMac miniで実行した既存証拠を再利用。
  `/private/tmp/harness-v061-claude-review-prompt.md` と `/private/tmp/harness-v061-claude-review-result.json`、
  [独立確認記録](../feedback/sprint-004.md)を読んだ。promptに#12時点 (`08a80b0`) のevaluator/evaluation/scope全文が含まれることを比較確認した。
  コマンドは `claude -p --model fable --effort medium --safe-mode --tools '' --strict-mcp-config --no-session-persistence`。
  resultの `is_error=false`、実modelは `claude-fable-5-1`。
  F2/I9・F4/I5は修正、F2/I7・条件不明F0は見送り、具体的データ消失/明示未達/実証回帰は必須修正。
  3種の間接差戻し、同じ見送りの再発行、未承認厳格化を却下し、必須テスト未実施をPASSにしていない。
  #12以降の3path差分を読み、evaluationは同一、evaluator/scopeの増分は#14の復帰・引き渡しで閾値/例外に変更がないため再利用した。
  16独立ケースを末尾で一つのFAILへ集約した点、case4の残課題表現の揺れという限界は既存feedbackどおり維持する。
- Codex本題復帰・短いstate再開は[#14のfresh独立判断](../feedback/sprint-004-patch-002.md)を再利用。
  A→B修理/必要確認PASS→A未実装残件、無関係C見送り、短い現在地からA復帰、取消/置換、外部待ちの判断を確認した。
  今回はその復帰規則を変更せず読込導線を加えたため、少数の合成single-turn判断として有効。長期会話や全modelの実証とはしない。

## 未実施と引き渡し

| 段階 | 今回の範囲 |
|---|---|
| source候補 | v0.6.1配布物・検査を実装済み。source公開/PR作成は親へ返す |
| installed更新 | 未実施。個人cache・global・下流repoを保護 |
| fresh session実読込 | source候補は上記のとおり読込。installed v0.6.1の新sessionは未実施 |
| 消費repo適用 | 合成の新規/既存repoへinit/upgradeを実行。実業務repoへは未適用 |

Codex local marketplace隔離installは未実施。親が確認したCLI helpでは `plugin marketplace add` / `plugin add` に隔離保存先指定がない。
既存installedを保護し、上位指示で禁止されたHOME / CODEX_HOME再割当による代替や新仕組みの追加は行っていない。
今回rubricの代替としてmanifest・参照到達性・合成init/upgrade・実role判断を確認済み。install成功とは報告しない。

独立Evaluatorには今回差分と上記証拠の有効範囲を確認してほしい。担当終了後は実装を凍結し、親の独立評価へ返す。
