# Sprint 003 実装引き渡し

対象は [契約](../sprints/sprint-003.md)。公開v0.5.5を基点とする作業差分。

- 小変更は直接実装・必要検証、通常機能は短い計画と完成時独立レビュー、大きな開発は必要仕様とSprintへ。
- root/role/Skill/template/docsを整合。現在状態は更新式、全履歴読取なし。過去設計とgrilling原文は参照用に保持。
- initは既存正本を再利用し、6種仕様の自動生成を廃止。全OSでNode writerを使う。
- upgradeはinventory・明示対象のpreview/apply、元bytes保管、stale/保護文/旧規則/相対link検査を追加。
- モデル/effort設定とresolver本体は未変更。配布versionは0.5.5のまま、公開・installed更新は未実施。

確認方法: positioning / loop-rules / runtime-config / guidance-migration / windows-initの各既存・対象検査。
限定検証はmigration 7 PASS、Windows互換8 PASS（darwin上）。Windows実機の検証ではない。
独立Evaluatorは全体回帰、合成例でのrouting・資料質問の停止、長履歴からの再開、CLI実動を確認する。
機械検査で自然言語の意味を完全判定できるとは主張しない。preserve/retire指定と対象差分の意味確認を併用する。
実装済みであり独立評価・下流同期は未完。速度比較は未実施、品質と高速化率を混同しない。

独立回帰で旧テンプレートへの直接runtime参照を要求する検査が失敗した。
条件付き入口→loop→runtimeの到達性を確認するよう検査を整合し、旧指示の細かな文言一致を整理した。
resolverの実挙動の期待・検証範囲・証拠要件は変更していない。独立再実行で確認する。
