---
description: ハーネス駆動開発を明示的に開始する。通常は会話から using-harness が起動するが、手動で始めたい時に使う。
argument-hint: 作りたいものを一言で（例：シンプルなTODOアプリ）
---

ユーザーは `/harness` を実行しました。通常の会話起動ではなく、明示的にハーネス駆動開発
（Planner → Generator → Evaluator）を開始します。

引数（作りたいもの）: $ARGUMENTS

## やること

1. **docs雛形を用意する**（無ければ作る。既存があれば上書きしない）:
   - `docs/spec.md`（短い正本インデックス。Planner が書く）
   - `docs/spec/product.md`（目的、ユーザー、ゴール/非ゴール。Planner が書く）
   - `docs/spec/features.md`（主要機能一覧。Planner が書く）
   - `docs/spec/constraints.md`（横断制約、禁止事項、安全方針。Planner が書く）
   - `docs/spec/domain.md`（業務ルール、概念データ、KPIなど。Planner が書く）
   - `docs/spec/ui.md`（UI/UX方針。Planner が書く）
   - `docs/sprints/current.md`（現在/次スプリントの索引。Planner が書く）
   - `docs/sprints/sprint-NNN.md`（メインスプリント契約。Planner が書く）
   - `docs/sprints/sprint-NNN-patch-PPP.md`（Patch Sprint契約。Planner が必要時に書く）
   - `docs/progress/`（Generator が対応する `sprint-*.md` を書く）
   - `docs/feedback/`（ディレクトリ。Evaluator が対応する `sprint-*.md` を書く）

2. **永続ガイダンスを no-overwrite で用意する**:
   - まず可能なら次を実行する：
     `bash "$CLAUDE_PLUGIN_ROOT/scripts/init-guidance.sh" "$(pwd)"`
   - `CLAUDE.md` が無ければ、プラグインの `templates/CLAUDE.md` をコピーして作る。
   - `AGENTS.md` が無ければ、プラグインの `templates/AGENTS.md` をコピーして作る。
   - どちらかに独自内容がある場合は上書きせず、`docs/harness-guidance.md` が無ければ
     `templates/docs/harness-guidance.md` をコピーして、既存ガイダンスに追記すべき短いブロックを残す。
   - テンプレートが読めない場合でも、既存の `CLAUDE.md` / `AGENTS.md` は絶対に上書きしない。

3. **`harness-loop` スキルを開く**（Skill ツール）。以降は必ずその手順・書き込み権限・閾値・
   絶対ルールに従ってループを回す。

4. **Step 1（企画）から開始**：
   - 引数が与えられていれば、それを Planner に渡す。
   - 引数が空なら、ユーザーに「何を作りたいか」を一言で尋ねてから始める。
   - Planner はまずユーザーが決めるべき重要判断を最大3つの選択式質問にする。
   - Claude Code では `AskUserQuestion` が使える場合、それを明示的に使う。
   - Codex では選択式ユーザー入力 UI（例: `request_user_input`）が使える場合、それを明示的に使う。
   - 回答を Planner に戻し、Planner は回答内容を解釈して、まだプロダクト方向・成功条件・主要ユーザー体験が
     弱ければ次の選択式質問を出す。
   - 仕様化 readiness gate を満たすまでヒアリングを繰り返す。各ラウンドは最大3問に絞る。
   - ユーザーが「任せる」「進めて」と明示した場合だけ、残りを Planner の前提として置く。
   - 重要判断が固まってから `docs/spec.md`、必要な `docs/spec/*.md`、
     `docs/sprints/current.md`、初回の `docs/sprints/sprint-001.md` を生成する（brainstorm-before-build）。
   - 追加調整が既存スプリントの範囲外なら、小数IDではなく `sprint-NNN-patch-PPP.md` を自動採番する。

5. 仕様が固まったら Step 2（Generator で1スプリント実装）→ Step 3（Evaluator で検証）と進め、
   不合格なら差し戻し、合格なら次スプリントへ。全スプリント合格で完了。

注意：あなたはオーケストレーター。実装・検証は各サブエージェントに dispatch する。
責務を越境させない（詳細は `harness-loop` スキル参照）。
