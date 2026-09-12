# agentic-harness Development Guide

Claude Code / Codex向け `harness` pluginの源流。目的・決定・現在地の継承と、影響に応じた設計・検証が中心。

- 小変更は直接修正・必要検証で完了。通常機能は短い計画と完成時独立レビュー。
  大きな開発や継続作業の進め方が必要なら [using-harness](plugins/harness/skills/using-harness/SKILL.md)。
- 現在状態は `docs/sprints/state.md`、該当仕様は [索引](docs/spec.md) から必要な領域だけ読む。
  履歴の全件照合を開始条件にしない。背景や理由が必要なときだけ [KNOWLEDGE](docs/KNOWLEDGE.md)。
- 承認済み範囲の可逆な実装・修理は進め、未承認の重要判断や副作用だけを確認する。
  独自規則・dirty・有効な承認を保護する。高リスク操作は実行前確認と実行後検証を維持する。
- checkoutを配布源流として編集し、下流は正式同期手順を使う。installed cacheを実装のために直接編集しない。
  初期化no-overwriteと承認済み文書移行を区別する。無関係なmodel/effort設定・権限は変更しない。
- Sprintで分担する場合はPlannerが仕様・契約、Generatorが実装・progress、Evaluatorが独立feedback。
  stateはオーケストレーターだけが更新し、実装済み・検証済み・配備済みを区別する。
- Codexはskillsを配布し、Claude Codeのagents/commandsと同一機構と偽らない。modelはhost継承が既定。
  hookは文書を書かず短い入口だけを渡す。Playwright MCPを必須依存やagent frontmatterにしない。
- Git公開はセッションの承認に従う。承認されたGenerator commitはSprint使用時そのIDをprefixにする。
  `git init` は新規repoだけ。acceptance tagはopt-in。必須parserとlicenseはplugin内に同梱する。

## 基本検証

変更に関係するものを実行する。全体変更時は以下を実施し、再評価は関連差分へ絞る。

- `node scripts/check-positioning.mjs`
- `node scripts/check-loop-rules.mjs`（hookの環境変数なし/あり、参照到達性も検証）
- `node plugins/harness/scripts/check-runtime-config.mjs`
- `node scripts/check-guidance-migration.mjs`（初期化・保守移行変更時）
- JSON manifests: `python3 -m json.tool <file>`。利用可能なら `claude plugin validate plugins/harness`。
- Codex配布変更時: local marketplaceの `harness@agentic-harness-local` installを隔離環境で確認する。
