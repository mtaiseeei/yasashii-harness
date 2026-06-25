---
name: using-harness
description: ユーザーが短いアイデアからアプリや機能を「作りたい / 作って」と言ったとき、また自律的な仕様→実装→検証のループで開発を進めたいときに使う。ハーネス駆動開発（Planner → Generator → Evaluator）の入口。
---

<SUBAGENT-STOP>
あなたが特定タスクのために dispatch されたサブエージェント（planner / generator / evaluator）なら、
このスキルはスキップして自分の役割に集中すること。
</SUBAGENT-STOP>

# ハーネス駆動開発を使う

このプロジェクトには **ハーネス駆動開発** の能力があります。短いアイデアから、
**Planner → Generator → Evaluator** の自律ループでアプリを作り上げる仕組みです。

## いつ使うか

ユーザーが次のようなことを言ったら、`/harness` の実行を待たずにハーネスを起動する：
- 「〇〇なアプリ／ツール／サイトを作って」
- 「これを実装して」（まとまった機能・新規プロダクト）
- 「仕様から作りたい」「自動で開発を進めて」

小さな単発の修正（typo、1行変更、設定変更）にはハーネスは不要。普通に対応する。

## どう動くか（3エージェント）

| 役割 | サブエージェント | 仕事 | 書き込む正本 |
|---|---|---|---|
| 企画 | `planner` | 短い指示 → 選択式ヒアリング → 正本インデックス、詳細仕様、スプリント契約。「何を作るか」だけ | `docs/spec.md`, `docs/spec/*.md`, `docs/sprints/*.md` |
| 実装 | `generator` | 1スプリント＝1機能ずつ実装＋自己評価 | `docs/progress/sprint-N.md` |
| 検証 | `evaluator` | 利用可能なブラウザ検証面で実際に操作してテスト、閾値で合否 | `docs/feedback/sprint-N.md` |

GANの発想で **生成（Generator）と評価（Evaluator）を分離** しているのが肝。自己評価は甘くなる
ため、独立した懐疑的な評価器がループを締める。

## 起動の仕方

1. **永続ガイダンスとdocs雛形を no-overwrite で用意する** — `CLAUDE.md` / `AGENTS.md` が無ければ
   `templates/` から生成する。`docs/spec.md`、`docs/spec/`、`docs/sprints/`、`docs/progress/`、`docs/feedback/`
   も無ければ作る。既に独自内容がある場合は上書きせず、`docs/harness-guidance.md` に追記候補を残す。
   可能なら、インストール済みプラグインの `scripts/init-guidance.sh` を現在のリポジトリ root に対して実行する。
   スクリプト位置が分からない場合は、この skill directory から2階層上
   （`SKILL.md` ファイルパスからは3階層上）を plugin root とみなし、`<plugin-root>/scripts/init-guidance.sh`
   を探す。
2. **`harness-loop` スキルを開く** — ループの詳細手順・書き込み権限・閾値・絶対ルールが入っている。
   実際にループを回すときは必ずこのスキルに従う。Codex App では Browser Use、Claude Code
   Desktop App では Preview pane、CLI では Playwright を優先して検証する。
3. **`/harness` は明示起動用ショートカット** — ユーザーが普通に会話で作りたいものを伝えているなら、
   `/harness` の実行を要求せず、そのまま初期化して `harness-loop` に進む。

まずユーザーの意図が「まとまった開発」なら、`harness-loop` スキルを Skill ツールで開いて進めること。
