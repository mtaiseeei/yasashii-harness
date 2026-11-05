# Sprint 004 / Issue #12 独立評価

判定: **PASS（合格）**。不合格分類なし。評価日: 2026-11-05。

親目的は #12 → #13 → #14 → #15 を順に修正・独立評価し、一つの v0.6.1 source PR候補へまとめること。
本評価の担当と終了条件は #12 のレビュー収束規則と関連導線の確認まで。系列全体の完了ではない。
復帰先は [Patch 001 / #13](../sprints/sprint-004-patch-001.md)。state更新と次のdispatchは親が行う。

## 候補と独立性

- 基点 / HEAD: `dd05b7e6717ef2de74d7c2366fb82f3de7ac5225`（v0.6.0）。branch: `codex/review-convergence-v061`。
- 評価候補は上記基点に対する、この評価時点の未commit差分。製品変更pathは次の5ファイル。
  - `plugins/harness/skills/harness-loop/references/evaluation.md`
  - `plugins/harness/skills/harness-loop/references/scope.md`
  - `plugins/harness/skills/harness-loop/SKILL.md`
  - `plugins/harness/agents/evaluator.md`
  - `plugins/harness/agents/generator.md`
- native Codexのfresh独立Evaluator作業単位で実施。解決済みmodel/effortはinheritとして受領し、設定変更・再解釈なし。
- Generatorのprogressは対象と引き渡しの確認に使用したが、自己評価・コマンド申告を合否証拠にはしていない。
  配布指示を直接読み、下記の判断を自身で行い、関連コマンドも独立に実行した。
- 自身の編集は本feedbackのみ。仕様・契約・state・progress・実装および他者dirtyは保持した。

実読込path（すべて `/Users/taisei/workspace/agentic-harness/` 配下）:

- 配布正本: 上記製品5ファイルの本文と差分。
- 入口: `plugins/harness/skills/using-harness/SKILL.md`、`plugins/harness/commands/harness.md`。
- 契約と状態: `docs/sprints/sprint-004.md`、`docs/sprints/state.md`、`docs/progress/sprint-004.md`。
- 仕様: `docs/spec.md`、`docs/spec/features.md` のREV-001、`docs/spec/constraints.md`、`docs/spec/decisions.md` のv0.6.1決定、`docs/spec/rubric.md` のv0.6.1節（本文または該当差分）。
- 入力: `/private/tmp/harness-v061-review-cases.md`。

## 合成入力に対する実判断

以下は配布正本を実読込したEvaluator自身の単一turn判断出力である。実顧客の不具合や、本番ユーザーとの複数turn会話を再現したものではない。
各ケースは独立で、明示された未達以外の合意機能・必須検証は完了という入力の前提を適用した。
「全体判定」は各合成案件の判定であり、本Sprintの判定と区別する。数値は入力の見積りを使用し、統計基盤は要求していない。

| # | 短い入力・根拠 | 選別・理由 | 合成案件の全体判定 | 次行動 |
|---|---|---|---|---|
| 1 | 長い表示名でヘルプが隠れる。F=2/I=9 | product・修正。積18でもF>=1かつI>=8 | FAIL / implementation-issue | Generatorが対象表示を修正し、該当操作を再確認 |
| 2 | 条件付き補助表示が遅い。F=4/I=5 | product・修正。積20で境界を満たす | FAIL / implementation-issue | 遅延の対象条件を修正・検証 |
| 3 | 稀な幅だけ余白不均一。F=2/I=7 | product・見送り。積14、重大例外なし | PASS | 既存作業記録と完了報告の残課題へ置く |
| 4 | 将来の内部型変更を仮定した抽象化。条件不明/I=9 | product扱い・F=0/I=9で見送り。具体的な欠陥経路なし | PASS | 仮説を残課題へ置き、抽象化や追加検証を開始しない |
| 5 | 変更した保存処理から既存データが消える具体的経路。F=0/I=10 | product・修正。具体的データ消失は頻度閾値の対象外。F=0を免責にしない | FAIL / implementation-issue | 影響経路を保持して保存処理を修正し、消失しないことを検証 |
| 6 | 明示条件「保存すると文字列保持」に実入出力が違反。F=1/I=2 | product・修正。明示受け入れ条件未達 | FAIL / implementation-issue | 文字列保持の修正と同じ入出力で再確認 |
| 7 | 変更前に動いた戻るボタンが変更後に動かない。F=1/I=2 | product・修正。変更との関係を示す実証回帰 | FAIL / implementation-issue | 戻る操作の回復と近傍回帰を確認 |
| 8 | #3と同じ事実だけで安定性スコアを合格未満へ | 元findingはproduct・F=2/I=7の見送り維持。間接減点を不採用 | PASS | 前回残課題を参照し、差戻しを開始しない |
| 9 | #4を「未確認」と言い換え完了保留 | 元findingはproduct・F=0/I=9の見送り維持。必須検査でない仮説 | PASS | 未確認の必須項目へ移さず、元記録を参照 |
| 10 | #3をspec-issue / verification-scope-issueへ変更 | product・F=2/I=7の見送り維持。分類替えは新しい根拠でない | PASS | Planner/Generatorへの往復を再開しない |
| 11 | 必須保存テスト未実行。実装者の「動くはず」のみ | 必須検証未確認。品質findingのF/Iによる見送り対象ではない | PASS不可・未完了 | まず合意済みテストを実行。実行不能なら理由を記録しscopeへ。破損根拠なしに製品欠陥や限定修理を捏造しない |
| 12 | #3のコード/設定/依存・事実は同一。別レビュアーが表現と点数だけ変更 | product・元F=2/I=7の見送り維持。供給元や点数変更は新事実でない | PASS | 前回記録だけ参照し、全文再掲・新Issue・新台帳を作らない |
| 13 | #3後の関連レイアウト変更で主要ボタンが押せない新しい実入出力 | product・再開して修正。関連変更と新事実による実証回帰。頻度見積り未提示でも必須例外 | FAIL / implementation-issue | 旧余白問題との変化を記録し、押せない経路を修正・再検証 |
| 14 | #3後、利用者が「この余白だけ直して」と明示 | product・F=2/I=7でも明示修正依頼として修正 | 新たな依頼分は未完了（旧見送り判定を遡及FAILにしない） | 指定余白を限定修正し必要確認。通常の小変更へ3役・新rubricを要求しない |
| 15 | 着手前の既存rubricで積閾値10・重大影響8。具体的F=2/I=7 | product・修正。明示上書きを採用し積14>=10 | FAIL / implementation-issue | そのrepoの既存基準に従って修正。plugin既定で上書きを無効化しない |
| 16 | 作業途中に承認なく積閾値20→10、同じF=2/I=7 | product・今回は既定の見送り維持。未承認厳格化を不採用 | PASS | 閾値変更案は参考・改善提案。採用が必要ならPlannerが差分とコストを示し厳格化ゲートへ |

必須例外の補足判断: 「他ユーザーの顧客データを閲覧できるAPI経路を具体的に確認、F=1/I=10」なら
product・修正、FAIL / implementation-issueとして権限境界を修理し再検証する。
「セキュリティが心配」というカテゴリ名だけで経路不明ならF=0であり、新しい認証設計や検証基盤を必須化しない。
この補足も合成入力であり、実環境の権限検証を実施したという意味ではない。

ケース1〜4・8〜14・16はrubric上書きがない場合のplugin既定で判断した。通常機能・小変更ではrubric新設を要求しない。
ケース16の厳格化を今回の合否へ入れず、既存scopeの承認・次Sprint以降への扱いを保つ。

## 受け入れ条件と導線

| 条件 | 独立確認結果 |
|---|---|
| 閾値4例と既定値 | PASS。ケース1〜4で論理ORとF=0を適用できた |
| 必須例外・明示依頼・必須未実施の区別 | PASS。ケース5〜7、11、14および権限の補足。必須未実施をPASSにしていない |
| 3つの間接差戻しを防ぐ | PASS。ケース8〜10。evaluationだけでなくEvaluator、scopeの遷移にも同じ規則がある |
| 見送り再掲と再開条件 | PASS。ケース12〜14。関連変更・具体的新事実・明示依頼を、言い換えや点数変更と区別できた |
| rubric既定・上書き・厳格化禁止 | PASS。ケース15〜16。既存上書きは採用し、途中の無断厳格化は不採用 |
| Generatorと外部レビューへの適用 | PASS。Generatorは選別済み対象のみを処理。Loopは外部・親自身・貼付レビューも選別する指示を持つ |
| 両hostの意味・読取導線 | PASS（source文書の範囲）。Claude command→using-harness→harness-loop→evaluation、Codex skill→同じLoop/正本の導線を実読込。host固有の別閾値なし |

v0.6.1契約は上記の受け入れ確認を指定しており、過去Sprint 003の採点・下流同期条件は遡及適用しなかった。
通常機能の合成ケースにも新しい6軸採点表を作っていない。

## 独立実行した検証

| コマンド | 結果 |
|---|---|
| `git rev-parse HEAD` | `dd05b7e6717ef2de74d7c2366fb82f3de7ac5225` |
| `git diff --stat dd05b7e` / 対象pathの `git diff` | 製品5pathの変更と、仕様・契約準備のdirtyを区別して確認。新collector・runtime設定変更なし |
| `node scripts/check-positioning.mjs` | exit 0、`positioning regression: 5 checks passed` |
| `node scripts/check-loop-rules.mjs` | exit 0、`loop rules regression: 4 surfaces verified` |
| `git diff --check` | exit 0 |

選定理由: #12は評価・role指示とLoop/scopeの導線変更なのでpositioningとloopの既存軽量回帰を独立実行した。
自動検査は導線・安全境界の回帰証拠とし、上の実判断の代用にはしていない。
runtime・migration実装、JSON manifestは今回の製品差分で変更されていない。統合検査と隔離installは#15の契約へ残る。
他者のbaseline実行を、この独立評価で再実行済みとはしていない。

追加の他者実行証拠: 親がMac miniで実行したClaude CLIの入力
`/private/tmp/harness-v061-claude-review-prompt.md` と結果 `/private/tmp/harness-v061-claude-review-result.json` を受領した。
Evaluatorが入力に現候補のevaluator/evaluation/scope全文と同じ16ケースが含まれること、結果本文の各判断を独立に確認した。
親の実行コマンドは `claude -p --model fable --effort medium --safe-mode --tools '' --strict-mcp-config --no-session-persistence`。
JSONは `is_error=false`、`modelUsage` は `claude-fable-5-1`。閾値・必須例外・3つの間接差戻し・必須未実施・再掲・明示依頼・上書きの分類は上表と一致した。
ただし回答末尾は独立ケースを一件の全体FAILへ集約しており、合成プローブの表現上の限界がある。
ケース4も「改善提案にも入れない」と末尾の残課題3,4に表現の揺れがあるが、F=0の見送りと残課題の列記は確認できた。
これはHarnessの実障害や本SprintのFAILではない。#15では入力の対象候補が有効か確認のうえ、この限定された証拠を再利用できる。

## 残課題・限界と自己レビュー

- 今回の製品候補に対する新しい修正対象finding、見送りfinding、未実施の#12必須検証はなし。
  表内の見送りは合成案件の判断記録であり、Harness製品に実在する残課題として再発行しない。
- source指示の実読込と判断、関連回帰まで確認済み。source公開、installed更新、消費repo適用は未実施。
  Claude CLIの上記限定証拠は受領確認済み。templatesの最終整合・配布統合確認は#15で実施する範囲であり、このPASSはその完了を主張しない。
- 全ケースは合成入力の単一turn判断。長い本番会話における再現性や全model/全hostの網羅を主張しない。
- 自己レビュー: PASSを実判断/コマンド/実読込に対応させた。必須未実施を仮説の見送りへ変えず、選別前の分類で迂回しなかった。
  証拠上限を越える要求を追加せず、所有境界を維持。起動したserver/browser/watcherなし。Escalation Recommendationなし。

親への返却: #12を合格として記録し、承認済みの#13へ進める。#12の修理ループやユーザーの再承認は不要。
