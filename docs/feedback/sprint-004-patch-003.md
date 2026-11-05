# Sprint 004 Patch 003 / Issue #15 独立評価

判定: **PASS**。評価日: 2026-11-05。未達の受け入れ条件、修正対象finding、不合格分類なし。

- 親目的: #12 → #13 → #14 → #15を順に独立評価し、v0.6.1候補を一つのsource PRへまとめる。
- 担当 / 終了条件: #15の配布・適用導線、統合回帰と先行証拠の有効性を独立確認して本feedbackへ返す。
- 復帰先: 親オーケストレーターがPASSを現在地へ反映し、承認済みsource PR作成へ進む。公開・導入全体の完了ではない。
- 対象: HEAD `0216585ee02a9a34ce1adc2a2592a61935ab71fb` + 評価時の#15差分（v0.6.1候補）。
  native Codex fresh Evaluator、model/effortは解決済みinherit。Generatorの自己評価を合否根拠にしていない。

## 読込範囲と判定基準

source root `/Users/taisei/workspace/agentic-harness/` 配下で、次を実読込した。

- `plugins/harness/agents/evaluator.md`、`commands/harness.md`、`skills/using-harness/SKILL.md`、`skills/harness-loop/SKILL.md`。
  後三者も `plugins/harness/` 配下。
- `plugins/harness/skills/harness-loop/references/{evaluation,scope,state,migration}.md`。
- `plugins/harness/templates/{AGENTS,CLAUDE}.md`、`templates/docs/harness-guidance.md`（同plugin配下）。
- `docs/sprints/sprint-004-patch-003.md`、`docs/spec/{rubric,constraints}.md`、`docs/sprints/state.md`、今回progress/release文書、全今回差分。
- 既存検査の移行fixtureとloop実装、`plugins/harness/scripts/guidance-migration.mjs`の保護・原文保存・適用後検証部分、両marketplaceとplugin manifest。
- [Issue #15](https://github.com/mtaiseeei/agentic-harness/issues/15) 本文を `gh issue view 15 --json title,body` で取得し、下表と照合。

v0.6.1 rubricとevaluationの収束規則を適用した。必須未達・実証回帰・具体的重大例外を維持し、
契約外のinstall方式・証拠基盤・長期会話試験を新たな合否条件にしていない。今回に6軸採点は追加しない。

## 受け入れ条件

| 条件 | 独立確認結果 |
|---|---|
| 両hostから同じ判断・復帰・state運用へ到達 | PASS。Claude command → using-harness、Codex skill → using-harnessが、開始/復帰でLoop、評価前でevaluation、再開/引き渡しでstateを読む。両templateは末尾のhost入口表記以外の本文が同じ。supplementも同じ読込契機を持つ |
| 新規/既存repoで独自規則・承認を保ち実読込先へ反映 | PASS。独立実行した移行10検査で新規AGENTS/CLAUDEとtemplateの一致、既存rootのinit保護、supplementから両rootへのupgrade適用を確認。supplement生成だけを適用済みにする案内ではない |
| 巨大state・global旧ブロック、previewと保持/置換 | PASS。10,000行/210,150 bytes → 22行/900 bytes、後半の承認・制約・counter・復帰先と原文archiveを保持。保護拒否、同一stateのfallback、現在地の複数回置換も通過。global相当は第一段階で保持し、別planで7行fallbackへ置換 |
| 既存check・manifest・配布検証 | PASS。下記独立実測。正式な隔離install手段を確認できず、rubric指定の代替確認を適用。install成功とはしていない |
| Claude収束/重大例外、Codex復帰/短いstate再開の実判断 | PASS。有効な先行実判断を下記の同一性確認により再利用。静的検査をLLM判断の代わりにはしていない |
| 対象版・短い入力/結果、過大な基盤なし | PASS。本feedbackと先行feedbackに対象・入力・判断・限界がある。新collector、全host/model網羅基盤なし |
| source/installed/session/repo適用を分ける | PASS。README・migration・release文書と下記の未実施表で分離。小変更の直接完了を維持し、全作業への3役/Sprint/文書群強制はない |

移行検査は独立に実行し、assert対象も読んだ。previewはsnapshot不変、適用後の両root本文は候補と一致、
独自のupload禁止・local実装/検証のみの承認・無関係dirty・runtime設定・原文archiveは保持された。
旧「全product修正」「見送りでもFAIL」「stateへ追記」は明示retireで除き、機械検出が意味の全矛盾を証明するとは書かれていない。

## global合成状況に対するEvaluator自身の判断

これは実個人設定の変更ではなく、上記文書を読んだfresh Codexによる合成入力への判断である。

| 合成状況 | 実判断 |
|---|---|
| plugin sourceだけ更新、またはsupplement生成だけ。対象repoの実読込・既存規則との照合はまだ | 旧globalを残す。rootの読込導線を適用して、using-harness/evaluation/scope/stateと対象rootを実読込し整合を確認する |
| 新規則の実読込後もrootに「見送りでもFAIL」が残る | 衝突解消前なので旧globalを縮めない。承認済みroot保守の対象としてその旧Harness規則を置換し、独自規則と承認は保持する |
| 対象repoで実読込・整合確認済み、global保守も別途承認済み | 対象ブロックだけ7行fallbackへ縮められる。非Harness時の閾値・重大例外・再掲防止と周辺の独自規則を残す |
| 実読込・整合確認済みでもglobal保守が未承認 | repo側の完了とglobal未変更を分けて報告し、globalは残す。plugin配布承認を個人設定変更へ流用しない |

7行fallbackはユーザー明示依頼・承認優先、現行Harness/repo設定優先、F=0、論理OR閾値、必須例外、再掲防止を保持する。
CLIの二段階適用成功だけでは実際の読込・整合判断や個人設定変更の承認を証明しない。この区別は検査の注記とも一致する。

## 独立実行した統合検証

| コマンド | 実測 |
|---|---|
| `node scripts/check-positioning.mjs` | exit 0、5 checks PASS |
| `node scripts/check-loop-rules.mjs` | exit 0、4 surfaces PASS。コードでhook環境変数なし/あり・参照到達性を含むことも確認 |
| `node plugins/harness/scripts/check-runtime-config.mjs` | exit 0、57 checks PASS |
| `node scripts/check-guidance-migration.mjs` | exit 0、10 checks PASS、FAIL=0 |
| 4 manifestの `python3 -m json.tool` | 全てexit 0。`.claude-plugin/marketplace.json`、`.agents/plugins/marketplace.json`、`plugins/harness/.claude-plugin/plugin.json`、`plugins/harness/.codex-plugin/plugin.json` |
| `claude plugin validate plugins/harness` | exit 0、Validation passed |
| `git diff --check` | exit 0 |
| `codex plugin marketplace add --help` / `codex plugin add --help` | exit 0。隔離保存先の指定は提示されない。PATH alias作成権限のwarningはhelp取得を妨げなかった |

初回JSON読取はEvaluatorがCodex marketplaceのpathを誤って `.codex-plugin/marketplace.json` と指定して失敗した。
実在する `.agents/plugins/marketplace.json` へ訂正し、上記4件を各々json.toolで完了した。製品・検証コードの修理はしていない。

## 先行判断証拠の再利用と限界

- Claude: `/private/tmp/harness-v061-claude-review-prompt.md` と `...-result.json` を直接読み、
  promptに `08a80b0` のevaluator/evaluation/scope全文が含まれることを `git show` との比較で各々確認した。
  `is_error=false`、実model `claude-fable-5-1`。実行コマンドの記録は [#12 feedback](sprint-004.md)。
  F2/I9・F4/I5は修正、F2/I7・条件不明F0は見送り、データ消失/明示未達/実証回帰は必須修正、
  三つの間接差戻し・同じ見送り再発行・無断厳格化は却下、必須未実施はPASS不可という各出力を確認した。
  `git diff 08a80b0` でevaluationは同一、evaluator/scopeは#14の復帰・引き渡し追加だけで閾値/例外不変と確認。
  16独立ケースを末尾で全体FAILへ集約した点とcase4の残課題表現の揺れは、先行記録の限界として維持する。
- Codex: [#14 fresh独立判断](sprint-004-patch-002.md) のA→B修理/必要確認PASS→A残件、無関係C見送り、
  短い現在地と履歴の区別、取消/置換、外部待ち、子の完了と親の未完の判断を読んだ。
  今回のLoop差分はstate読込契機の明記、scope/state本文はHEADから無変更で、復帰規則は同一のため再利用可能。

これらは少数の合成single-turn実判断であり、installed版の本番長期会話、全host/model、再接続実測を保証しない。
今回の全checkはsource候補の統合検証であり、先行の実判断と同じ種類の証拠ではない。

## 実施範囲と返却

| 段階 | 状態 |
|---|---|
| source候補 | 実装・独立統合評価済み。source PR作成/公開は親の次行動 |
| installed更新 | 未実施。local marketplaceの隔離installも未実施 |
| fresh session実読込 | このEvaluatorは上記source候補のpath/内容を実読込。installed v0.6.1の新sessionは未確認 |
| 消費repo適用 | 合成の新規/既存repoでinit/upgrade実施済み。実業務repo・個人globalは未変更 |
| main merge / tag / Release / 全host導入 | 未実施、今回のPASSや過去承認を実行権限へ転用しない |

隔離installはhelpで正式な保存先指定を確認できず、既存installedを保護し、上位指示で禁止されたHOME/CODEX_HOME再割当も行わなかった。
rubricが認めるmanifest・参照到達性・合成init/upgrade・実role判断の代替を満たすため、必須未達とはしない。

新しい修正対象finding・見送りfindingはない。先行の合成ケース内の見送りを、このrepoの実在課題として再発行しない。
自己レビュー: 各PASSを実読込・実行・判断証拠へ対応させ、必須未実施の隠蔽や合否基準の追加なし。
編集は本feedbackのみ。仕様/state/progress/実装、他者dirty、Git状態は変更していない。起動したserver/browser/watcherなし。
親へPASSを返し、一つのv0.6.1 source PRへまとめる残件へ復帰する。
