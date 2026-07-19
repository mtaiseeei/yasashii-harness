# やさしいハーネス（yasashii-harness）

やさしいハーネスは、非エンジニア向けAI秘書 **やさしいセクレタリ（yasashii-secretary）** と連携して
「開発の脳」を担う補助プラグインです。秘書に「〇〇を作って」と頼んだとき、
実際の企画→実装→検証を引き受けるのがこのハーネスです。

上流の [Agentic Harness](https://github.com/mtaiseeei/agentic-harness) をそのまま土台にし、
規律（Planner / Generator / Evaluator の3 role、ファイル正本、Sprint、独立評価）は緩めず、
報告と言葉遣いだけを非エンジニアにも追いやすくしています。

## やさしいシリーズでの位置づけ

- **やさしいセクレタリ**（[mtaiseeei/yasashii-secretary](https://github.com/mtaiseeei/yasashii-secretary)）:
  記憶・予定・プロジェクトを扱うAI秘書。シリーズの本体で、日々の窓口です。
- **やさしいハーネス**（このリポジトリ）: 秘書から「〇〇を作って」で接続される開発担当。
  企画（Planner）→実装（Generator）→検証（Evaluator）のループを回します。

配布は独立したプラグインです。秘書の `build` スキルが導入状態を確認し、未導入なら導入手順を
案内します。やさしいハーネス単体でも、上流と同じく Claude Code / Codex 両対応の
通常の開発ハーネスとして使えます。

## 入れ方

### Claude Code（3コマンド）

上から順に実行します。

```text
/plugin marketplace add mtaiseeei/yasashii-harness
/plugin install harness@yasashii-harness
/harness 作りたいものを一言で説明
```

### Codex

```text
codex plugin marketplace add mtaiseeei/yasashii-harness
codex plugin add harness@yasashii-harness
```

どちらのホストでも、導入後は「〇〇なアプリを作って」と普通に会話するだけで起動します。
明示的に始めたいときは、Claude Code では `/harness`、Codex では `$using-harness` または
`$harness-loop` を使います（`/harness` コマンドは Claude Code 専用です）。

## 何をしてくれるか

- **企画（Planner）**: 短い指示から、大事な決めごとを選択式の質問で確認し、仕様とSprint計画に
  展開します。重要な判断を勝手に決めて無人完走することは約束しません。
- **実装（Generator）**: 1Sprint＝1機能ずつ実装し、合格した機能を守る自動チェックを育てます。
- **検証（Evaluator）**: 実装とは独立に、実際にアプリを操作して合否を判定します。
  証跡のない合格は無効です。

途中で止めても、`docs/spec.md` や `docs/sprints/state.md` などのファイルが正本として残るため、
別の日に「続きから」で再開できます。

## やさしさの範囲

やさしさは、言葉遣い、3行報告、次の一手の提案にだけ加えます。Planner / Generator / Evaluator の
分離、評価閾値、根拠、記憶保護、回帰ゼロ許容は緩めません。

## 上流との関係

技術的な詳細（Codexでのmodel routing、`.harness/config.toml` によるruntime設定、ブラウザ検証の
方針など）は、上流の [Agentic Harness の README](https://github.com/mtaiseeei/agentic-harness#readme)
と `docs/KNOWLEDGE.md` を参照してください。

このリポジトリは上流の本文・skills・agents・runtimeロジックを書き換えません。やさしさ差分の
管理方法は [gentle-overlay/README.md](gentle-overlay/README.md) を参照してください。

## ライセンス

MIT（上流と同じ）
