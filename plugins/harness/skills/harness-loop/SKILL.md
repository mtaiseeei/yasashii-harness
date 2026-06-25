---
name: harness-loop
description: ハーネス駆動開発のループを実際に回すときの手順書。Planner→Generator→Evaluatorの進め方、docs/の書き込み権限の責務分離、評価の閾値、絶対ルールを定義する。アプリや機能をまとまった単位で自律開発するときに使う。
---

# ハーネス駆動開発ループ（オーケストレーションの脳）

あなた（メインのエージェント）は **オーケストレーター** です。3つのサブエージェント
（`planner` / `generator` / `evaluator`）を順に dispatch し、ファイル経由で受け渡しながら
ループを回します。

```
Planner ──→ Generator ──→ Evaluator
 (企画)       (実装)         (検証)
               ▲                │
               └─── 不合格時 ───┘
```

## ファイル規約（書き込み権限の責務分離）

| パス | 用途 | 書き込み権限 |
|------|------|-------------|
| `docs/spec.md` | 短い正本インデックス。読むべき詳細仕様・現在スプリントへの索引 | **Planner のみ** |
| `docs/spec/product.md` | 目的、対象ユーザー、ゴール/非ゴール、成功状態 | **Planner のみ** |
| `docs/spec/features.md` | 主要機能一覧。全スプリントにまたがる機能IDと振る舞い | **Planner のみ** |
| `docs/spec/constraints.md` | 横断制約、禁止事項、PII/安全方針、絶対に回帰させない条件 | **Planner のみ** |
| `docs/spec/domain.md` | 業務ルール、概念データ、KPI/計算方針などのドメイン正本 | **Planner のみ** |
| `docs/spec/ui.md` | 全体UI/UX方針、画面遷移、アクセシビリティ方針 | **Planner のみ** |
| `docs/sprints/current.md` | 現在/次スプリントの薄い索引。対象スプリント契約へのリンク | **Planner のみ** |
| `docs/sprints/sprint-N.md` | スプリント専用契約。ゴール、対象機能、前提、受け入れ基準 | **Planner のみ** |
| `docs/progress/sprint-N.md` | スプリント実装進捗・自己評価・引き渡し事項 | **Generator のみ** |
| `docs/feedback/sprint-N.md` | スプリント評価結果 | **Evaluator のみ** |

- 仕様正本とスプリント契約は Planner だけが書く。Generator・Evaluator は読み取り専用。
- `docs/spec.md` は全文仕様を書き込む場所ではなく、短い入口と索引に保つ。
- 全スプリント共通の重要事項は `docs/spec/*.md` に置く。過去スプリント固有の判断は `docs/sprints/sprint-N.md` に閉じ込める。
- 進捗は Generator だけが `docs/progress/sprint-N.md` に書く。Evaluator は読み取り専用。
- フィードバックは Evaluator だけが書く。Generator は読み取り専用。
- 既存プロジェクトに古い `docs/progress.md` が残っている場合、新規追記はせず参照用の旧ログとして扱う。

## 手順

### 0. 準備（docs雛形）
`docs/` が無ければ、次を no-overwrite で作る
（通常は `using-harness` が会話から起動して生成する。`/harness` コマンドでも生成できる）。

- `docs/spec.md`
- `docs/spec/product.md`
- `docs/spec/features.md`
- `docs/spec/constraints.md`
- `docs/spec/domain.md`
- `docs/spec/ui.md`
- `docs/sprints/current.md`
- `docs/progress/`
- `docs/feedback/`

永続ガイダンスも no-overwrite で用意する：
- `CLAUDE.md` が無ければ `templates/CLAUDE.md` から作る。
- `AGENTS.md` が無ければ `templates/AGENTS.md` から作る。
- 既に独自内容がある場合は上書きせず、`docs/harness-guidance.md` が無ければ
  `templates/docs/harness-guidance.md` から作り、既存ガイダンスへの追記候補を残す。
- Hook は永続ファイルを生成しない。生成はユーザーの会話が `using-harness` に該当した時、または
  `/harness` を明示実行した時だけ行う。

### Step 1: 企画（Planner を dispatch）
- ユーザーの短いプロンプトを Planner に渡す。
- Planner はいきなり `docs/spec.md` を完成させず、まずユーザーが決めるべき重要判断を
  最大3つの選択式質問にする。
- Claude Code では `AskUserQuestion` が使える場合、それを明示的に使う。
- Codex では選択式ユーザー入力 UI（例: `request_user_input`）が使える場合、それを明示的に使う。
- どちらも使えない場合は、通常メッセージで短い番号付き選択肢として質問する。
- 回答を Planner に戻し、Planner は回答内容を解釈して、まだプロダクト方向・成功条件・主要ユーザー体験が
  弱ければ、次の選択式質問を出す。
- 仕様化 readiness gate を満たすまで、このヒアリングを繰り返す。各ラウンドは最大3問に絞る。
- ユーザーが「任せる」「進めて」と明示した場合だけ、残りを Planner の前提として置く。
- 重要判断が固まってから、Planner に `docs/spec.md`、必要な `docs/spec/*.md`、`docs/sprints/current.md`、
  初回の `docs/sprints/sprint-N.md` を生成させる。最初のヒアリングを省略しない。
- 軽微な曖昧さは Planner が前提を置き、横断前提は `docs/spec/product.md` または
  `docs/spec/constraints.md`、スプリント固有前提は `docs/sprints/sprint-N.md` に明記する。
  （brainstorm-before-build：作る前に設計を合意する）。

仕様化 readiness gate：
- ターゲットユーザーが明確。
- 最初に強く作り込む主要体験が明確。
- 成功状態・受け入れ基準の方向性が明確。
- スコープ外が明確。
- デザインや体験の方向性に明確な意図がある。

### Step 2: 実装（Generator を dispatch）
- 「`docs/spec.md`、そこに示された必読 `docs/spec/*.md`、`docs/sprints/current.md`、対象の
  `docs/sprints/sprint-N.md`、既存の `docs/progress/sprint-N.md`、該当 feedback を読み、
  次の1スプリントだけ実装」と指示する。
- **1回の dispatch で1スプリントのみ**。
- 完了後、`docs/progress/sprint-N.md` に自己評価と引き渡し事項（起動方法・URL・テストシナリオ）が
  書かれていることを確認する。
- 前スプリントの不合格フィードバックがあれば、Generator はそれを先に直す。

### Step 3: 検証（Evaluator を dispatch）
- 「`docs/spec.md`、必読 `docs/spec/*.md`、`docs/sprints/current.md`、対象の
  `docs/sprints/sprint-N.md` の受け入れ基準、`docs/progress/sprint-N.md` の引き渡し事項を読み、利用可能な
  ブラウザ検証面で実際に操作してテストし、`docs/feedback/sprint-N.md` に結果を書く」と指示する。
- **不合格** → Step 2 へ戻る（Generator が修正）。
- **合格** → 次スプリントの Step 2 へ。全スプリント合格で完了。

### ブラウザ検証面の優先順位
Evaluator はコードを読むだけで判断しない。利用環境に応じて、次の優先順位で実物を操作する。

1. **Codex App:** Browser Use / `@Browser`。ローカル preview、クリック、フォーム入力、スクリーンショット、
   console/network 確認に使う。
2. **Claude Code Desktop App:** Preview pane / autoVerify。Claude ネイティブの embedded preview で
   dev server 起動、スクリーンショット、DOM inspection、クリック、フォーム入力を行う。
3. **Codex CLI / Claude Code CLI:** Playwright。既存の Playwright test があれば実行し、無ければ
   Playwright script / CLI / MCP で最低限の起動確認、スクリーンショット、フォーム操作、console error 確認を行う。
4. **例外:** Computer Use や実 Chrome は、ログイン済みブラウザ状態、ネイティブアプリ、GUI 専用操作が
   必要なときだけ使う。標準経路にはしない。
5. **Fallback:** どれも使えない場合は、build、HTTP 疎通、静的スクリーンショット、手動確認項目を
   `docs/feedback/sprint-N.md` に明記する。

### モデル指定の方針

- プラグイン側で Claude 固有の `opus` などのモデル名を固定しない。ユーザー/ホストの既定モデルを継承する。
- ホストが役割ごとのモデル選択をサポートし、ユーザーが許可している場合だけ、Planner と Evaluator は
  そのホストで利用可能な高推論・高品質モデルを優先してよい。
- Generator は原則としてホスト既定モデルを使う。実装が複雑でユーザーが品質優先を望む場合だけ上げる。
- Codex では Claude のモデル名を前提にしない。

## 評価基準と閾値

| 基準 | 閾値 | 不合格時 |
|------|------|---------|
| 機能完全性 | 4/5 以上 | Generator に差し戻し |
| 動作安定性 | 4/5 以上 | Generator に差し戻し |
| デザイン性 | 3/5 以上 | Generator に差し戻し |
| 独自性 | 3/5 以上 | Generator に差し戻し |
| エラーハンドリング | 3/5 以上 | Generator に差し戻し |
| 回帰なし | 5/5 必須 | Generator に差し戻し |

**1つでも閾値を下回ればスプリント不合格。**

## 絶対ルール

1. **責務を越境しない** — Planner は実装しない。Generator は仕様を変更しない。Evaluator は
   コードを修正しない。各エージェントは自分の正本ファイルだけを書く。
2. **スプリント順序を守る** — Sprint 1 → 2 → 3 と順に。スキップ禁止。
3. **動作する状態を維持する** — 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** — Generator は新スプリント着手前に、前スプリントの
   不合格フィードバックを修正する。
5. **起動手順を必ず記載する** — Generator は `docs/progress/sprint-N.md` に起動コマンドを毎回明記し、
   Evaluator はそれに従って起動する。
6. **作る前に合意する** — まとまった開発では、Planner の仕様をユーザーが確認してから実装に入る。
   ユーザーが決めるべき重要判断は、選択式ヒアリングで確認してから仕様化する。最初のヒアリングを省略しない。
7. **完了前に検証する** — 「実装したから完了」にしない。Evaluator が実際に動かして確かめるまで
   スプリントは完了扱いにしない（verification-before-completion）。

## サブエージェントへの dispatch 例

- Planner: 「次のアイデアについて、まずユーザーが決めるべき重要判断を最大3つの選択式質問にして。
  回答を解釈し、readiness gate を満たすまで必要な追加質問を続けてから `docs/spec.md`、
  `docs/spec/*.md`、`docs/sprints/current.md`、初回の `docs/sprints/sprint-N.md` に展開して：
  『<ユーザーのプロンプト>』」
- Generator: 「`docs/spec.md`、必読 `docs/spec/*.md`、`docs/sprints/current.md`、
  `docs/sprints/sprint-<N>.md` を読み、Sprint <N> を実装し、`docs/progress/sprint-<N>.md` を更新して。
  前回 feedback があれば先に直して」
- Evaluator: 「Sprint <N> を利用可能なブラウザ検証面で検証し、`docs/feedback/sprint-<N>.md` に合否を書いて」
