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
| `docs/spec.md` | 製品仕様書 | **Planner のみ** |
| `docs/progress.md` | 実装進捗・自己評価・引き渡し事項 | **Generator のみ** |
| `docs/feedback/sprint-N.md` | スプリント評価結果 | **Evaluator のみ** |

- 仕様書は Planner だけが書く。Generator・Evaluator は読み取り専用。
- 進捗は Generator だけが書く。Evaluator は読み取り専用。
- フィードバックは Evaluator だけが書く。Generator は読み取り専用。

## 手順

### 0. 準備（docs雛形）
`docs/` が無ければ `docs/spec.md`・`docs/progress.md`・`docs/feedback/` を作る
（`/harness` コマンドでも生成できる）。

### Step 1: 企画（Planner を dispatch）
- ユーザーの短いプロンプトを渡し、`docs/spec.md` を生成させる。
- 重要な前提が曖昧なら、Planner が挙げた確認事項を **ユーザーに確認してから** 先へ進む
  （brainstorm-before-build：作る前に設計を合意する）。

### Step 2: 実装（Generator を dispatch）
- 「`docs/spec.md` と `docs/progress.md` を読み、次の1スプリントだけ実装」と指示する。
- **1回の dispatch で1スプリントのみ**。
- 完了後、`docs/progress.md` に自己評価と引き渡し事項（起動方法・URL・テストシナリオ）が
  書かれていることを確認する。
- 前スプリントの不合格フィードバックがあれば、Generator はそれを先に直す。

### Step 3: 検証（Evaluator を dispatch）
- 「`docs/spec.md` の受け入れ基準と `docs/progress.md` の引き渡し事項を読み、利用可能な
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
5. **起動手順を必ず記載する** — Generator は `docs/progress.md` に起動コマンドを毎回明記し、
   Evaluator はそれに従って起動する。
6. **作る前に合意する** — まとまった開発では、Planner の仕様をユーザーが確認してから実装に入る。
7. **完了前に検証する** — 「実装したから完了」にしない。Evaluator が実際に動かして確かめるまで
   スプリントは完了扱いにしない（verification-before-completion）。

## サブエージェントへの dispatch 例

- Planner: 「次のアイデアを `docs/spec.md` に展開して：『<ユーザーのプロンプト>』」
- Generator: 「`docs/spec.md` の Sprint <N> を実装し、`docs/progress.md` を更新して。
  前回 feedback があれば先に直して」
- Evaluator: 「Sprint <N> を利用可能なブラウザ検証面で検証し、`docs/feedback/sprint-<N>.md` に合否を書いて」
