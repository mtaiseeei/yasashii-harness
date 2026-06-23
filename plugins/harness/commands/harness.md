---
description: ハーネス駆動開発を開始する。docs/ の雛形を用意し、Planner→Generator→Evaluator のループを回す。
argument-hint: 作りたいものを一言で（例：シンプルなTODOアプリ）
---

ユーザーは `/harness` を実行しました。ハーネス駆動開発（Planner → Generator → Evaluator）を開始します。

引数（作りたいもの）: $ARGUMENTS

## やること

1. **docs雛形を用意する**（無ければ作る。既存があれば上書きしない）:
   - `docs/spec.md`（空でよい。Planner が書く）
   - `docs/progress.md`（空でよい。Generator が書く）
   - `docs/feedback/`（ディレクトリ。Evaluator が `sprint-N.md` を書く）

2. **永続ガイダンスを no-overwrite で用意する**:
   - まず可能なら次を実行する：
     `bash "$CLAUDE_PLUGIN_ROOT/scripts/init-guidance.sh" "$(pwd)"`
   - `CLAUDE.md` が無ければ、プラグインの `templates/CLAUDE.md` をコピーして作る。
   - `AGENTS.md` が無ければ、プラグインの `templates/AGENTS.md` をコピーして作る。
   - どちらかが既にある場合は上書きせず、`docs/harness-guidance.md` が無ければ
     `templates/docs/harness-guidance.md` をコピーして、既存ガイダンスに追記すべき短いブロックを残す。
   - テンプレートが読めない場合でも、既存の `CLAUDE.md` / `AGENTS.md` は絶対に上書きしない。

3. **`harness-loop` スキルを開く**（Skill ツール）。以降は必ずその手順・書き込み権限・閾値・
   絶対ルールに従ってループを回す。

4. **Step 1（企画）から開始**：
   - 引数が与えられていれば、それを Planner に渡して `docs/spec.md` を生成させる。
   - 引数が空なら、ユーザーに「何を作りたいか」を一言で尋ねてから始める。
   - 重要な前提が曖昧なら、作る前にユーザーへ確認する（brainstorm-before-build）。

5. 仕様が固まったら Step 2（Generator で1スプリント実装）→ Step 3（Evaluator で検証）と進め、
   不合格なら差し戻し、合格なら次スプリントへ。全スプリント合格で完了。

注意：あなたはオーケストレーター。実装・検証は各サブエージェントに dispatch する。
責務を越境させない（詳細は `harness-loop` スキル参照）。
