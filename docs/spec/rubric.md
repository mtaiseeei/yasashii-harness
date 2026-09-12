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
