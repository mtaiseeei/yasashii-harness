---
name: harness-loop
description: ハーネス駆動開発のループを実際に回すときの手順書。Planner→Generator→Evaluatorの進め方、docs/の書き込み権限の責務分離、orchestration state（docs/sprints/state.md）、評価の閾値、絶対ルールを定義する。アプリや機能をまとまった単位で自律開発するときに使う。
---

# ハーネス駆動開発ループ（オーケストレーションの脳）

あなた（メインのエージェント）は **オーケストレーター** です。`planner` / `generator` / `evaluator`
の3 roleを順に実行し、ファイル経由で受け渡しながらループを回します。ホストが対応する場合は
複数Agentへdispatchし、対応しない場合はroleごとの独立作業単位で分離を維持します。進行状態の正本
`docs/sprints/state.md` はあなただけが書きます。

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
| `docs/sprints/state.md` | 進行状態の正本。Current ID、Status、Retry Count、Model Tier | **オーケストレーターのみ** |
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
- Spec-Issue Count: 0   # 現スプリントのspec-issue差し戻し回数。合格・スプリント切替で0に戻す
- Lineage Dispatches: 0 # 現在のBase Sprint系譜（sprint-NNNとそのpatch群・spec-issue改訂を含む）の累積dispatch数。spec-issue・patch採番・freshローテーション・Retry Countのリセットでは0に戻さない
- Model Tier: standard  # standard / strong。具体的なmodel名はruntime configで解決する
- Rotate: none          # 昇格時は model-escalation、利用不能fallback時は model-availability、旧state移行時は runtime-migration
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
- `done-by-user-decision` — Evaluator の未達記録を保持したまま、ユーザーが残余リスクを明示的に引き受けて完了と判断した。理由と未達項目への参照を必ず書く
- `deferred` — 意図して延期。理由を必ず書く
- `superseded` — 別スプリントに置き換えられて実施しない。置き換え先を書く

`Model Tier` は `standard` / `strong` に限る。通常は `standard`。model tierを変更するときは、
オーケストレーターがresolverの`routing.rotateReason`を使い、失敗・リスク・Evaluator推薦による切替なら
`Rotate: model-escalation`、通常modelの利用不能によるfallbackなら`Rotate: model-availability`をstate.mdへ先に記録し、
古いGeneratorをresumeせずfreshなGeneratorをdispatchする。`Model Tier`は最後に実dispatchしたGeneratorのtierを表す。
合格後に次Sprintのdispatchがある場合は先に`standard`へ戻さず、そのtierをStep 2のresolver呼出しまで保持する。
全Sprint完了で次dispatchが無い場合だけ`standard` / `none`へ戻してよい。
`unknown`は旧stateを安全に移行するためのresolver入力専用値であり、state.mdには絶対に書かない。

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
   同一の機能面・同一の利用フローに閉じている（画面を持たない製品では同一コマンド・同一機能領域）/
   その面を守る自動回帰チェックが既に存在する。
   Planner が `Type: micro` の Patch Sprint 契約を作り、評価は軽量モード（後述）で行う。
3. **通常の Patch Sprint / 次のメインスプリント** — 上記に収まらないもの。

## Scope Change Gate（自動 Patch Sprint 化と基準拡大の禁止）

- Sprint 契約が作られ Generator が着手した後、その Sprint の範囲を拡張しない。**これは起点を問わない。**
  ユーザーの追加要望だけでなく、Evaluator feedback や Planner の契約改訂に起因する
  受け入れ基準の追加、検証対象の拡大、証拠形式の変更・追加も範囲拡張として扱う。
- Evaluator 不合格の修正、または **着手時点の** 受け入れ基準を満たすための修正は同じ Sprint ID に残す。
  この例外は既存基準を満たすための修正に限る。基準自体を増やす・厳しくする改訂は例外に含めず、
  下の「受け入れ基準・rubric の厳格化ゲート」に従う。
- 合格済み Sprint への追加修正、または現在 Sprint の受け入れ基準に含まれない変更は、
  ユーザーが「Patch 1」と言わなくても上の分類規則にかけ、micro-patch または通常 Patch Sprint として
  Planner に契約を作らせる。次の空きID（例: `sprint-005-patch-001`）を自動採番する。
- Patch Sprint も必ず `docs/sprints/sprint-NNN-patch-PPP.md`、`docs/progress/sprint-NNN-patch-PPP.md`、
  `docs/feedback/sprint-NNN-patch-PPP.md` を持つ。
- 大きな新機能や製品方向の変更は Patch Sprint にせず、次のメインスプリントまたは Planner の再計画に回す。
  再計画がユーザーの当初依頼の範囲を超える場合は、着手前にユーザーの承認を得る。

## 受け入れ基準・rubric の厳格化ゲート（ユーザー承認必須）

- active な Sprint に対する厳格化方向の変更 — 受け入れ基準の追加、閾値の引き上げ、証拠形式の追加・変更 —
  は、Planner が差分・理由・追加される検証コストを選択式で提示し、ユーザーが承認した場合だけ反映する。
  spec-issue 差し戻し後の契約・rubric 修正にも同じゲートを適用する。
- ループ中に追加された基準は、当該 Sprint では参考スコア・改善提案として扱う。
  「1つでも閾値を下回れば不合格」のハードゲートに組み込むのは、ユーザー承認を経た次 Sprint 以降とする。
- 緩和・棚卸しは正規の手続きである。過剰と判明した基準・証拠形式・検査は、Planner の提案とユーザー承認で
  Non-scope 化（出荷必須から外す）または optional internal QA へ降格できる。
  契約で Non-scope 化された検査を撤去することは「チェックを削って通す」違反ではない。

## 検証スコープガード（暴走検知）

検証は製品を出荷するための手段であり、検証基盤の完成度自体は製品要件ではない。
次のガードで「検証のための検証」への逸脱を検知し、ループではなくユーザーへ返す。

- **finding の対象区分**: Evaluator は feedback の各 finding・各バグに対象区分を付ける。
  `product`（製品の挙動・安全性の欠陥）/ `verification-infra`（検証スクリプト、回帰スイート、
  証拠の収集・整形の仕組みといった検証基盤側の欠陥）。製品の欠陥か検証基盤の欠陥か確定できない
  finding は `product` として扱う。`verification-infra` の finding はそれ単独で
  Sprint を不合格にしない。重大なものは `verification-scope-issue` としてユーザーへ直行し、
  軽微なものは改善提案に残す。
  ただし引き渡された回帰スイートが実行不能・失敗のままの場合、「回帰なし」を PASS にはできない。
  その主因がスイート自体の欠陥なら `verification-scope-issue` としてユーザーへ直行し、
  改善提案へ落として合格させない。
- **Lineage Dispatches budget**: オーケストレーターは Generator / Evaluator の dispatch 前に、
  state.md の `Lineage Dispatches` の現在値が runtime config の `limits.max_lineage_dispatches`
  （既定 10）に達していれば、+1 せず dispatch を止めてユーザーへ状況と選択肢を報告する。
  未満なら +1 を state.md へ記録してから dispatch する（カウンタは常に実 dispatch 数と一致させる。
  子 Agent 作成前の同期的な launch rejection は消費せず、再解決後の再 dispatch で +1 し直さない）。
  この値は同一の Base Sprint 系譜（`sprint-NNN` とその patch 群、spec-issue による契約改訂を含む）で
  累積し、spec-issue 分類、patch 採番、fresh ローテーション、Retry Count のリセットでは 0 に戻さない。
  次のメインスプリントへ進むとき、またはユーザーが明示的にリセットを指示したときだけ 0 に戻す。
- **検証コード規模の監視**: ある Sprint ラウンドの実装 diff が検証コードのみ（製品コード 0 行）に
  なった場合、Generator はその事実を progress に明記する。これが 2 回連続したら、オーケストレーターは
  次の dispatch 前にユーザーへ報告する。リポジトリ全体で検証コードの規模が製品コードを上回った場合も
  progress の引き渡し事項で報告し、Planner の棚卸し提案（ユーザー承認制）につなげる。
- ガードの発火は打ち切りではなく選択肢の提示である。発火時は (a) 要求どおり修正する、
  (b) 証拠水準を下げて受理する、(c) Non-scope 化して先へ進む、を具体的な影響とともに選択式で示す。
  厳格化要求の中身が正当かどうかは機械判定せず、ユーザーが判断する。

## 手順

`init`または`check`だけを依頼された場合、このループは開始しない。`scripts/harness.mjs`の該当処理を実行し、
PlannerやSprintを開始せず結果を報告して停止する。`upgrade`は未実装であり、既存ファイルを変更しない。

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

既存state.mdに`Model Tier`が無い場合は、`standard`だったと推定しない。一度だけresolverへ
`--current-model-tier unknown`を渡し、返されたdesired tierを`Model Tier`へ、`Rotate: runtime-migration`を
state.mdへ記録してから、必ずfreshなGeneratorをdispatchする。`unknown`はstate.mdへ書かない。
`Model Tier`は存在して`Rotate`だけが無い場合は、`Rotate: none`を補う。この移行後は、保持したtierを
通常どおりresolverへ渡す。desired tierが同じ同一Sprint retryでも、capabilityの`resume: true`が
model / effort保持をhost metadataで確認済みという意味である場合だけresumeしてよい。これは今後Harnessを
再開するときの一回限りの移行契約であり、このplugin変更時に導入済みrepoを直接編集しない。
既存state.mdに`Spec-Issue Count`または`Lineage Dispatches`が無い場合も同様に、次にHarnessを継続する
ときに一度だけ`0`で補う（現在のSprintの実績がstate.mdの記録から数えられる場合はその値を使う）。
plugin更新が導入済みrepoを直接編集することはない。

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
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host codex --event retry \
  --retry-count 2 --failure-kind implementation-issue --current-model-tier standard
```

- 共有設定は `.harness/config.toml`、個人設定は `.harness/config.local.toml`。優先順位は
  `個人の明示項目 > 共有の明示項目 > plugin既定` で、設定オブジェクト全体を置換しない。
- TOMLが無く旧JSONだけがある場合は互換読込して移行warningを出す。TOMLがあれば旧JSONはmergeしない。
- plugin既定は `lifecycle: balanced`。Claude Codeは全roleで `model: inherit` / `effort: inherit`。
  CodexはPlanner=`gpt-5.6-sol`/`high`、Generator=`gpt-5.6-luna`/`xhigh`、
  Evaluator=`gpt-5.6-sol`/`high`。Generatorのstrong経路は`gpt-5.6-sol`/`high`。
- `--event` は初回 `initial`、新Sprintへの遷移 `sprint-change`、同一Sprintの不合格修正 `retry`。
- `--current-model-tier`には、resolver呼出し前にstate.mdから読んだ現在の`Model Tier`を必ず渡す。
  旧stateに項目が無い場合だけ`unknown`を渡す。引数を省略した場合もresolverは安全側の`unknown`として扱う。
  resolverが返すdesired tierと現在tierが異なる場合はGeneratorをfreshにする。同じtierの継続も、
  capabilityの`resume: true`がmodel / effort保持をhost metadataで確認済みの場合だけresumeしてよい。
- capabilityの準備・更新・受け渡しはオーケストレーターの責務。Harness開始時とhost状態変更時に、
  実際のhost control、ユーザーが明示したAgent定義、保守された既定から観測できた項目だけをJSONファイルへ書く。
  未確認項目は `null` または省略とし、model知識から `true` を推定しない。
- CodexがAppかCLIかを自己判定・推定する必要はない。現在のnative dispatch面と実際のruntime parserが
  role別model / effort引数を受け付けるかをcapabilityへ記録する。Codex CLIでは、公開schemaに`model`、
  `reasoning_effort`、`agent_type`が表示されなくてもruntime parserが受理する実装差を確認済みである。
  **公開schemaに欄が無いことだけを理由に`inherit`へ戻してはならない。** native `spawn_agent`があり、
  resolverが明示値を返した場合は、正確な`model` / `reasoning_effort`を付けて実roleを1回だけ
  `dispatch-attempt`する。custom agentを選ぶときの入力名は`agent_type`であり、`agent_role`は渡さない。
  `agent_role`は起動後のchild metadataで確認する値である。
- この契約は既定のLuna / Solだけに限定しない。共有config、個人config、またはユーザーが明示した任意の
  正式なmodel / effortについて、resolverの`effective`値を推測・別名変換せずそのままdispatchする。
  起動後はchildのhost metadataで指定値との一致を確認し、一致した場合だけ`launch-verified`とする。
- `model`または`reasoning_effort`自体が`unknown field`として子作成前に拒否された場合は、model値の
  launch rejectionではなくapplication path不在である。同じ呼び出しを再試行せず、capabilityの対応する
  `applicationPaths.roleModel` / `roleEffort`を未確認へ戻してresolverを再実行する。model名が
  `Unknown model`として拒否された場合だけ、後述のlaunch rejection経路を使う。
- 引数の適用経路は確認できるが利用可能値一覧が列挙されない場合、resolverは設定値を
  `dispatch-attempt`として返す。これは「実際のrole起動で試す」という意味であり、起動成功や適用済みを
  表さない。
- capabilityの`resume: true`は、単にfollow-upを送信できるという意味ではない。resume後もdispatch時の
  model / effortを保持することをhost metadataまたはtraceで確認済み、という意味に限る。
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
- 実効設定とwarningをdispatch前に確認する。`dispatch-ready` はhostへ渡す面と利用可能値を確認した状態、
  `dispatch-attempt`は渡す面だけ確認でき、利用可能値を実roleのdispatchで確かめる状態である。どちらも実際に
  そのmodel / effortで起動した証明ではない。ダミーAgentではなく、resolverが選んだPlanner / Generator /
  Evaluatorそのものを設定値付きで起動する。`launch-verified` はhost側session metadataまたはtraceを取得できた
  場合だけ使い、metadataが無ければ実起動は`unverified`と記録する。
- `dispatch-attempt`が`Unknown model`、無効なeffortなどの同期的な入力検証で、子Agent作成前に拒否された場合だけ、
  拒否された正確な値を`--launch-rejected-model`または`--launch-rejected-effort`で同じhostのresolverへ渡して
  再解決する。Generatorのstandard modelが拒否された場合は`Model Tier: strong`と
  `Rotate: model-availability`をstate.mdへ記録してからfreshなstrong Generatorをdispatchする。strong modelも
  拒否された場合は`inherit`へ戻す。Planner / Evaluatorの拒否値も、その項目だけ`inherit`へ戻す。Terraや
  `codex exec`を自動fallbackに使わない。
- 実装失敗、テスト不合格、子Agentのcrash、timeout、通信エラーはlaunch rejectionとして扱わず、
  `--launch-rejected-model` / `--launch-rejected-effort`へ渡さない。子Agentが作成されたか不明なエラーでは、
  hostのtask一覧またはmetadataで重複が無いと確認するまで自動再dispatchしない。
- 明示値を適用できない場合はその項目だけ親セッション継承へ戻す。
  warningには問題項目、理由、実効値を含める。設定不備だけを理由にループ全体を停止しない。
- Claude Codeのrole modelはhostのsubagent model controlを使えるが、role effortは通常のper-dispatch項目ではない。
  project側Agent frontmatter等の具体的適用面がcapabilityで確認された場合だけrole effortを適用する。
  plugin同梱Agentのfrontmatterを自動書換えず、既定 `roleEffort` は未確認とする。
- Codexでは、利用repoのcustom agentまたは現在のspawn面がrole別指定を受け付ける場合だけ適用する。
  Codex plugin manifestはAgent定義を配布しないため、設定があるだけでcustom agentが作られたとは扱わない。
  custom agentが無くても、built-in/default childへ`model` / `reasoning_effort`を直接渡せる場合はその経路を使う。
- 既存の `AGENTS.md`、`CLAUDE.md`、`.claude/agents/`、`.codex/agents/`、既存設定は一切上書きしない。
- Codexの通常GeneratorはLuna/xhigh。Lunaが利用不能ならstrongのSol/highを試し、Solも利用不能なら
  model / effortを`inherit`へ戻してwarningを出す。Terraは通常・昇格・availability fallbackの候補にしない。
- **2026-07-20の実起動基準**: Codex CLIではSol/highの親からnative `spawn_agent`へ
  `fork_turns: "none"`、`model: "gpt-5.6-luna"`、`reasoning_effort: "xhigh"`を渡し、子metadataでも
  Luna/xhighを確認済み。CLI `0.144.6`では公開schemaに両引数が無くてもruntime parserが受理した。
  このrole別routingのフル経路はCLIで利用する。Codex AppはfreshなSol/highとTerra/xhighを確認済みだが、
  2026-07-20の再確認でもLunaは`Unknown model`で拒否されたため現在は部分対応として扱う。
- 上記は固定の製品判定ではない。Harness開始時とhost更新後に現在のspawn面・利用可能model一覧・
  application pathを再観測する。AppでLunaが観測できたら同じconfigをnative Lunaへ適用し、コードや
  導入repoのconfigを書き換えない。ユーザー明示のTerraは利用可能なら適用できるが、自動経路には入れない。
- Codex Appの完了済みAgentへのfollow-upではSol/highおよびTerra/xhighが次turnでSol/lowになった。
  CLIを含めresume後のmodel / effort保持をhost metadataで確認できるまでは、指定routingが必要なroleを
  resumeせず、正本ファイルを読み直すfreshなnon-full-history spawnを使う。
- Orchestratorは本チャットでありruntime configからmodelを変更できない。Codexでは本チャットを
  Sol/medium、高リスク時はSol/highで開始することを推奨するだけで、適用済みとは表示しない。

#### Generator model routing

- `standard`: 通常の初回実装と1回目の`implementation-issue`。Luna/xhighを使う。
- `strong`: 高リスクSprint、Retry Countが2に達した`implementation-issue`、またはEvaluatorの
  `Escalation Recommendation: strong`をオーケストレーターが証拠確認済みとして採用した場合。Sol/highを使う。
- 高リスクとは、認証・認可、セキュリティ、個人情報、DB migration、データ破壊、本番・課金・外部書込み、
  複数領域の戻しにくい設計変更、またはユーザーが品質優先を明示したSprintを指す。
- 推薦だけではstate.mdを変更しない。オーケストレーターがfeedbackの具体的証拠を確認し、採用してから更新する。
- `spec-issue`はPlannerへ戻し、Retry Countを増やさず、Generator昇格を消費しない。
- Retry Countが3に達したら追加modelを試さずユーザーへ返す。

#### lifecycleの適用

- `balanced`（既定）: `resume: true`としてmodel / effort保持を実証済みのhostだけ、同じroleのAgentを
  Sprint間resumeする。GeneratorとEvaluatorは
  常に別Agent / 別作業単位で、相互のsessionをresumeしない。
- `fresh`: 新Sprint境界でGeneratorとEvaluatorをそれぞれfreshにする。同一Sprintのretryは
  `resume: true`の実証がある場合だけGeneratorをresumeし、EvaluatorもGeneratorとは別のまま
  同一Sprintの評価文脈をresumeしてよい。未実証ならfreshな独立作業単位にする。
- 例外として、Model Tierが`standard`から`strong`、または`strong`から`standard`へ変わるときは
  `balanced`でもGeneratorをfreshにする。同じtierでも`resume: true`の実証が無ければfreshにする。
  resolverの`routing.rotateReason`（`model-escalation`または`model-availability`）をstate.mdへ記録してから、
  Sprint契約・progress・feedbackを読み直す新しいGeneratorをdispatchする。
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
- resolverの`routing.nextRole`、Generatorの`routing.modelTier` / `reason` / `rotateReason`、lifecycle actionを確認する。
- `routing.nextRole`が`generator`でない場合、Generatorの`routing.modelTier`は`null`である。dispatch対象外の値を
  state.mdへ永続化せず、`spec-issue`では現在のModel Tierを保持してPlannerへ戻す。
- state.mdに保持した、最後に実dispatchした`Model Tier`を`currentModelTier`としてresolverへ渡す。
- 旧stateに`Model Tier`が無ければ`currentModelTier=unknown`として解決し、desired tierと
  `Rotate: runtime-migration`をstate.mdへ記録してからfresh dispatchする。`unknown`自体はstateへ書かない。
  `Rotate`だけが無ければ`none`を補う。
- resolverのdesired tierとcurrentModelTierを比較し、異なる場合はstate.mdの`Model Tier`をdesired tier、
  `Rotate`をresolverの`routing.rotateReason`へ更新してからfreshなGeneratorをdispatchする。通常modelの利用不能による
  fallbackは`model-availability`、それ以外の通常のtier切替は`model-escalation`になる。同じ場合は`Rotate: none`として、
  `balanced`かつcapabilityの`resume: true`がmodel / effort保持を実証済みなら既存Generatorをresumeする。
  follow-up可能なだけ、または保持未確認ならfreshなGeneratorをdispatchする。
- state.md の `Current ID` のStatus、Retry Count、Spec-Issue Count、Model Tier、Rotateをすべて確定してから
  dispatchする。dispatch前に `Lineage Dispatches` が上限に達していれば+1せず停止してユーザーへ報告し、
  未満なら+1を記録してからdispatchする（検証スコープガード参照）。
- 「`docs/spec.md`、そこに示された必読 `docs/spec/*.md`、`docs/sprints/state.md`、対象の
  `docs/sprints/sprint-*.md`、既存の `docs/progress/sprint-*.md`、該当 feedback を読み、
  次の1スプリントだけ実装」と指示する。
- **1回の dispatch で1スプリントのみ**。
- 解決済みruntime設定のGenerator用model / effort / lifecycle actionを、ホストが受け付けるdispatch項目にだけ渡す。
  Agentへは設定値を再解釈させず、正本ファイルのpathと対象Sprintだけを渡す。
- high-risk Sprint、2回目の連続`implementation-issue`、証拠付きEvaluator推薦ではresolverが最初からstrongを
  選ぶため、Lunaの試行を挟まずSol/highをdispatchする。起動試行はモデル選択後に行い、昇格規則を上書きしない。
- 完了後、対象の `docs/progress/sprint-*.md` に自己評価と引き渡し事項（起動方法・URL・テストシナリオ・
  回帰チェックの実行コマンド）が書かれていることを確認し、Status を `awaiting-eval` にする。
- 前スプリントの不合格フィードバックがあれば、Generator はそれを先に直す。

### Step 3: 検証（Evaluator を dispatch）
- dispatch前に `Lineage Dispatches` の上限を確認する。到達していれば+1せず停止してユーザーへ報告し、
  未満なら+1を state.md へ記録してからdispatchする。
- 「`docs/spec.md`、必読 `docs/spec/*.md`（`rubric.md` を含む）、`docs/sprints/state.md`、対象の
  `docs/sprints/sprint-*.md` の受け入れ基準、`docs/progress/sprint-*.md` の引き渡し事項を読み、利用可能な
  ブラウザ検証面で実際に操作してテストし、`docs/feedback/sprint-*.md` に結果を書く」と指示する。
- Generatorとは別のAgent / 作業単位へ、解決済みEvaluator用model / effort / lifecycle actionを適用する。
  Generatorの会話履歴や自己評価をEvaluatorの判定根拠として渡さない。
- 証拠の十分性は契約・rubricに列挙された証拠形式が上限である。契約に無い証拠形式の要求・発明を
  合否条件にしないこと、各finding・各バグに対象区分（`product` / `verification-infra`）を付けることを
  指示に含める（「評価基準と閾値」の証拠の十分性を参照）。
- Evaluatorは評価と、その評価に対する自己レビューを行う。実装やコード修正は行わない。
- 証拠からstrong Generatorが必要と判断した場合はfeedbackへ`Escalation Recommendation: strong`と
  `Escalation Evidence`を書く。model選択とstate更新は行わない。

### Step 4: 遷移（オーケストレーターが state.md を更新）

feedback の判定に応じて、オーケストレーターが必ず state.md を更新してから次へ進む。

- **合格** → Status を `done`、Retry CountとSpec-Issue Countを0にし、`Current ID`を次のスプリントへ進める。
  次Sprintがある場合は、`Model Tier`を最後に実dispatchした値のまま保持し、`Rotate: none`としてStep 2へ進む。
  Step 2がそのtierを`currentModelTier`としてresolverへ渡し、desired tierとの比較後にstateを更新してからdispatchする。
  次のメインスプリントへ進むときは`Lineage Dispatches`を0に戻す（同一Base Sprintのpatch群へ進む場合は保持する）。
  全スプリント合格で次dispatchが無い場合だけ、Model Tierを`standard`、Rotateを`none`へ戻して完了する。
  ユーザーが acceptance タグを許可している場合だけ、
  `git tag sprint-NNN-accepted`（Patch は `sprint-NNN-patch-PPP-accepted`）を打つ（既定はオフ）。
- **不合格（implementation-issue）** → Retry Count を +1してstate.mdへ記録する。1回目はstandardの
  tierを維持し、`resume: true`の実証がある場合だけGeneratorをresumeする。未実証なら同じtierのfresh Agentを使う。
  2回目はModel Tierを`strong`、Rotateを`model-escalation`へ更新してから、
  古いLuna GeneratorをresumeせずfreshなSol GeneratorでStep 2へ戻す。
- **不合格（spec-issue）** → feedback が「仕様自体の欠陥」と分類した場合は Generator に差し戻さない。
  Retry CountとModel Tierを消費せず、Spec-Issue Count を +1 して state.md へ記録し、Planner に feedback を
  渡して契約・仕様の修正を依頼する。修正後は Step 2 へ直行せず、契約・rubric の差分（特に受け入れ基準・
  証拠形式の増減）を厳格化ゲートに従ってユーザーへ確認してから Step 2 に戻る。
  同一スプリントで Spec-Issue Count が `limits.max_spec_issue_returns`（既定 2）に達したら、
  Planner との往復を続けずユーザーへ状況と選択肢を報告する。
- **不合格（verification-scope-issue）** → feedback が「不合格の主因は検証基盤側の欠陥、または契約に無い
  証拠形式の不足であり、検証要求そのものの妥当性が疑わしい」と分類した場合は、Generator にも Planner にも
  自動で差し戻さない。Retry Count と Spec-Issue Count を消費せず、オーケストレーターが (a) 要求どおり修正する
  (b) 証拠水準を下げて受理する (c) Non-scope 化して先へ進む、の選択肢を添えてユーザーへ直接報告し、判断を仰ぐ。
- **ユーザー判断による完了（accept-as-is）** → ユーザーが残余リスクを明示的に引き受けて完了を選んだ場合、
  Evaluator の評価結果（未達項目を含む）を feedback に保持したまま、Status を `done-by-user-decision` にし、
  理由と未達項目への参照を state.md に記録して次へ進む。Evaluator の記録は書き換えない。
- **エスカレーション** → 同一スプリントで Retry Count が 3 に達したら、ループを止めてユーザーに
  状況（何が何回失敗したか、Evaluator の指摘、考えられる選択肢）を報告し、判断を仰ぐ。追加dispatchはしない。
  Spec-Issue Count と Lineage Dispatches の上限到達も同様にユーザーへ返す（検証スコープガード参照）。

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

- プラグイン側で Claude 固有の `opus` などのモデル名や最高effortを固定しない。Claude Codeは親を継承する。
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

**1つでも閾値を下回ればスプリント不合格。** ただしこのハードゲートの対象は、Sprint 着手時点で
契約・rubric に存在した基準に限る。ループ中に追加された基準の扱いは「受け入れ基準・rubric の
厳格化ゲート」に従い、当該 Sprint では参考スコア・改善提案とする。

**micro-patch（`Type: micro`）の軽量評価**: 採点は機能完全性・動作安定性・回帰なしの3基準のみ。
デザイン性・独自性・エラーハンドリングの再採点は省略する。回帰なし 5/5 必須は変わらない。
回帰確認は自動回帰スイートの実行とコンソールエラー確認を基本とし、パッチ対象の導線だけ実操作で確かめる。

**再評価の増分原則**: 同一 Sprint 内の不合格→修正→再評価では、修正対象の面と回帰スイート、
その近傍の主要導線を検証すれば足りる。未変更面の証跡は前回 feedback の記録を引き継いでよい。
変更に関係する面は Generator の progress 申告ではなく、前回評価時点との git diff の実物から判定する。
証跡の引き継ぎは、引き渡された回帰スイートが実行可能で green であることを前提とする。
変更のない commit（同一 commit hash）を再評価する場合は、working tree が clean であることを確認した
うえで、feedback に記録済みの証跡を再利用して合否を確定できる。commit が変われば変更に関係する面の
証跡は失効する。

**合格の証跡（下限）**: 判定の根拠となる実行コマンドと結果、実URL/DOM/ブラウザ操作の記録を feedback に必ず残す。
UI・レスポンシブ・視覚品質を採点した場合はスクリーンショットも必須。証跡の無い合格は無効として扱い、
オーケストレーターは Evaluator に差し戻す。

**証拠の十分性（上限・safe harbor）**: rubric と契約に列挙された証拠形式を満たせば、その基準の合格に十分である。
Evaluator は契約・rubric に無い証拠形式（期限付き approval manifest、digest 固定、attestation、
検証面を跨ぐ統一証拠 schema など）を発明して合否条件にしない。選択した検証面が自然に生成できる証拠
（コマンド結果、実操作の記録、スクリーンショット、host 側の session 記録）で足り、証拠収集のための
新しい基盤・collector・schema の開発を合格条件にしない。より強い証拠が必要だと考えた場合は、
FAIL の理由にせず改善提案に書き、採否は厳格化ゲート（ユーザー承認）に委ねる。
実挙動の欠陥（product finding）は従来どおり証拠付きで不合格にできる。
証拠形式の列挙は「合格の証跡（下限）」を下回れない。列挙が下限より弱い場合は下限が優先する。
rubric・契約に証拠形式の列挙が無い場合は、下限に挙げた形式を safe harbor の列挙とみなす
（Planner は次の改訂時に証拠形式セクションを補う。下限の成文化は厳格化ゲートの対象外）。
また safe harbor が制限するのは合否条件・必須シナリオ・証拠形式の要求の拡大であり、
Evaluator が検証中に観察する範囲は制限しない。固定した検証対象の外で観察された実挙動の欠陥は、
着手時点から存在する基準（回帰なし・動作安定性など）に対する product finding として常に有効である。

**ユーザー実機確認の採用**: ユーザーがチャットで明示的に宣言した実機確認は、オーケストレーターが
state.md へ記録した場合に限り、該当する受け入れ基準の証跡として採用できる。
記録には、日時、ユーザー宣言の引用、対象の受け入れ基準（包括的な宣言は基準単位に分解する）、
確認時点の commit hash を含める。対象基準に関係するコードがその commit から変更されたら証跡として
失効し、再確認または通常の Evaluator 証跡が必要になる。
Generator の自己申告は従来どおり証跡にならない。

## 絶対ルール

1. **責務を越境しない** — Planner は実装しない。Generator は仕様を変更しない。Evaluator は
   コードを修正しない。各エージェントは自分の正本ファイルだけを書く。state.md は
   オーケストレーターだけが書く。
2. **スプリント順序は state.md に従う** — 順序変更・延期は禁止ではないが、必ず state.md に
   `deferred` / `superseded` と理由を記録してから行う。黙ってスキップしない。
3. **動作する状態を維持する** — 各スプリント完了時にアプリが正常に起動・動作すること。
4. **フィードバックを最優先で処理する** — Generator は新スプリント着手前に、前スプリントの
   不合格フィードバックのうち対象区分が `product` の指摘と、着手時点の受け入れ基準に直接紐づく指摘を
   修正する。`verification-infra` の指摘は自動修正ループに乗せず、検証スコープガードに従って
   ユーザーの判断を待つ。
5. **起動手順を必ず記載する** — Generator は対象の `docs/progress/sprint-*.md` に起動コマンドと
   回帰チェックの実行コマンドを毎回明記し、Evaluator はそれに従って起動する。
6. **作る前に合意する** — まとまった開発では、Planner の仕様をユーザーが確認してから実装に入る。
   ユーザーが決めるべき重要判断は、選択式ヒアリングで確認してから仕様化する。最初のヒアリングを省略しない。
7. **完了前に検証する** — 「実装したから完了」にしない。Evaluator が実際に動かして証跡付きで
   確かめるまでスプリントは完了扱いにしない（verification-before-completion）。
   例外は、ユーザーが残余リスクを明示的に引き受ける `done-by-user-decision` だけである。
8. **遷移を record してから進む** — 合否が出たら、必ず state.md を更新してから次の dispatch を行う。
9. **検証を規模とリスクに比例させる** — 証跡は契約・rubric に列挙された証拠形式で十分とし、
   検証基盤の完成度自体を製品要件にしない。受け入れ基準・証拠形式の厳格化はユーザー承認を経てから
   反映する（厳格化ゲート・検証スコープガード）。

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
  実際に操作して検証し、証跡付きで対応する `docs/feedback/sprint-*.md` に合否を書いて。
  証跡は契約・rubric に列挙された証拠形式の範囲で判定し、各 finding には対象区分
  （product / verification-infra）を付けて」
