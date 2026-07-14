---
name: using-harness
description: 短い新規アイデア、まとまった機能開発、または既存Harness repoの次Sprint・Patchを「作りたい / 進めたい / 続きから」と言ったときに使う。短い指示を入口に、3 role、ファイル正本、Sprint、独立評価で大きな開発を継続するハーネス駆動開発の入口。
---

<SUBAGENT-STOP>
あなたが特定タスクのために dispatch されたサブエージェント（planner / generator / evaluator）なら、
このスキルはスキップして自分の役割に集中すること。
</SUBAGENT-STOP>

# ハーネス駆動開発を使う

**短い指示は入口。大きな開発を継続的に前へ進めることが本体。**

このプロジェクトには、企画・実装・独立評価・状態遷移をファイル正本とSprintでつなぐ
**ハーネス駆動開発** の能力があります。短い新規アイデアからも、既存repoのCurrent IDからも開始できます。

## いつ使うか

ユーザーが次のようなことを言ったら、`/harness` の実行を待たずにハーネスを起動する：
- 「〇〇なアプリ／ツール／サイトを作って」
- 「これを実装して」（まとまった機能・新規プロダクト）
- 「仕様から作りたい」「複数Sprintで開発を進めて」
- Harness管理下の既存repoで「続きから」「次のSprintを進めて」「この追加をPatchにして」

小さな修正の扱いは、リポジトリがハーネス管理下かどうかで変わる：

- **非管理下のリポジトリ**（`docs/sprints/state.md` も `docs/spec.md` も無い）：
  小さな単発の修正（typo、1行変更、設定変更）にはハーネスは不要。普通に対応する。
- **ハーネス管理下のリポジトリ**：小さく見えてもハーネス外で直すのを既定にしない。
  `docs/sprints/state.md` を読み、必ず次の3つに分類してから着手する。
  1. **直接修正** — typo・コメント・ドキュメント・設定値など、アプリの挙動を変えない変更。ハーネス外で直してよい。
  2. **micro-patch** — 挙動やUIに触れる軽微な変更で、同一画面・同一導線に閉じ、その導線を守る
     自動回帰チェックが既に存在するもの。`Type: micro` の Patch Sprint として軽量ループを回す。
  3. **通常の Patch Sprint / 次のメインスプリント** — それ以外。`harness-loop` に従う。

## どう動くか（3 role）

| role | 対応ホストでの実行主体 | 仕事 | 書き込む正本 |
|---|---|---|---|
| 企画 | `planner` | 短い指示 → 選択式ヒアリング → 正本インデックス、詳細仕様、採点 rubric、スプリント契約。「何を作るか」だけ | `docs/spec.md`, `docs/spec/*.md`, `docs/sprints/sprint-*.md` |
| 実装 | `generator` | 1スプリント＝1機能ずつ実装＋自己評価＋回帰チェックの資産化。範囲外追加は勝手に混ぜず Patch Sprint へ回す | `docs/progress/sprint-*.md` |
| 検証 | `evaluator` | 利用可能なブラウザ検証面で実際に操作してテスト、rubric の閾値で合否。合格には証跡必須 | `docs/feedback/sprint-*.md` |

進行状態の正本 `docs/sprints/state.md`（Current ID・各スプリントの Status・Retry Count）は、
この3 roleではなく **オーケストレーター（メインエージェント）だけ** が書く。

GANの発想で **生成（Generator）と評価（Evaluator）を分離** しているのが肝。自己評価は甘くなる
ため、独立した懐疑的な評価器がループを締める。

この3 roleは、常に3つのSubagent実体が配布・起動するという意味ではない。ホストが複数Agentを扱える場合はそれを活用し、
対応しない場合は **1作業単位1 role** の独立作業単位へfallbackする。どちらでもGeneratorとEvaluatorの分離は維持する。

## 起動の仕方

1. **永続ガイダンス、runtime設定、docs雛形を no-overwrite で用意する** — `CLAUDE.md` / `AGENTS.md` が無ければ
   `templates/` から生成する。`docs/spec.md`、`docs/spec/`（`rubric.md` を含む）、`docs/sprints/state.md`、
   `docs/progress/`、`docs/feedback/` も無ければ作る。既に独自内容がある場合は上書きせず、
   `docs/harness-guidance.md` に追記候補を残す。
   既存のTOML／旧JSON設定が無ければ `.harness/config.toml` の共有設定雛形を作り、既存設定は編集しない。
   個人上書きは `.harness/config.local.toml` に必要な項目だけ書く（`.harness/.gitignore` は新旧local設定を除外する）。
   可能なら、インストール済みプラグインの `scripts/init-guidance.sh` を現在のリポジトリ root に対して実行する。
   スクリプト位置が分からない場合は、この skill directory から2階層上
   （`SKILL.md` ファイルパスからは3階層上）を plugin root とみなし、`<plugin-root>/scripts/init-guidance.sh`
   を探す。
2. **`harness-loop` スキルを開く** — ループの詳細手順・runtime設定解決・書き込み権限・閾値・絶対ルールが入っている。
   実際にループを回すときは必ずこのスキルに従う。Codex App では Browser Use、Claude Code
   Desktop App では Preview pane、CLI では Playwright を優先して検証する。
3. **`/harness` は明示起動用ショートカット** — ユーザーが普通に会話で作りたいものを伝えているなら、
   `/harness` の実行を要求せず、そのまま初期化して `harness-loop` に進む。

補足:
- スプリントIDは `sprint-005.md` のようにゼロ埋めにする。`sprint-5.10.md` のような小数IDは新規作成しない。
- 合格済みスプリントへの軽微な追加調整は、ユーザーが明示しなくても `sprint-005-patch-001.md` のような
  Patch Sprint として扱う。条件を満たす軽微変更は `Type: micro` の軽量評価にできる（`harness-loop` 参照）。
- 既存プロジェクトに旧形式の `docs/sprints/current.md` がある場合、初回起動時に `harness-loop` の
  移行ルールに従って `docs/sprints/state.md` へ変換する。

まずユーザーの意図が「まとまった開発」なら、`harness-loop` スキルを Skill ツールで開いて進めること。
