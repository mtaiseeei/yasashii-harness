# Sprint 004 — レビューの収束（#12）

- Type: main / Risk: standard / 対象版: v0.6.0 `dd05b7e` → v0.6.1
- 根拠: [Issue #12](https://github.com/mtaiseeei/agentic-harness/issues/12)。期待挙動・範囲は確定済みのためGrillingを省略する。
- 親目的: #12→#13→#14→#15を一件ずつ修正・独立評価し、一つの次patchとして準備する。
- 担当範囲: evaluation正本、Evaluator / Generator、scopeとLoopからの読取導線、関連する軽量回帰。
  templateの最終整合は#15で行う。Issueの決定を実装し、新しい製品判断を追加しない。

## 完了条件と確認

Issue #12の受け入れ条件を満たす。F=2/I=9・F=4/I=5は修正、F=2/I=7・条件不明F=0/I=9は見送りとし、
具体的必須例外・明示修正依頼・必須検証未実行を正しく区別する。
減点・未確認扱い・spec/verification分類替えで同じ見送りを差し戻さない。関連新事実がなければ再掲しない。
既定値、既存rubricの明示上書き、無断厳格化禁止について両hostの意味を揃える。

[今回のrubric](../spec/rubric.md)に従い、少数の合成入力で実際のrole判断と関係する既存軽量回帰を確認する。
語句一致だけの合格、頻度監視・新スコアリング基盤、依頼外の稀なケース対応は不要。

## 引き渡し

Generatorは実装・証拠・残件をprogress、Evaluatorは独立評価・見送りをfeedbackへ記録する。
stateは親だけが更新する。修正対象だけを処理し、有効な証拠を再利用する。
この契約のPASSは系列全体の完了ではない。復帰先は [Patch 001 / #13](sprint-004-patch-001.md)。
限定commitのprefixは `sprint-004`。[保護境界](../spec/constraints.md)を守る。
