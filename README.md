# agentic-harness

Agentic Harness は、企画・実装・独立評価・状態遷移を **Planner / Generator / Evaluator の3 role**、
ファイル正本、Sprint でつなぐ Claude Code / Codex 向け開発ハーネスです。
単発の自動実装で終わらず、新規サービス、中小企業にとって大きな業務システム、
既存repoの継続改修など、1回の依頼では安全に完結しない開発を複数Sprintに分けて進めます。

> ハーネス駆動開発（harness-driven development）を、どのリポジトリにも差し込める
> クリーンなプラグインとしてまとめたものです。

「3」は固定のSubagent実体数ではなく、分離するrole数です。ホストが対応する場合は複数Agentを活用し、
対応しない場合もroleごとの独立作業単位として実行します。GeneratorとEvaluatorは常に分離し、
会話ではなく spec / state / progress / feedback を正本にして開発を再開します。

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
明示的に始めたい場合だけ `$using-harness` または `$harness-loop` を指定します
（`/harness` コマンドは Claude Code 専用で、Codex には配布されません）。

## 使い方

普段の会話で、1〜数行の指示から始められます。入力の短さは始めやすさであり、開発規模の上限ではありません。

### 短い新規開発の例

> 地域工務店向けの見積・工程管理サービスを作って。

Plannerが対象業務や最初に作り込む体験を選択式で確認し、specと複数Sprintへ展開します。
ユーザーの重要判断を飛ばして無人完走することは約束しません。

### 既存repoを継続する例

> この既存業務システムの `docs/sprints/state.md` から、次のSprintを進めて。

正本のCurrent ID、Sprint契約、progress、feedbackを照合し、合格済みの条件を回帰チェックで守りながら再開します。

Claude Codeで明示的に始めたい場合は `/harness <短い指示>`、Codexでは `$using-harness` または
`$harness-loop` を使えます。通常会話から始める場合には、いずれも必須ではありません。

## 開発全体を継続する仕組み

1. **Planner** がアイデアを短い `docs/spec.md`、詳細 `docs/spec/*.md`（採点 rubric を含む）、
   `docs/sprints/` のスプリント契約に展開
2. **Generator** が 1スプリント＝1機能ずつ実装し、自動回帰チェックを資産化しながら、
   対応する `docs/progress/sprint-*.md` に自己評価
3. **Evaluator** が実際に操作してテストし、証跡付きで対応する `docs/feedback/sprint-*.md` に合否
4. オーケストレーターが結果を `docs/sprints/state.md` に記録してから遷移。
   不合格なら Generator に差し戻し（仕様欠陥なら Planner へ）→ 合格なら次スプリントへ。
   同一スプリント3回連続不合格はユーザーにエスカレーション

このループはenterprise規模、期間、品質結果を保証するものではありません。開発を続けられる正本と品質gateを用意し、
重要判断と同一Sprintの3回連続失敗はユーザーへ戻します。

```
Planner ──→ Generator ──→ Evaluator
 (企画)       (実装)         (検証)
               ▲                │
               └─── 不合格時 ───┘
```

## Agent runtime設定

初期化時に、既存のTOML／旧JSON設定が無い場合だけ `.harness/config.toml` が作成されます。既定のlifecycleは
`balanced`です。GeneratorとEvaluatorは、同じAgentを再利用できる場合でも互いに別Agent、またはroleごとの
独立作業単位として分離します。

Codexのrole既定は次のとおりです。

| role | model | effort |
|---|---|---|
| Planner | `gpt-5.6-sol` | `high` |
| Generator（standard） | `gpt-5.6-luna` | `xhigh` |
| Generator（strong） | `gpt-5.6-sol` | `high` |
| Evaluator | `gpt-5.6-sol` | `high` |

### Codex実行面の確認状況（2026-07-18）

ここでいう「フル経路」は、Planner / Generator / Evaluatorそれぞれについて、希望model / effortをnativeな
fresh Subagentの起動引数へ渡し、host側metadataで実値を確認できる経路を指します。Codex全機能の優劣を
表す言葉ではありません。

| 実行面 | このrouting機能の状況 | host側で確認できたこと |
|---|---|---|
| Codex CLI | フル経路を確認済み | Sol/highのCLI親Agentからnative `spawn_agent`でfreshなLuna/xhighを起動し、子session metadataでも一致 |
| Codex App | 部分対応 | freshなSol/highとTerra/xhighは一致。Luna指定は`Unknown model`で拒否 |
| Claude Code | host設定を継承 | 既定は全role `inherit`。ユーザーがhostで有効な正式値を明示した場合だけ適用 |

AppとCLIの差は `.harness/config.toml` の項目を増やして固定せず、Harness開始時に観測したcapabilityの
利用可能model一覧と適用経路で解決します。将来Codex Appの一覧へLunaが追加された場合、同じGenerator設定が
native Luna/xhighへ解決されます。現在のAppではLunaが利用不能なので、通常Generatorは既定規則どおり
Sol/highへfallbackします。Terraはユーザーが明示指定した場合には利用できますが、Harnessの通常経路・昇格・
利用不能fallbackでは自動選択しません。

Codex Appで完了済みAgentへfollow-upした検証では、指定値がSol/lowへ変わったため、model / effortを保つresumeは
未対応として扱います。CLIを含め、resume後も同じroutingがhost metadataで確認できるまでは、指定値が必要な
roleは`fork_turns: "none"`のfresh起動を使います。これらは2026-07-18時点の観測結果であり、host更新後は
capabilityと実起動証拠を取り直します。

strongへ昇格するのは、高リスクSprint、2回目の連続`implementation-issue`、またはEvaluatorの証拠付き推薦を
オーケストレーターが確認・採用した場合です。model tierが変わるときは`balanced`でも古いLuna Generatorを
resumeせず、`Model Tier: strong`と`Rotate: model-escalation`をstateへ記録してからfreshなSol Generatorを
起動します。3回目の連続失敗では追加modelを試さずユーザーへ返します。`spec-issue`はPlannerへ戻し、
Generator昇格の回数として消費しません。

通常modelがhostで利用不能なためstrongへfallbackする場合は、失敗昇格と区別して
`Rotate: model-availability`を記録します。resolverがGeneratorをdispatchしない経路ではmodel tierを`null`で返し、
その値をstateへ永続化しません。

OrchestratorはHarnessを動かす本チャットであり、pluginがspawnするroleではありません。そのためruntime configから
本チャットのmodelを変更したとは主張しません。Codexでは本チャットをSol/medium、高リスク時はSol/highで
開始することを推奨します。

Claude Code / Codexごとの `planner` / `generator` / `evaluator` に `model` と `effort` を設定できます。
個人差分はgit管理外の `.harness/config.local.toml` に必要な項目だけ書き、共有設定の他項目を保持します。
Claude Codeの既定は全roleで`inherit`です。Codex名からClaude Codeのmodel名を推定・変換しません。
無効・利用不能・host未対応の値は、その項目だけ警告付きで `inherit` へ戻ります。通常GeneratorのLunaが
利用不能と確認できた場合はSol/highを試し、Solも利用不能ならmodel / effortを`inherit`へ戻します。
Harness自身はTerraを通常・昇格・利用不能fallbackのどこでも自動選択しません。
正確なmodel ID / aliasは共有TOMLの用途付き公式URLコメントで確認してください。前後空白以外を
自動補正せず、曖昧なmodel名を候補へ変換することはありません。

たとえばCodexのGeneratorだけを本チャットのmodelへ戻す最小の個人設定は次です。

```toml
# .harness/config.local.toml
[hosts.codex.roles.generator]
model = "inherit"
effort = "inherit"
```

個人設定は明示したleafだけを上書きし、未指定のlifecycle、他role、effortなどは共有
`.harness/config.toml` の値を維持します。共有側にも指定が無ければplugin既定を使います。
`inherit` は、そのleafについて対象roleへmodelまたはeffortのoverrideを渡さない指定です。ここでいう「親」はHarnessを実行している
本チャットを指し、本チャットで選ばれているmodel／effort、またはチャット側に明示指定が無い場合はhost既定を継承します。

TOML parserはplugin内に固定版を同梱しているため、利用repoでpackage manifest、lockfile、`node_modules`を
作ったり、`npm install`やnetwork accessを行ったりする必要はありません。旧 `config.json` / `config.local.json`
だけのrepoは互換読込と移行warningで動作し、TOMLとの併存時はTOMLだけを正本として旧JSONをmergeしません。

```bash
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host claudeCode --event initial
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host codex --event sprint-change
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host codex --event retry \
  --retry-count 2 --failure-kind implementation-issue --current-model-tier standard
```

`--current-model-tier`にはstate.mdの現在値を渡します。resolverが返すdesired tierと異なるときはfresh化します。
同じtierを継続する場合も、現在の実行面がmodel / effortを保つresumeをhost metadataで確認できた時だけ同じ
Generatorをresumeします。未確認または不一致の場合は正本ファイルを読み直すfresh Agentを使います。
旧版のstate.mdに`Model Tier`が無い場合は、`standard`と推定せず`unknown`を渡します。resolverのdesired tierを
`Model Tier`、`runtime-migration`を`Rotate`へ一度だけ記録してからfresh dispatchします。`unknown`は
resolver入力専用で、state.mdには保存しません。`Model Tier`があり`Rotate`だけ無い場合は`none`を補います。
この互換処理は次回Harness継続時に行い、plugin更新が既存導入repoを直接書き換えることはありません。
Sprint合格時に次Sprintが残っている場合、stateのModel Tierは最後に実dispatchした値を保持します。次のStep 2で
その値とdesired tierを比較してからstateを更新するため、strong→standardの切替でも古いSolを誤ってresumeしません。
全Sprint完了で次dispatchが無い場合だけ`standard` / `none`へ戻します。

Codex plugin manifestはAgent定義を配布しないため、Codexのrole別指定は利用repoのcustom agentまたは
現在のspawn面が対応するときだけ適用します。Harnessは既存の `AGENTS.md`、`CLAUDE.md`、Agent定義、
設定を上書きしません。

Claude Codeのrole別effortは通常のper-dispatch項目ではありません。project側Agent frontmatterなど、
対象roleへeffortを渡す具体的な適用面をcapabilityファイルで確認できた時だけ有効になります。
capabilityファイルはオーケストレーターがHarness開始時またはhost変更時に観測事実から作成し、
`--capabilities <file>` で渡します。値一覧だけでは適用済みになりません。

resolverの`dispatch-ready`は、設定値とhostの受け渡し面を確認できたという意味です。実際にそのmodel / effortで
Subagentが起動した証明ではありません。`launch-verified`はhost側のsession metadata、trace、dispatch記録で
model / effortを確認できた場合だけ使います。host側証拠を取得できなければ、実起動は`unverified`と報告します。

## 構成要素

| 構成要素 | 役割 |
|---|---|
| `agents/planner.md` | Planner role。「何を作るか」を仕様とSprint契約に展開 |
| `agents/generator.md` | Generator role。1Sprintずつ実装し、自動回帰チェックを育てる |
| `agents/evaluator.md` | Evaluator role。Generatorと分離し、実物を証跡付きで評価する |
| `skills/using-harness` | 通常入口。会話からハーネス利用を判断し、初期化して `harness-loop` に進む |
| `skills/harness-loop` | オーケストレーションの脳。書き込み権限・閾値・絶対ルール・手順 |
| `scripts/resolve-runtime-config.mjs` | 共有＋個人設定、host能力、lifecycle actionを解決して実効値を表示 |
| `commands/harness.md` | `/harness` — 明示起動用ショートカット |
| `hooks/` | Claude Code の SessionStart で `using-harness` を additionalContext として注入 |
| `templates/` | 取り込み先リポジトリ用の `CLAUDE.md` / `AGENTS.md` no-overwrite テンプレート |
| `.codex-plugin/plugin.json` | Codex 用プラグイン manifest |
| `.agents/plugins/marketplace.json` | Codex 用 repo marketplace |

### 書き込み権限の責務分離

| ファイル | 書き手 |
|---|---|
| `docs/spec.md` | Planner のみ |
| `docs/spec/*.md`（`rubric.md` を含む） | Planner のみ |
| `docs/sprints/state.md` | オーケストレーター（メインエージェント）のみ |
| `docs/sprints/sprint-NNN.md` | Planner のみ |
| `docs/sprints/sprint-NNN-patch-PPP.md` | Planner のみ |
| `docs/progress/sprint-*.md` | Generator のみ |
| `docs/feedback/sprint-*.md` | Evaluator のみ |

`docs/spec.md` は長い仕様本文ではなく、読むべき詳細仕様を示す短い正本インデックスです。
進行状態（Current ID、各スプリントの Status: planned/active/awaiting-eval/done/deferred/superseded、
Retry Count）は `docs/sprints/state.md` が正本で、サブエージェントではなくオーケストレーターだけが
更新します（旧形式の `docs/sprints/current.md` は初回に state.md へ変換して参照専用にします）。
全スプリント共通の製品正本は `docs/spec/`、過去スプリント固有の判断は `docs/sprints/`、実装ログは
`docs/progress/` に分けます。

スプリントIDは `sprint-005.md` のようにゼロ埋めします。`sprint-5.1.md` や `sprint-5.10.md` のような
小数IDは作りません。合格済みスプリントへの軽微な追加調整は、ユーザーが明示しなくても
`sprint-005-patch-001.md` のような Patch Sprint として切ります。同一画面・同一導線に閉じ、
自動回帰チェックが既にある軽微変更は `Type: micro` として軽量評価（機能完全性・動作安定性・
回帰なしのみ採点）で回せます。

## 設計原則（一次情報に基づく）

1. **What と How を分離** — Planner は「何を」に徹し、「どう作るか」は Generator に委ねる
   （実装の誤指定は下流に伝播する）。
2. **ファイルで受け渡す** — spec index / spec details / sprint contract → progress → feedback。
   セッションをまたいでも状態が残り、過去スプリント判断が現在の正本を肥大化させない。
3. **生成と評価を分離（GAN）** — 自己評価は甘くなる。独立した懐疑的な評価器がループを締める。
4. **閾値で合否・苦手を重く** — 閾値の正本は `docs/spec/rubric.md`。プロジェクト種別に応じて
   Planner が調整し、モデルが苦手なデザイン性・独自性を重く見る。
5. **実際に動かして検証・証跡を残す** — コードを読むだけにせず、利用可能なブラウザ検証面で
   操作してから採点する。証跡（コマンド結果・実操作の記録・視覚評価時のスクリーンショット）の
   無い合格は無効。
6. **作る前に合意 / 完了前に検証** — brainstorm-before-build と verification-before-completion。
7. **回帰を資産化する** — 合格した受け入れ基準は Generator が自動チェックとして回帰スイートに
   積み、Evaluator はスイート実行＋新規面の実操作確認に集中する。

## ブラウザ検証の方針

Evaluator は環境ごとのネイティブな検証面を優先します。

1. **Codex App:** Browser Use / `@Browser`
2. **Claude Code Desktop App:** Preview pane / autoVerify
3. **Codex CLI / Claude Code CLI:** Playwright test / Playwright script。Playwright MCP は
   ホスト側に既設の場合のみ使い、ハーネスからは常時起動しない
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
3. **Harness 初期化:** 取り込み先に `CLAUDE.md` / `AGENTS.md` / Harness runtime設定が無ければ、`.harness/config.toml` などを `templates/` から生成します。
   会話起動でも `/harness` 起動でも同じ処理です。既に独自内容がある場合は上書きせず、
   `docs/harness-guidance.md` に追記候補だけを残します。既存Harness設定やAgent定義も変更しません。
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
