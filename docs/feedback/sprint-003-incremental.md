# Sprint 003 — 既存正本検出の独立増分評価

**Agentic source増分: PASS。今回修正のYasashii再同期は後続作業。**
対象は独立PASS済み `ed0b2835f11f6b10e767851d04745f3291cbcce4` に対する、
`node-guidance-initializer.mjs` の候補名・リンク判定、`check-guidance-migration.mjs` の追加ケース、
`references/migration.md` の説明の未commit差分。Evaluatorは実装に未関与で、実差分とCLI入出力を確認した。
契約・rubricはSprint 003の既存条件を使用し、新しい合格条件は追加していない。

## 独立実行と結果

| コマンド / 操作 | 結果 |
|---|---|
| `node plugins/harness/scripts/harness.mjs init --root <fixture>` | 独立5ケースすべてexit 0。既存state候補を表示し、第二の`docs/sprints/state.md`を生成しない |
| 同CLIの`check`と再`init` | 5ケースすべてexit 0、実行前後の全ファイルbytes不変 |
| `node scripts/check-guidance-migration.mjs` | exit 0、8 PASS / 0 FAIL |
| `node scripts/check-windows-init.mjs` | exit 0、8 PASS / 0 FAIL、OS=darwin |
| `node plugins/harness/scripts/check-runtime-config.mjs` | exit 0、57 checks passed |
| `git diff --check` | exit 0 |

独立fixtureは、root guidanceにリンクのない`PROJECT.md`と`docs/sprints/current.md`、
AGENTSからリンクした`planning/current.md`、CLAUDEからリンクした`planning/project.md`、rootの`CURRENT.md`。
各原文に日本語の未決チェック項目、Local only承認、CRLFを置き、別のowner作業ファイルも設置した。
初回init後も既存ファイルのbytesはすべて一致し、未決・承認・独自規則を保持した。
入力例「Owner: 保存期間は未決」「Local only; no release」はそのまま残り、
出力は`canonical state: PROJECT.md`等、checkは`ready; no files were changed`となった。
AC-03/AC-05の既存正本尊重・保持とAC-06の影響回帰を満たす。

CURRENT.mdの初回確認では、macOSのcase-insensitive filesystemで`current.md, CURRENT.md`の両候補を表示したため、
Evaluator側の単一候補表示の期待が一度停止した。第二state生成や原文変更はなく、候補リストとして確認し直してPASS。
製品コードの変更や受け入れ条件の緩和は行っていない。

重い処理は共通lockとNode数監視付きで直列実行し、各開始時Node数22。実行hostは`mac.lan`、
user `taisei`、arm64、home `/Users/taisei`。自分が起動した常駐server/browser/watcherはない。
再現スクリプトとコマンド別ログはローカル評価用の`/private/tmp/harness-autonomy-20260912/incremental-evaluation/`に保存した。

## 証跡再利用と残件

前回の[Agentic独立評価](sprint-003.md)を再利用する。Evaluator自身が基点との差分を確認し、
製品変更が上記3ファイルに限定され、resolver・設定・templates・routing指示・roles・manifest・hook・
grillingに変更がないことを確認した。正本検出に影響するinit/check・migration・Windows互換・runtimeは再実行し、
それ以外の代表シナリオ、移行apply、positioning、loop-rules、JSON、Claude validate、隔離Codex installの証拠は維持する。
progress/stateと既存下流feedbackの作業差分は記録であり、製品同一性を失効させない。

前回の[下流評価](sprint-003-downstream.md)はYasashii `194629fb2887c4d04b968555b0cbe129b596c63f` に対するPASS。
今回の上流修正はまだその評価対象に含まれないため、source確定commitと正式再同期・metadata確認をorchestratorへ返す。
Windows実機、速度比較、通常installed更新、消費repo移行、remote push/tag/Releaseは実施していない。

自己レビュー: 製品findingなし。PASSは差分確認と実行証拠に基づき、未実施の再同期・配備を完了扱いしていない。
所有外ファイル、実装、仕様、state、他者feedbackは編集していない。
