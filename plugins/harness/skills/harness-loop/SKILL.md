---
name: harness-loop
description: ハーネス駆動開発のループを実際に回すときの手順書。Planner→Generator→Evaluatorの進め方、docs/の書き込み権限の責務分離、orchestration state（docs/sprints/state.md）、評価の閾値、絶対ルールを定義する。アプリや機能をまとまった単位で自律開発するときに使う。
---

# ハーネス駆動開発ループ（オーケストレーションの脳）

あなた（メインのエージェント）は **オーケストレーター** です。3つのサブエージェント
（`planner` / `generator` / `evaluator`）を順に dispatch し、ファイル経由で受け渡しながら
ループを回します。進行状態の正本 `docs/sprints/state.md` はあなただけが書きます。

```
Planner ──→ Generator ──→ Evaluator
 (企画)       (実装)         (検証)
               ▲                │
               └─── 不合格時 ───┘
```

## ファイル規約（書き込み権限の責務分離）

| パス | 用途 | 書き込み権限 |
|------|------|-------------|
| `docs/spec.md` | 短い正本インデックス。読むべき詳細仕様への索引 | **Planner のみ** |
| `docs/spec/product.md` | 目的、対象ユーザー、ゴール/非ゴール、成功状態 | **Planner のみ** |
| `docs/spec/features.md` | 主要機能一覧。全スプリントにまたがる機能IDと振る舞い | **Planner のみ** |
| `docs/spec/constraints.md` | 横断制約、禁止事項、PII/安全方針、絶対に回帰させない条件 | **Planner のみ** |
| `docs/spec/domain.md` | 業務ルール、概念データ、KPI/計算方針などのドメイン正本 | **Planner のみ** |
| `docs/spec/ui.md` | 全体UI/UX方針、画面遷移、アクセシビリティ方針 | **Planner のみ** |
| `docs/spec/rubric.md` | 採点基準。基準ごとの閾値とスコアのアンカー例 | **Planner のみ** |
| `docs/sprints/state.md` | 進行状態の正本。Current ID、各スプリントの Status、Retry Count | **オーケストレーターのみ** |
| `docs/sprints/sprint-NNN.md` | メインスプリント契約。例: `sprint-005.md` | **Planner のみ** |
| `docs/sprints/sprint-NNN-patch-PPP.md` | 合格済み/範囲外追加用 Patch Sprint 契約。例: `sprint-005-patch-001.md` | **Planner のみ** |
| `docs/progress/sprint-*.md` | スプリント実装進捗・自己評価・引き渡し事項 | **Generator のみ** |
| `docs/feedback/sprint-*.md` | スプリント評価結果 | **Evaluator のみ** |
| `docs/sprints/current.md` | **legacy**。新規作成しない。既存があれば初回に state.md へ変換し、以後は参照専用 | （誰も書かない） |

- 仕様正本とスプリント契約は Planner だけが書く。Generator・Evaluator は読み取り専用。
- 進行状態（どのスプリントがどこまで進んだか）は state.md にだけ書く。契約・仕様・progress に Status を持たせない。
- 「回帰させない」型の横断不変条件を state.md に積まない。合格スプリントで確定した不変条件は
  Planner が `docs/spec/constraints.md` へ昇格させる。スプリント固有の判断は各契約に閉じ込める。
- 既存プロジェクトに古い `docs/progress.md` が残っている場合、新規追記はせず参照用の旧ログとして扱う。

## state.md フォーマット（オーケストレーターが維持する）

```markdown
# Sprint State

- Current ID: sprint-NNN または sprint-NNN-patch-PPP
- Retry Count: 0        # 現スプリントの連続不合格回数。合格・スプリント切替で0に戻す
- Next Planned: sprint-NNN または TBD

## スプリント一覧
| ID | Status | Contract | Progress | Feedback |
|----|--------|----------|----------|----------|
| sprint-001 | done | [contract](sprint-001.md) | [progress](../progress/sprint-001.md) | [feedback](../feedback/sprint-001.md) |
| sprint-002 | active | [contract](sprint-002.md) | - | - |

## Deferred / Superseded
- sprint-008: deferred — [理由と、いつ判断したか]
```

Status の語彙は次に限る:
- `planned` — 契約はあるが未着手
- `active` — Generator が実装中（差し戻し修正中も含む）
- `awaiting-eval` — 実装完了、Evaluator の評価待ち
- `done` — Evaluator 合格
- `deferred` — 意図して延期。理由を必ず書く
- `superseded` — 別スプリントに置き換えられて実施しない。置き換え先を書く

## スプリントIDと Patch Sprint 命名規約

- メインスプリントIDはゼロ埋め3桁にする: `sprint-001`, `sprint-002`, `sprint-005`, `sprint-006`。
- Patch Sprint IDは `sprint-NNN-patch-PPP` にする。例: `sprint-005-patch-001`。
- 小数ID（`sprint-5.1`, `sprint-5.10` など）は新規作成しない。文字列ソートと人間の解釈がずれるため。
- 実行順はファイル名ソートに依存せず、必ず state.md の `Current ID` と `Next Planned` に従う。
- 既存プロジェクトに小数IDの履歴がある場合は、移行時に実行順ベースで
  `sprint-005-patch-001`, `sprint-005-patch-002` ... に振り直し、各ファイルに
  `Legacy ID: Sprint 5.5` のように旧番号を残してよい。

## 変更の分類（ハーネス管理下での入口規則）

ハーネス管理下のリポジトリ（`docs/sprints/state.md` または `docs/spec.md` が存在する）では、
ユーザーの追加要望を必ず次の3つに分類してから着手する。「小さいからハーネス外で直す」を既定にしない。

1. **直接修正** — typo、コメント、ドキュメント、設定値など、アプリの挙動を変えない変更。
   ハーネス外で直してよい。
2. **micro-patch** — 挙動やUIに触れる軽微な変更のうち、次の条件を **すべて** 満たすもの:
   同一画面・同一導線に閉じている / その導線を守る自動回帰チェックが既に存在する。
   Planner が `Type: micro` の Patch Sprint 契約を作り、評価は軽量モード（後述）で行う。
3. **通常の Patch Sprint / 次のメインスプリント** — 上記に収まらないもの。

## Scope Change Gate（自動 Patch Sprint 化）

- Sprint 契約が作られ Generator が着手した後、その Sprint の範囲を拡張しない。
- Evaluator 不合格の修正、または既存受け入れ基準を満たすための修正は同じ Sprint ID に残す。
- 合格済み Sprint への追加修正、または現在 Sprint の受け入れ基準に含まれない変更は、
  ユーザーが「Patch 1」と言わなくても上の分類規則にかけ、micro-patch または通常 Patch Sprint として
  Planner に契約を作らせる。次の空きID（例: `sprint-005-patch-001`）を自動採番する。
- Patch Sprint も必ず `docs/sprints/sprint-NNN-patch-PPP.md`、`docs/progress/sprint-NNN-patch-PPP.md`、
  `docs/feedback/sprint-NNN-patch-PPP.md` を持つ。
- 大きな新機能や製品方向の変更は Patch Sprint にせず、次のメインスプリントまたは Planner の再計画に回す。

## 手順

### 0. 準備（docs雛形と整合チェック）

`docs/` が無ければ、次を no-overwrite で作る
（通常は `using-harness` が会話から起動して生成する。`/harness` コマンドでも生成できる）。

- `docs/spec.md`
- `docs/spec/product.md`
- `docs/spec/features.md`
- `docs/spec/constraints.md`
- `docs/spec/domain.md`
- `docs/spec/ui.md`
- `docs/spec/rubric.md`
- `docs/sprints/state.md`
- `docs/progress/`
- `docs/feedback/`

永続ガイダンスも no-overwrite で用意する：
- `CLAUDE.md` が無ければ `templates/CLAUDE.md` から作る。
- `AGENTS.md` が無ければ `templates/AGENTS.md` から作る。
- 既に独自内容がある場合は上書きせず、`docs/harness-guidance.md` が無ければ
  `templates/docs/harness-guidance.md` から作り、既存ガイダンスへの追記候補を残す。
- Hook は永続ファイルを生成しない。生成はユーザーの会話が `using-harness` に該当した時、または
  `/harness` を明示実行した時だけ行う。
- 既存のTOML／旧JSON設定が無ければ `.harness/config.toml` の共有設定雛形を作る。既存設定は編集しない。
- 個人上書きは `.harness/config.local.toml` に明示項目だけ置く。このファイルは
  `.harness/.gitignore` でgit管理から除外する。既存の `.harness/.gitignore` がある場合は
  独自内容をすべて保持し、不足している新旧local設定の規則だけを追記する。

**既存プロジェクトの移行**: state.md が無く `docs/sprints/current.md` がある場合、
current.md の記述と `docs/sprints/` / `docs/progress/` / `docs/feedback/` の実ファイルから
state.md を生成する。feedback が合格のスプリントは `done`、契約だけで progress/feedback が無い
スプリントは `deferred` 候補としてユーザーに確認してから記録する。以後 current.md は参照専用とし、
更新しない。

**整合チェック（ループを回す前に毎回行う）**: state.md の各 Status と実ファイルを照合する。
- 契約だけ存在して progress/feedback が無いのに `done` になっている
- feedback が合格なのに `active` / `awaiting-eval` のまま
- `Current ID` の契約ファイルが存在しない

いずれかを見つけたら、勝手に進めずユーザーに報告し、state.md を実態に合わせて直してから続行する。

### 0.5 Agent runtime設定を解決する

各roleをdispatchする前に、pluginの `scripts/resolve-runtime-config.mjs` で実効設定を確認する。
plugin rootが分かる場合の例：

```bash
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host claudeCode --event initial
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host codex --event sprint-change
```

- 共有設定は `.harness/config.toml`、個人設定は `.harness/config.local.toml`。優先順位は
  `個人の明示項目 > 共有の明示項目 > plugin既定` で、設定オブジェクト全体を置換しない。
- TOMLが無く旧JSONだけがある場合は互換読込して移行warningを出す。TOMLがあれば旧JSONはmergeしない。
- plugin既定は `lifecycle: balanced`、各host × roleの `model: inherit` / `effort: inherit`。
- `--event` は初回 `initial`、新Sprintへの遷移 `sprint-change`、同一Sprintの不合格修正 `retry`。
- capabilityの準備・更新・受け渡しはオーケストレーターの責務。Harness開始時とhost状態変更時に、
  実際のhost control、ユーザーが明示したAgent定義、保守された既定から観測できた項目だけをJSONファイルへ書く。
  未確認項目は `null` または省略とし、model知識から `true` を推定しない。
- capabilityはJSON literalではなく `--capabilities <file>` で渡す。ファイルにはhost別の値一覧に加え、
  roleへ値を実際に渡す面を `applicationPaths.roleModel` / `applicationPaths.roleEffort` として記録する。
  値一覧だけでは適用可能とみなさない。ファイルの欠落・不正・型不正はwarning付きの保守的既定へ戻す。

```json
{
  "observedAt": "<ISO-8601 timestamp>",
  "evidence": "<host control or user-owned agent definition inspected>",
  "hosts": {
    "claudeCode": {
      "roleEffort": true,
      "efforts": ["<confirmed value>"],
      "applicationPaths": {
        "roleEffort": "<project agent frontmatter path or other observed surface>"
      }
    }
  }
}
```

- model / effortは前後空白だけを除去し、共有config内の公式referenceで正確なID / aliasを確認する。
  大文字小文字、世代名、provider名などから別modelへ推定変換しない。
- 実効設定とwarningをdispatch前に確認し、明示値を適用できない場合はその項目だけ親セッション継承へ戻す。
  warningには問題項目、理由、実効値を含める。設定不備だけを理由にループ全体を停止しない。
- Claude Codeのrole modelはhostのsubagent model controlを使えるが、role effortは通常のper-dispatch項目ではない。
  project側Agent frontmatter等の具体的適用面がcapabilityで確認された場合だけrole effortを適用する。
  plugin同梱Agentのfrontmatterを自動書換えず、既定 `roleEffort` は未確認とする。
- Codexでは、利用repoのcustom agentまたは現在のspawn面がrole別指定を受け付ける場合だけ適用する。
  Codex plugin manifestはAgent定義を配布しないため、設定があるだけでcustom agentが作られたとは扱わない。
- 既存の `AGENTS.md`、`CLAUDE.md`、`.claude/agents/`、`.codex/agents/`、既存設定は一切上書きしない。

#### lifecycleの適用

- `balanced`（既定）: 同じroleのAgentをhostが許す範囲でSprint間resumeする。GeneratorとEvaluatorは
  常に別Agent / 別作業単位で、相互のsessionをresumeしない。
- `fresh`: 新Sprint境界でGeneratorとEvaluatorをそれぞれfreshにする。同一Sprintのretryは
  Generatorをresumeし、EvaluatorもGeneratorとは別のまま同一Sprintの評価文脈をresumeしてよい。
- Plannerは初回ヒアリング中は継続してよい。重大な仕様再計画、resume失敗、明らかなcontext劣化、
  role逸脱や評価biasが疑われる場合は、理由を通知して対象roleだけfreshへローテーションする。
- resume / Subagentが使えない場合は、正本ファイルを読み直す独立作業単位へfallbackする。
  GeneratorとEvaluatorの分離、および1作業単位1roleの原則は変えない。

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
- 重要判断が固まってから、Planner に `docs/spec.md`、必要な `docs/spec/*.md`（`rubric.md` を含む）、
  初回の `docs/sprints/sprint-001.md` を生成させる。最初のヒアリングを省略しない。
- Planner の完了後、オーケストレーターが state.md を作成/更新する
  （初回は `Current ID: sprint-001`、`Status: planned`）。
- 軽微な曖昧さは Planner が前提を置き、横断前提は `docs/spec/product.md` または
  `docs/spec/constraints.md`、スプリント固有前提は対象の `docs/sprints/sprint-*.md` に明記する。
  （brainstorm-before-build：作る前に設計を合意する）。

仕様化 readiness gate：
- ターゲットユーザーが明確。
- 最初に強く作り込む主要体験が明確。
- 成功状態・受け入れ基準の方向性が明確。
- スコープ外が明確。
- デザインや体験の方向性に明確な意図がある。

### Step 2: 実装（Generator を dispatch）
- state.md の `Current ID` の Status を `active` にしてから dispatch する。
- 「`docs/spec.md`、そこに示された必読 `docs/spec/*.md`、`docs/sprints/state.md`、対象の
  `docs/sprints/sprint-*.md`、既存の `docs/progress/sprint-*.md`、該当 feedback を読み、
  次の1スプリントだけ実装」と指示する。
- **1回の dispatch で1スプリントのみ**。
- 解決済みruntime設定のGenerator用model / effort / lifecycle actionを、ホストが受け付けるdispatch項目にだけ渡す。
  Agentへは設定値を再解釈させず、正本ファイルのpathと対象Sprintだけを渡す。
- 完了後、対象の `docs/progress/sprint-*.md` に自己評価と引き渡し事項（起動方法・URL・テストシナリオ・
  回帰チェックの実行コマンド）が書かれていることを確認し、Status を `awaiting-eval` にする。
- 前スプリントの不合格フィードバックがあれば、Generator はそれを先に直す。

### Step 3: 検証（Evaluator を dispatch）
- 「`docs/spec.md`、必読 `docs/spec/*.md`（`rubric.md` を含む）、`docs/sprints/state.md`、対象の
  `docs/sprints/sprint-*.md` の受け入れ基準、`docs/progress/sprint-*.md` の引き渡し事項を読み、利用可能な
  ブラウザ検証面で実際に操作してテストし、`docs/feedback/sprint-*.md` に結果を書く」と指示する。
- Generatorとは別のAgent / 作業単位へ、解決済みEvaluator用model / effort / lifecycle actionを適用する。
  Generatorの会話履歴や自己評価をEvaluatorの判定根拠として渡さない。

### Step 4: 遷移（オーケストレーターが state.md を更新）

feedback の判定に応じて、オーケストレーターが必ず state.md を更新してから次へ進む。

- **合格** → Status を `done` にし、Retry Count を 0 に戻し、`Current ID` を次のスプリントへ進めて
  Step 2 へ。全スプリント合格で完了。ユーザーが acceptance タグを許可している場合だけ、
  `git tag sprint-NNN-accepted`（Patch は `sprint-NNN-patch-PPP-accepted`）を打つ（既定はオフ）。
- **不合格（implementation-issue）** → Retry Count を +1 して Step 2 へ戻す（Generator が修正）。
- **不合格（spec-issue）** → feedback が「仕様自体の欠陥」と分類した場合は Generator に差し戻さない。
  Planner に feedback を渡して契約・仕様の修正を依頼し、その後 Step 2 からやり直す。
- **エスカレーション** → 同一スプリントで Retry Count が 3 に達したら、ループを止めてユーザーに
  状況（何が何回失敗したか、Evaluator の指摘、考えられる選択肢）を報告し、判断を仰ぐ。

### ブラウザ検証面の優先順位
Evaluator はコードを読むだけで判断しない。利用環境に応じて、次の優先順位で実物を操作する。

1. **Codex App:** Browser Use / `@Browser`。ローカル preview、クリック、フォーム入力、スクリーンショット、
   console/network 確認に使う。
2. **Claude Code Desktop App:** Preview pane / autoVerify。Claude ネイティブの embedded preview で
   dev server 起動、スクリーンショット、DOM inspection、クリック、フォーム入力を行う。
3. **Codex CLI / Claude Code CLI:** Playwright。既存の Playwright test があれば実行し、無ければ
   Playwright script / CLI で最低限の起動確認、スクリーンショット、フォーム操作、console error 確認を行う。
   ホストに Playwright MCP が既に設定されている場合はそれを使ってよいが、ハーネス側から常時起動はしない。
4. **例外:** Computer Use や実 Chrome は、ログイン済みブラウザ状態、ネイティブアプリ、GUI 専用操作が
   必要なときだけ使う。標準経路にはしない。
5. **Fallback:** どれも使えない場合は、build、HTTP 疎通、静的スクリーンショット、手動確認項目を
   対象の `docs/feedback/sprint-*.md` に明記する。

### サブエージェント dispatch が使えないホストでのフォールバック

ホストがサブエージェントの dispatch をサポートしない場合（例: Codex の一部環境）は、
`agents/planner.md` / `agents/generator.md` / `agents/evaluator.md` のロール定義を読み込み、
**ロールごとに独立した作業単位** として順に実行する。その場合も次を厳守する:
- 1つの作業単位では1つのロールだけを演じ、そのロールの正本ファイルだけを書く。
- Generator の自己評価をそのまま Evaluator の判定として流用しない。評価は必ず別の作業単位で、
  実物を操作してから行う。

### モデル指定の方針

- プラグイン側で Claude 固有の `opus` などのモデル名や最高effortを固定しない。設定無しでは親を継承する。
- model / effortは `host × role` ごとに独立して解決し、Claude Code用の値をCodexへ、またはその逆へ
  推測変換しない。
- ホストがrole別指定をサポートし、設定された値を現在の契約で利用できると確認できた場合だけ適用する。
- 指定不能・利用不能・未対応なら該当項目だけ `inherit` へ戻してwarningを出す。別モデルを勝手に選ばない。

## 評価基準と閾値

閾値の正本は `docs/spec/rubric.md`（Planner がプロジェクト種別に応じて生成・更新する）。
rubric.md が無い場合は次の既定値を使う。

| 基準 | 既定閾値 | 不合格時 |
|------|---------|---------|
| 機能完全性 | 4/5 以上 | Generator に差し戻し |
| 動作安定性 | 4/5 以上 | Generator に差し戻し |
| デザイン性 | 3/5 以上 | Generator に差し戻し |
| 独自性 | 3/5 以上 | Generator に差し戻し |
| エラーハンドリング | 3/5 以上 | Generator に差し戻し |
| 回帰なし | 5/5 必須 | Generator に差し戻し |

**1つでも閾値を下回ればスプリント不合格。**

**micro-patch（`Type: micro`）の軽量評価**: 採点は機能完全性・動作安定性・回帰なしの3基準のみ。
デザイン性・独自性・エラーハンドリングの再採点は省略する。回帰なし 5/5 必須は変わらない。
回帰確認は自動回帰スイートの実行とコンソールエラー確認を基本とし、パッチ対象の導線だけ実操作で確かめる。

**合格の証跡**: 判定の根拠となる実行コマンドと結果、実URL/DOM/ブラウザ操作の記録を feedback に必ず残す。
UI・レスポンシブ・視覚品質を採点した場合はスクリーンショットも必須。証跡の無い合格は無効として扱い、
オーケストレーターは Evaluator に差し戻す。

## 絶対ルール

1. **責務を越境しない** — Planner は実装しない。Generator は仕様を変更しない。Evaluator は
   コードを修正しない。各エージェントは自分の正本ファイルだけを書く。state.md は
   オーケストレーターだけが書く。
2. **スプリント順序は state.md に従う** — 順序変更・延期は禁止ではないが、必ず state.md に
   `deferred` / `superseded` と理由を記録してから行う。黙ってスキップしない。
3. **動作する状態を維持する** — 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** — Generator は新スプリント着手前に、前スプリントの
   不合格フィードバックを修正する。
5. **起動手順を必ず記載する** — Generator は対象の `docs/progress/sprint-*.md` に起動コマンドと
   回帰チェックの実行コマンドを毎回明記し、Evaluator はそれに従って起動する。
6. **作る前に合意する** — まとまった開発では、Planner の仕様をユーザーが確認してから実装に入る。
   ユーザーが決めるべき重要判断は、選択式ヒアリングで確認してから仕様化する。最初のヒアリングを省略しない。
7. **完了前に検証する** — 「実装したから完了」にしない。Evaluator が実際に動かして証跡付きで
   確かめるまでスプリントは完了扱いにしない（verification-before-completion）。
8. **遷移を record してから進む** — 合否が出たら、必ず state.md を更新してから次の dispatch を行う。

## サブエージェントへの dispatch 例

- Planner: 「次のアイデアについて、まずユーザーが決めるべき重要判断を最大3つの選択式質問にして。
  回答を解釈し、readiness gate を満たすまで必要な追加質問を続けてから `docs/spec.md`、
  `docs/spec/*.md`（`rubric.md` を含む）、初回の `docs/sprints/sprint-001.md` に展開して：
  『<ユーザーのプロンプト>』」
- Generator: 「`docs/spec.md`、必読 `docs/spec/*.md`、`docs/sprints/state.md`、
  対象の `docs/sprints/sprint-*.md` を読み、Current ID のスプリントだけを実装し、対応する
  `docs/progress/sprint-*.md` を更新して。
  前回 feedback があれば先に直して」
- Evaluator: 「Current ID のスプリントを `docs/spec/rubric.md` の基準で、利用可能なブラウザ検証面で
  実際に操作して検証し、証跡付きで対応する `docs/feedback/sprint-*.md` に合否を書いて」
