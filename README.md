# agentic-harness

短いアイデアから、**Planner → Generator → Evaluator** の自律ループでアプリを作り上げる
Claude Code / Codex 向けハーネス。GAN（敵対的生成ネットワーク）の発想で「作る人」と「評価する人」を
分離しているのが肝です。

> ハーネス駆動開発（harness-driven development）を、どのリポジトリにも差し込める
> クリーンなプラグインとしてまとめたものです。

## インストール

### Claude Code

```
/plugin marketplace add mtaiseeei/agentic-harness
/plugin install harness@agentic-harness
```

インストール後、Claude Code では SessionStart フックが入口スキル（`using-harness`）を
additionalContext として注入します。普段は「〇〇なアプリを作って」と普通に会話してください。
明示的に始めたい場合だけ `/harness` を使います。

After installing, just ask for what you want to build. You can also run:

```
/harness your app idea
```

### Codex

このリポジトリには Codex 用の repo marketplace も入っています。

GitHub から追加する場合:

```
codex plugin marketplace add mtaiseeei/agentic-harness
codex plugin add harness@agentic-harness-local
```

ローカル checkout から追加する場合は、**この `agentic-harness` リポジトリの root** を指定します。
取り込み先リポジトリで `.` を指定しないでください。

```
codex plugin marketplace add /absolute/path/to/agentic-harness
codex plugin add harness@agentic-harness-local
```

すでに `agentic-harness-local` marketplace を追加済みなら、取り込み先リポジトリでは次だけで十分です。

```
codex plugin add harness@agentic-harness-local
```

Codex では `AGENTS.md` をプラグインから上書きせず、`using-harness` skill が会話から起動して、
no-overwrite 初期化と `harness-loop` へ進みます。普段は「〇〇なアプリを作って」と普通に会話してください。
明示的に始めたい場合だけ `/harness`、`$using-harness`、または `$harness-loop` を指定します。

## 使い方

会話で「〇〇なアプリを作って」と言うだけで、入口 skill がハーネスを起動します。
明示的に始めたい場合は `/harness シンプルなTODOアプリ` も使えます。

1. **Planner** がアイデアを短い `docs/spec.md`、詳細 `docs/spec/*.md`、`docs/sprints/` のスプリント契約に展開
2. **Generator** が 1スプリント＝1機能ずつ実装し、`docs/progress/sprint-N.md` に自己評価
3. **Evaluator** が実際に操作してテストし、`docs/feedback/sprint-N.md` に合否
4. 不合格なら Generator に差し戻し → 合格なら次スプリントへ

```
Planner ──→ Generator ──→ Evaluator
 (企画)       (実装)         (検証)
               ▲                │
               └─── 不合格時 ───┘
```

## 仕組み

| 構成要素 | 役割 |
|---|---|
| `agents/planner.md` | 「何を作るか」だけを詳細仕様に展開。実装は決めない |
| `agents/generator.md` | 1スプリントずつ実装＋自己評価。技術選定は自分で判断 |
| `agents/evaluator.md` | 実際に動かしてテスト。閾値で合否判定 |
| `skills/using-harness` | 通常入口。会話からハーネス利用を判断し、初期化して `harness-loop` に進む |
| `skills/harness-loop` | オーケストレーションの脳。書き込み権限・閾値・絶対ルール・手順 |
| `commands/harness.md` | `/harness` — 明示起動用ショートカット |
| `hooks/` | Claude Code の SessionStart で `using-harness` を additionalContext として注入 |
| `templates/` | 取り込み先リポジトリ用の `CLAUDE.md` / `AGENTS.md` no-overwrite テンプレート |
| `.codex-plugin/plugin.json` | Codex 用プラグイン manifest |
| `.agents/plugins/marketplace.json` | Codex 用 repo marketplace |

### 書き込み権限の責務分離

| ファイル | 書き手 |
|---|---|
| `docs/spec.md` | Planner のみ |
| `docs/spec/*.md` | Planner のみ |
| `docs/sprints/current.md` | Planner のみ |
| `docs/sprints/sprint-N.md` | Planner のみ |
| `docs/progress/sprint-N.md` | Generator のみ |
| `docs/feedback/sprint-N.md` | Evaluator のみ |

`docs/spec.md` は長い仕様本文ではなく、読むべき詳細仕様と現在スプリントを示す短い正本インデックスです。
全スプリント共通の製品正本は `docs/spec/`、過去スプリント固有の判断は `docs/sprints/`、実装ログは
`docs/progress/` に分けます。

## 設計原則（一次情報に基づく）

1. **What と How を分離** — Planner は「何を」に徹し、「どう作るか」は Generator に委ねる
   （実装の誤指定は下流に伝播する）。
2. **ファイルで受け渡す** — spec index / spec details / sprint contract → progress → feedback。
   セッションをまたいでも状態が残り、過去スプリント判断が現在の正本を肥大化させない。
3. **生成と評価を分離（GAN）** — 自己評価は甘くなる。独立した懐疑的な評価器がループを締める。
4. **閾値で合否・苦手を重く** — 各基準に閾値。モデルが苦手なデザイン性・独自性を重く見る。
5. **実際に動かして検証** — コードを読むだけにせず、利用可能なブラウザ検証面で操作してから採点する。
6. **作る前に合意 / 完了前に検証** — brainstorm-before-build と verification-before-completion。

## ブラウザ検証の方針

Evaluator は環境ごとのネイティブな検証面を優先します。

1. **Codex App:** Browser Use / `@Browser`
2. **Claude Code Desktop App:** Preview pane / autoVerify
3. **Codex CLI / Claude Code CLI:** Playwright test / Playwright script / Playwright MCP
4. **例外:** Computer Use や実 Chrome は、ログイン済みブラウザ状態や GUI 専用操作が必要なときだけ
5. **Fallback:** build、HTTP 疎通、静的スクリーンショット、手動確認項目を feedback に残す

標準経路に Chrome extension を必須化しません。自分のローカル利用では、Codex App は Browser Use、
Claude Desktop は Preview、CLI は Playwright に寄せます。

## CLAUDE.md / AGENTS.md と Hook の考え方

このプラグインは install 時や Hook 実行時に `CLAUDE.md` / `AGENTS.md` を勝手に上書きしません。
会話から Harness が起動した時、または `/harness` を明示実行した時だけ、no-overwrite で生成します。
仕組みは次の通りです。

1. **Claude Code:** `hooks/session-start.sh` が SessionStart 時に `skills/using-harness/SKILL.md` を読み、
   Claude Code 固有の `hookSpecificOutput.additionalContext` として返します。これは「一時的に会話へ
   入口説明を足す」だけで、リポジトリの `CLAUDE.md` は変更しません。
2. **Codex:** Codex は plugin から `AGENTS.md` を上書きしません。代わりに `.codex-plugin/plugin.json`
   で `skills/` を配布し、Codex が skill の `name` / `description` を見て必要時に `SKILL.md` を読みます。
3. **Harness 初期化:** 取り込み先に `CLAUDE.md` / `AGENTS.md` が無ければ `templates/` から生成します。
   会話起動でも `/harness` 起動でも同じ処理です。既に独自内容がある場合は上書きせず、
   `docs/harness-guidance.md` に追記候補だけを残します。
4. **なぜこの形か:** `CLAUDE.md` / `AGENTS.md` はプロジェクト固有の永続ルールです。ハーネスは
   どのリポジトリにも差し込める開発ワークフローなので、永続ルールを上書きせず、skill と runtime
   context として配る方が衝突しにくいです。

## 前提

- Claude Code CLI / Desktop App、Codex CLI / App。
- CLI での UI 検証は Playwright を優先します。初回は `npx playwright install` でブラウザ取得が
  必要な場合があります。
- Claude Code の SessionStart フックは bash スクリプト（macOS / Linux）。Codex ではこの
  additionalContext 注入は使わず、skill として利用します。

## クレジット / 一次情報

このプラグインは以下の一次情報と参考実装に基づいています。

- [Harness design for long-running application development — Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Effective harnesses for long-running agents — Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Building agents with the Claude Agent SDK — Anthropic](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- 方法論の参考: [obra/superpowers](https://github.com/obra/superpowers)

## ライセンス

MIT
