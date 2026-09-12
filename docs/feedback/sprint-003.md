# Sprint 003 — Independent evaluation

## 判定

**Agentic source: PASS。下流同期（AC-06のYasashii部分）は後続評価待ち。**
対象は公開v0.5.5 (`d80865042538fd906dc7c062c0d635777f308ff0`) を基点とするSprint 003作業差分。
独立Evaluatorが配布指示・実差分・CLIの入出力から判定した。実装・仕様・stateは編集していない。
契約は `docs/sprints/sprint-003.md`、基準は `docs/spec/rubric.md`。追加の合格条件は設けていない。

## 実行した回帰

| コマンド / 操作 | 結果 |
|---|---|
| `node scripts/check-positioning.mjs` | exit 0 |
| `node scripts/check-loop-rules.mjs` | exit 0、4 surfaces。hookの環境変数なし/ありを含む |
| `node plugins/harness/scripts/check-runtime-config.mjs` | 限定修理後 exit 0、57 checks |
| `node scripts/check-guidance-migration.mjs` | exit 0、7 PASS |
| `node scripts/check-windows-init.mjs` | exit 0、8 PASS。darwin上の互換検査 |
| `python3 -m json.tool`（両marketplace、両plugin manifest） | 4件すべて exit 0 |
| `claude plugin validate plugins/harness` | exit 0、Validation passed |
| 隔離設定ルートで `codex plugin marketplace add <checkout> --json`、`codex plugin add harness@agentic-harness-local --json`、`codex plugin list --json` | すべて exit 0、v0.5.5候補をinstall。通常のinstalled環境は変更していない |

重いローカル処理は共通lockで直列実行し、開始時のNode数を確認した。自分が起動した常駐server/browserはない。
主要な現行文書とstate履歴参照の相対リンクは解決した。resolver本体とモデル設定は今回の差分に含まれない。
隔離installされたusing-harness / loop / grilling / roles / runtimeのbytesは評価したsourceと一致する。

初回runtime検査は、短縮されたtemplateに旧runtime直接リンクを要求する静的期待で失敗した。
分類は **verification-infra / verification-scope-issue**。変更後の条件付き入口へ到達性の期待を合わせる限定修理を確認し、
runtime検査だけを独立再実行した。resolver実挙動検査は維持され、57件が通過した。他の通過済証拠は関連差分がないため再利用した。

## 配布指示を適用した合成シナリオ

実際の配布Skillを独立Evaluatorが読み、以下の合成入力と模擬回答へ適用した記録。
これは実利用者の会話や全host/modelの保証ではなく、routing語の文字列検査だけでもない。

| 基準 | 入力・判断・出力の証拠 | 判定 |
|---|---|---|
| AC-01 小さな挙動修正 | 管理repoの新着順修正、自動テスト未整備。保存形式/API/権限に影響せず可逆なので直接修正。fixtureの実行で `old(1),new-a(3),new-b(3)` → `new-a,new-b,old`、元配列不変、空入力も成功。質問0、契約/3役/独立レビュー/resolverを要求せず既存仕様を更新 | PASS |
| AC-02 通常機能 | 絞込み一覧のローカルCSV追加。filter/CSV escaping/downloadの短い計画と必要検証を既存作業文書へ集約し、完成時の独立レビューを要求。未決なしで質問0、Planner/3文書は新設不要。シナリオのrouting評価でありCSV実装完了を偽っていない | PASS |
| AC-02 高リスク | 1行のaccess predicate変更と本番反映。閲覧権限・データ・本番影響から高リスクと判断し、対象/影響/復旧方法と未承認範囲を実行前に確認。模擬回答は管理者限定維持・ローカル検証まで。質問1、権限拡大/配備は実行せず、既存の可逆修理承認は聞き直さない | PASS |
| AC-03 長い履歴の再開 | 合成200 Sprintのrepoで `AGENTS → planning/current → requirements/orders + code → evidence/a` のみを使用し、archive全文を読まない。revision aの証拠を変更後bへ流用せずfocused実行証拠をbとして記録。既存currentを更新、未決/承認を保持、実装b/検証b/未配備を区別。第二のcurrentやCONTEXTを新設しない | PASS |
| AC-04 資料質問 | 既決の検索仕様、同名保存時の重要な未決1件、委任済み実装詳細を分離。「既存を守る同名拒否を推奨、上書きとどちらか」の1問に模擬回答「拒否」。既存orders仕様とdecisionsのD2へ確定内容を実反映して終了。既決/ファイル名/無関係な出力先/最終再承認は質問しない | PASS |

明示的な深いgrillingの入口は保持され、現行の対象範囲と終了条件が優先する。
旧版のupstream-bodyと新referenceの本文は一致し、MIT Licenseが維持される。
note.comのgrill-with-docsを同一実装とする説明はない。

## AC-05 独立の既存repo移行

製品検査とは別に、旧全履歴規則・独自追記・tracked dirty・untracked・Git index・未決/承認・仕様/証拠リンクを持つ
合成repoで、`harness.mjs upgrade --root <fixture>` と明示planによるpreview/applyを実行した。

- inventory/previewはexit 0で全file hash不変。変更対象の旧全文/新全文・bytes・hashが表示された。
- AGENTSと独自配置 `planning/state.md` の2文書を適用。stateは210,503 bytesから592 bytesへ整理され、元bytesは指定archiveへ一致して保存された。
- 独自規則・dirty/untracked・Git index・未決・有効な承認/制約を保持。現在仕様/証拠/元state archiveリンクを解決した。
- preview後の追記、未決行脱落、存在しないリンク、明示retireした旧規則残存はすべてexit 2で拒否し、対象を変更しなかった。
- 再適用はexit 0のno-op。`init --spec-path requirements/orders.md --state-path planning/state.md` は既存bytesを保持し、競合spec/stateやCONTEXTを作らなかった。

**PASS。** 実消費側repoを移行していない。自然言語の意味はEvaluatorが確認し、CLIが完全判定できるとは評価していない。

既知の制約: Constraints/承認等の保護節に置かれた旧Harness規則は、明示retireでも保護行として拒否される。
独自例でexit 2と原文保持を確認した。自動適用の利用範囲を狭めるが、AC-05の保持・未処理報告に一致し、
移行完了とは報告しないため非blocking。無関係な有効制約の保護を緩める変更を新たな合格条件にはしていない。

## 範囲と残件

- Agenticの実装・source独立検証は完了。Yasashii正式同期と限定検証はこの判定時点では未完。
- remote push/tag/Release、通常installed更新、本番配備は未実施。
- Windows実機・Claude/Codex両hostでの実会話比較は未実施。darwin上のCLI/互換検査と合成判断の限界を保持する。
- 品質PASSと速度実測は別。質問数・読取対象は上記合成例の観測であり、同条件の変更前後実行時間や高速化率は未計測。

自己レビュー: PASSには実行または具体的入出力の証拠があり、未実施の機能/配備を完了扱いしていない。
発見した検証期待の不整合は解消済み。任意改善の後付けゲート、所有外編集、既存dirtyのcleanupは行っていない。
