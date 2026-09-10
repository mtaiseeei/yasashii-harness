# Sprint 001 Patch 001 — Planner / grilling

**ステータス:** 実装完了 - 評価待ち

## 着手時の契約

- AC-01〜05: Plannerが必要性を判断し、必要時だけ同梱grillingを利用する。未決事項の相談、ユーザーの意思と正本所有、host fallbackを保つ。
- upstream本文とlicenseの配布整合、既存回帰、独立roleの行動確認で検証する。独立評価はEvaluatorへ引き渡す。
- version / runtime / cache / 公開は変更しない。

## 実装内容

- `plugins/harness/agents/planner.md` に要否判断を集約。明確な依頼は省略、孤立した不足は短い通常確認、重大な曖昧さ・判断の依存関係・矛盾は遠慮せずgrillingを呼ぶ。
- 要否・範囲判断に迷う場合は、未決事項・理由・推奨案をオーケストレーターへ相談。全件の呼び出し承認待ちは作らない。
- `plugins/harness/skills/grilling/SKILL.md` と `LICENSE` を同梱。upstream revision `3cca18b368ae95cdbdebbff572ccafa662551015` の本文を保持し、Harness接続節を分離した。
- Skill専用ツールまたはplugin相対パスのReadで呼べる。質問UIの件数制約は全体の上限にせず、UI・subagentが使えない場合の通常質問、ローカル調査、親中継を定義した。
- Plannerが未決範囲と既存の正本保存先を決め、合意・理由・具体例を受け入れ基準へ反映。未依頼機能・AI活用・機能数の強制を撤去した。
- loop、command、entry skill、テンプレート、現行ガイダンスをPlanner gateへの参照へ揃えた。
- 既存 `scripts/check-loop-rules.mjs` に同梱本文・licenseのhash、Codex Skill配布path、関連する相対リンクの検査を追加した。Windows checkoutのCRLFはLFに正規化してからhashを比較する。質問の文言一致検査や専用評価基盤は増やしていない。

## 検証結果

- `node scripts/check-loop-rules.mjs`: exit 0。既存13面の語彙確認と新しいSkill配布整合を通過。
- `PYTHONPATH=/Users/taisei/.cache/uv/archive-v0/ZqTPL3luUJL18RS8F_0xJ/lib/python3.11/site-packages python3 /Users/taisei/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/harness/skills/grilling`: exit 0、`Skill is valid!`。
- read-only検索: 現行配布・案内に `最大3`、`at most three`、`ヒアリングを省略しない`、`question loop is mandatory`、旧機能数目標の残存なし。過去のSprint/progress/feedbackは対象外。
- `git diff --check`: exit 0。
- リンク検査の作成中、旧文書内のサンプルリンクと外部URLを誤ってローカル読込する検査エラーを修正。新規SkillとPlannerの配布リンクだけを検証する形に絞り、最終実行は成功した。

## 自己評価

| 基準 | スコア | 根拠・限界 |
|---|---:|---|
| 機能完全性 | 4/5 | gate・実Skill呼出・相談の指示と配布整合を実装。独立roleでの実行はEvaluator待ち |
| 動作安定性 | 4/5 | Skill構文とpackage整合を確認。host fallbackの行動評価は未実施 |
| 意思・責務の保持 | 5/5 | 明示指示・既決事項・委任・正本所有の境界を維持 |
| 配布・文書正確性 | 5/5 | 本文とlicenseのhash一致、固定revision、現行参照の整合を確認 |
| 回帰なし | 保留 | 対象loop-ruleはPASS。残る指定回帰は親の最終検証で実行する |

## 技術的な判断

要否判断はPlanner、深掘り手順はgrillingの一箇所ずつを正本にした。Codex manifestは既に `skills/` 全体を配布するため変更不要。
原文を変えず、hostの質問UI・batch制約、委任、調査のfallbackだけを薄いHarness adapterとして先頭に置いた。
新しいrole・設定・管理ファイル・versionは追加しない。検証だけの差分ではなく、今回の検証追加は製品指示の変更より小さい。

## Evaluatorへの引き渡し

- 対象は画面のないSkill / role指示。起動入口は `plugins/harness/agents/planner.md` のGrilling gateと、必要時の `plugins/harness/skills/grilling/SKILL.md` 読込。
- 必須シナリオ1〜6はPatch契約どおり。実際の指示を読んだ独立roleで、省略・限定確認・深掘り・相談・明示委任と無回答・host fallbackを確認する。
- 模擬回答は模擬と明記する。Generatorの自己評価を行動証拠として扱わない。
- 最終回帰: `node scripts/check-positioning.mjs`、`node scripts/check-loop-rules.mjs`、`node plugins/harness/scripts/check-runtime-config.mjs`。親がまとめて実行するためGeneratorでは重複実行していない。
- 既知の製品課題なし。実hostへの導入・公開・cache反映は本Patch対象外。
