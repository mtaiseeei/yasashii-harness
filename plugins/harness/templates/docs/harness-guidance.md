# Harness pointer

既存のAGENTS.md/CLAUDE.mdへ必要な入口だけを取り込む候補。既存固有規則を保持する。

```markdown
## Harness

小さな挙動変更は直接修正・必要検証で完了する。通常機能は短い計画と完成時独立レビュー、
大きな開発は必要仕様とSprintを使う。その場合はinstalled `harness:using-harness`
（plugin rootの `skills/using-harness/SKILL.md`）を読む。
既存の現在状態から該当仕様・コードへ進み、関連履歴は理由や矛盾が必要な場合だけ読む。
目的・既決事項・承認・未解決事項を引き継ぎ、実装/検証/配備を分けて現在状態を更新する。
承認済みの可逆な実装・修理は進める。未承認の重要判断や副作用だけを確認する。
初期化no-overwrite、独自規則・dirty・model/effort設定と公開の承認境界を守る。
```
