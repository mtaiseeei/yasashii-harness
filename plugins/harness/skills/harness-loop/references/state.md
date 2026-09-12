# State と初期化・移行

初回作成、欠落項目、legacy形式、状態の矛盾があるときに該当節だけ読む。

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

**整合チェック**: 通常再開はCurrent IDと直前遷移に必要な契約・feedbackを照合する。全履歴の照合は初回移行や矛盾を検出したときだけ行う。
- 契約だけ存在して progress/feedback が無いのに `done` になっている
- feedback が合格なのに `active` / `awaiting-eval` のまま
- `Current ID` の契約ファイルが存在しない

明白な記録漏れは根拠を残してオーケストレーターが訂正する。合否・順番・未決判断を推測で埋める必要があればユーザーへ確認する。
