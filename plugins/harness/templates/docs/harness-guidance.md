# Harness pointer

既存のAGENTS.md/CLAUDE.mdへ必要な入口だけを取り込む候補。既存固有規則を保持する。

```markdown
## Harness

小さな挙動変更は直接修正・必要検証で完了する。通常機能は短い計画と完成時独立レビュー、
大きな開発は必要仕様とSprintを使う。開始・復帰時はinstalled `harness:using-harness`
（plugin rootの `skills/using-harness/SKILL.md`）の開始・復帰の導線を読み、目的・完了条件と割込みの復帰先を確認する。
既存の現在状態から該当仕様・コードへ進み、関連履歴は理由や矛盾が必要な場合だけ読む。
評価前はplugin rootの `skills/harness-loop/references/evaluation.md` を読み、修正対象と見送りを選別する。
再開・引き渡し時はplugin rootの `skills/harness-loop/references/state.md` を読み、現在地を置換更新する。
目的・既決事項・承認・未解決事項を引き継ぎ、実装/検証/配備を分ける。
承認済みの可逆な実装・修理は進める。未承認の重要判断や副作用だけを確認する。
初期化no-overwrite、独自規則・dirty・model/effort設定と公開の承認境界を守る。
```
