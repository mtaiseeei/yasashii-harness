# v0.6.1 評価基準 — Sprint 004系列

Issue #12→#13→#14→#15を個別に独立評価し、PASS後に次へ進む。一つのsource PRへまとめ、Issueはmerge時に閉じる。
以下は今回の十分な証拠であり、将来の小変更へ3役・契約・文書群を必須化しない。

## 判定と収束

詳細は [評価正本](../../plugins/harness/skills/harness-loop/references/evaluation.md) と各Issueの受け入れ条件に従う。
plugin既定の修正閾値 `F×I >= 20 OR (F >= 1 AND I >= 8)` を利用し、このrubricで厳格化しない。
明示条件未達・実証回帰・具体的重大例外は閾値外として対処する。必須検証の未実行をPASSにしない。
FAILには未達条件または修正対象findingを対応させる。見送りだけの減点・未確認化・分類替えによる差戻しは禁止する。
見送りはfeedbackの残課題へ置き、前回を参照する。関連変更・具体的新事実・明示再評価なしに再発行しない。
verification-infraは既存 [scope](../../plugins/harness/skills/harness-loop/references/scope.md) の限定修理に従う。

## 十分な証拠

| 契約 | 必要な確認 |
|---|---|
| [Sprint 004 / #12](../sprints/sprint-004.md) | 閾値4例、必須例外、明示修正依頼、3種の間接差戻し、再掲と新事実、既定/上書き、必須未検証の判断を少数の合成入力で実際のroleに判断させる |
| [Patch 001 / #13](../sprints/sprint-004-patch-001.md) | 既存upgradeで合成長stateのpreview / apply、200行より後の有効制約・旧Current重複・counter等の保持、保護拒否と安全なfallback、短い現在地からの再開を確認 |
| [Patch 002 / #14](../sprints/sprint-004-patch-002.md) | Codex fresh agentがA→B→A、無関係C、短いstateからの再開、明示取消/置換、外部待ちを判断し、本題の未完を保持 |
| [Patch 003 / #15](../sprints/sprint-004-patch-003.md) | 両hostの実読込導線、合成の新規/既存repoへの移行、global旧ブロックの残す/置換する規則、Claude CLIの収束判断、統合回帰と隔離marketplace installを確認 |

実判断の記録は合成入力であること、対象版（commitと必要なら差分）、実読込path、短い入力・判断結果で足りる。
先行Issueの有効な判断証拠を後続で再利用できる。静的語句検査だけでLLMの判断を確認済みとしない。
新collector、証跡schema、全host×全modelの網羅、精密頻度推定、実顧客fixtureは要求しない。
ツール利用不能は対象と理由を限定記録する。必須挙動の証拠不足と、任意toolの利用不能を混同しない。

変更前baselineはpositioning 5 / loop reachability 4 / runtime 57 / migration 8がPASS（実行記録は親の証拠を参照）。
各Issueでは関係する既存軽量回帰だけを行い、最後に以下を統合確認する。再評価は変更・影響範囲に絞る。

- `node scripts/check-positioning.mjs`
- `node scripts/check-loop-rules.mjs`（hook環境変数なし/あり・参照到達性）
- `node plugins/harness/scripts/check-runtime-config.mjs`
- `node scripts/check-guidance-migration.mjs`
- 変更JSON manifestの `python3 -m json.tool`、利用可能なら `claude plugin validate plugins/harness`
- Codex配布変更として、利用可能な正式な隔離手段でlocal marketplaceの `harness@agentic-harness-local` installを確認する。
  HOME / CODEX_HOME再割当や新しい検証基盤を作らず、隔離手段がなければ未実施理由を記録する。
  その場合はmanifest・参照到達性・合成repoのinit / upgrade・実role判断を確認し、install済みとは報告しない。

source公開、installed更新、fresh sessionの実読込、消費repo適用の完了/未実施を分ける。
本番導入や個人設定更新を合格条件へ追加しない。下記Sprint 003は履歴であり、下流同期等を今回へ遡及適用しない。

---

# Sprint 003 評価基準

今回のplugin全体の挙動変更には独立Evaluatorによる実行評価を行う。
将来の小変更にこの評価手順・契約・文書群を必須化しない。

## 合格条件

| 対象 | 合格に必要な結果 |
|---|---|
| 変更分類 | smallは挙動変更でも直接完了、通常機能は短い計画と完成時独立評価、高リスクは承認境界と実行後検証を維持 |
| 文書と再開 | 現在状態→該当仕様 / codeが成立し、全履歴読取・複数の現在状態正本・state無限追記を要求しない |
| 質問 | 既決事項を再質問せず、必要な利用者判断が解決したら停止し、決定を既存仕様へ反映 |
| 保守移行 | CLIのpreviewと実適用が確認でき、履歴・独自規則・dirty・未解決事項を保護し、対象旧指示と参照を確認できる |
| 配布整合・回帰 | 現行入口、role、Skill、templates、docsが主要経路で矛盾せず、指定既存回帰が成功。下流固有識別を維持 |

主要要件が欠ける場合は不合格。利用者の判断や保護境界を変えない説明上の軽微な改善は任意とし、
評価途中で新しい合格条件を追加しない。findingは product / verification-infra を区別する。

## 十分な証拠

- Sprint 003の代表シナリオに対し、独立Evaluatorが実際の配布指示から出した判断・読取範囲・停止条件の記録。
  合成入力・模擬回答であることを明示する。routing語の文字列一致だけで合格としない。
- 合成repoで保守移行CLIを実行し、preview前後と適用後の差分・保護対象・参照・未処理報告を確認した記録。
- `node scripts/check-positioning.mjs`、`node scripts/check-loop-rules.mjs`、
  `node plugins/harness/scripts/check-runtime-config.mjs`、追加した対象回帰の終了コードと要約。
- 変更対象JSON manifestの `python3 -m json.tool`、利用可能なら `claude plugin validate plugins/harness` と
  隔離local marketplace install。後二者が利用不能な場合は理由を記録し、それだけで不合格にしない。
- 対象版（commitと必要なら作業差分）と証拠への参照。Agentic / Yasashiiの実装・検証・同期・未配備を区別する。

再評価は修正箇所と影響範囲を対象とし、有効な既存証拠を再利用する。ブラウザ、専用benchmark基盤、
両hostへの本番導入、新collectorやattestationは要求しない。品質PASSは速度実測を意味しない。
同host / model条件の比較が実行可能なら少数例で行い、未計測なら高速化率を主張しない。
