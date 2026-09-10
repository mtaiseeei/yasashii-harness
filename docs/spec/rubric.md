# Evaluation Rubric

## 対象種別

画面を持たないCLI / plugin runtimeの保守変更。視覚デザインや独自性は採点しない。
以下の既存基準・シナリオは`sprint-001`用。`sprint-001-patch-001`には末尾の専用節を適用する。

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

## Sprint 001 Patch 001 — Planner / grilling

適用対象は`sprint-001-patch-001`のみ。過去Sprintの基準を遡及変更しない。

| 基準 | 閾値 | 合格アンカー | 不合格アンカー |
|---|---:|---|---|
| 機能完全性 | 4/5 | 呼ぶ・省略・限定確認・判断の相談を使い分け、必要時は同梱grillingに従い判断の依存関係を掘り下げる | 常時呼ぶ、重大な未決事項を推測で埋める、同梱Skillに接続しない |
| 動作安定性 | 4/5 | 実際の配布指示を使った独立roleの行動確認で主要経路が成立し、host能力不足時も意思決定を保留・伝達できる | 質問UIやSkill呼び出しの不可用を理由に重要判断を代行する |
| 意思・責務の保持 | 5/5 | 明示指示と既決事項を優先し、Plannerが未決範囲と既存規約に沿う保存先を決め、orchestratorへの相談もユーザー判断を捏造しない | 無断のscope拡張、合意の作り直し、重要判断の無断代行がある |
| 配布・文書正確性 | 4/5 | upstream本文・出典・licenseを配布し、Harness接続指示と区別する。現行案内に固定3問・無条件ヒアリングとの矛盾がない | 出典またはlicense欠落、host未対応の呼び出しのみ、現行案内の矛盾が残る |
| 回帰なし | 5/5 | 指定した既存回帰がすべて成功し、既存runtime・初期化の境界を保つ | 既存回帰が失敗する、または保護された設定・routingを変える |

4点の行は、主要経路を満たし利用者の判断を変えない説明上の軽微な不足だけを許容する。
全項目を満たせば5点。1項目でも閾値未満なら不合格。

### Patch専用の証拠のsafe harbor

- Patch契約の必須シナリオに対し、実際の同梱指示を読んだ独立roleが出した要否判断・質問・相談・保存先判断の記録。模擬のユーザー回答は模擬と明記する。
- 同梱upstreamの参照元・revision・本文差分・licenseの確認、および配布manifest/Skill参照の確認。
- `node scripts/check-positioning.mjs`、`node scripts/check-loop-rules.mjs`、`node plugins/harness/scripts/check-runtime-config.mjs`の終了コードと要約。
- 変更対象JSON manifestがあれば`python3 -m json.tool`の結果、利用可能なSkill検証の結果、現行案内の整合を確認したread-only検索結果。

`claude plugin validate plugins/harness`と隔離Marketplace installは利用可能なら追加確認する。
未実施だけで不合格にしない。ブラウザ、外部live環境、両hostの実インストール、専用評価基盤は要求しない。
判定は上記の証拠で足りる。各findingは`product` / `verification-infra`に分類する。
