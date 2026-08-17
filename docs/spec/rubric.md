# Evaluation Rubric

## 対象種別

画面を持たないCLI / plugin runtimeの保守変更。視覚デザインや独自性は採点しない。

## 合否基準

| 基準 | 閾値 | 5点 | 4点 | 3点以下 |
|---|---:|---|---|---|
| 機能完全性 | 4/5 | native Luna、legacy警告、fallback、配布撤去、version整合をすべて満たす | 主要経路をすべて満たし、非本質的な説明上の不足だけがある | custom agent依存または主要要件が残る |
| 動作安定性 | 4/5 | runtime config回帰が全件greenで既存role routingも保たれる | 対象経路と主要既存経路がgreen | resolverや初期化の既存経路に失敗がある |
| 互換性・安全性 | 5/5 | 旧設定を停止せず警告付きで無視し、ユーザー所有物へ書き込まず、Terraも選ばない | 該当なし | いずれかの安全境界を破る |
| 文書正確性 | 4/5 | 現行配布面が整合し、2026-08-17の証拠と過去記録を明確に区別する | 利用者の判断に影響しない軽微な表現差だけがある | staleなApp制約やcustom agent推奨が現在形で残る |
| 回帰なし | 5/5 | 指定された全回帰コマンドが成功する | 該当なし | 1件でも失敗する、または実行不能 |

1基準でも閾値未満なら不合格とする。

## 必須シナリオ

1. Luna / xhighを明示したCodex roleが`mode: direct`、Luna model override、xhigh effortを返し、custom agent定義を要求しない。
2. 旧`hosts.codex.custom_agents.enabled = true`と`false`のどちらも解決処理を止めず、値に関係なくdirect経路となり、非推奨warningが出る。
3. 新規初期化configに`hosts.codex.custom_agents`が作られない。
4. Lunaの同期的な起動前拒否でstrong Solへfresh fallbackし、Solも拒否された場合は`inherit`になり、Terraは選ばれない。
5. 配布物にHarness専用Luna Agentを検査・作成する実行コードがなく、現在形のガイダンスからprovision手順が消えている。
6. version正本が`0.5.3`で同期している。

## 証拠のsafe harbor

次の証拠が揃えば合格判定に十分であり、新しいcollector、attestation、統一証拠schemaは要求しない。

- `node scripts/check-positioning.mjs`の終了コードと要約
- `node scripts/check-loop-rules.mjs`の終了コードと要約
- `node plugins/harness/scripts/check-runtime-config.mjs`の終了コードとテスト件数
- `python3 -m json.tool`による変更対象JSON manifestの構文確認結果
- `rg`または同等のread-only検索による、配布面にprovision用scriptや現在形のcustom-agent案内が残っていない確認
- resolver回帰内で、必須シナリオ1〜4に対応する入力と出力のassertionが成功した記録
- 2026-08-17の実起動については、既に提示されたchild session IDとhost metadataの記録

`claude plugin validate plugins/harness`と隔離Marketplace installは、現在の環境で利用可能なら行う追加確認とする。
未実施だけを理由に不合格にしない。
