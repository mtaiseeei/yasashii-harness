# 現在状態と履歴

現在状態の整理、初期化、旧形式からの移行が必要なときに読む。通常再開で履歴を一括読込しない。

## 現在状態

既存repoは既存の正本を利用する。既定の `docs/sprints/state.md` は現在地の短い引き渡しであり、
全Sprint台帳や日報ではない。NEXT_SESSION/PROJECTを同じ現在状態の別正本にしない。

- 現在の目的、進行中作業、未解決事項、次の一手。
- 有効な承認範囲・制約、該当する現行仕様への参照。
- 直近の検証の対象版・依存物・証跡への参照。実装済み/検証済み/配備済みを区別。
- Sprintを使う場合だけCurrent ID、Status、Retry Count、Spec-Issue Count、Lineage Dispatches、Model Tier、Rotate、必要ならNext Planned。

50行程度・数KBを初期の目安にできるが、公式値でも停止ゲートでもない。bytesと可読性も見て巨大な一行を見逃さない。
短縮のために未解決事項や有効な承認・制約を落とさない。続報を無限追記せず現在内容を更新する。
過去の詳細は既存履歴または履歴fileへ保持し、必要な理由・矛盾があるときだけ検索する。
仕様は機能/業務領域で分ける。重要判断の確定時に該当仕様と理由を整合更新し、置換済み判断を示す。

## Sprintだけの状態語彙

`planned` / `active` / `awaiting-eval` / `done` / `done-by-user-decision` / `deferred` / `superseded`。
延期は理由、置換は置換先、利用者受理は未達・残余リスクと明示判断への参照を残す。
通常機能や小変更は自然な短い状態表現でよく、上記項目を新設しない。

IDは `sprint-NNN` / `sprint-NNN-patch-PPP`。実行順はCurrent IDとNext Plannedによる。
旧小数IDは参照を保護し、必要な保守移行で対応を記録する。開始時に全IDを振り直さない。

Model Tierはstandard/strong。最後にdispatchしたGeneratorのtierを表し、次dispatchまで保持する。
全完了時だけstandard/noneへ戻す。tier変更はresolverのrotateReasonを記録してfresh。
旧stateでtier欠落時は一度resolverへ `--current-model-tier unknown` を渡し、返されたtierと
`Rotate: runtime-migration` を記録する。unknownはresolver入力専用。Rotateのみ欠落ならnone。
既存retry/lineageは把握できる現行記録を保持し、不明な実績を全履歴調査で埋めない。
欠落counterは現在記録から分かる値、なければ初期化した事実を記して0にする。
モデル・effortの実効値は[runtime](runtime.md)に従い設定を自動変更しない。

## 初期化・保守移行

`init` は不足分だけno-overwrite。既存の正本を使い、定型の6種仕様やCONTEXT.mdを一括追加しない。
新規repoも短い入口・現在状態から始め、必要な仕様は必要な時点で作る。
既存guidance・設定・Agent定義を初期化で上書きしない。hookは永続文書を書かない。

plugin更新だけで古いrepo指示は変わらない。明示的な文書保守は[移行](migration.md)のpreviewで
変更範囲を確認し、元履歴・独自ルール・dirtyを保持して適用する。利用者の既存承認を引き継ぐ。
current.md等の旧状態は必要な部分から移行し、以後の現在状態の正本を一つに定める。
合否や未決判断を推測しない。矛盾のあるCurrent ID・契約・証跡だけを照合する。
