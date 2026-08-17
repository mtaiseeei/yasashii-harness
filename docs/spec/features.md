# Features

## RT-001 Native Codex dispatch

Codex roleの解決済みmodelが`gpt-5.6-luna`であっても、他の明示modelと同じくbuilt-in/default Agentへ
model / effortを直接渡す。Harnessが`agent_type: harness_luna_worker`を要求したり、global定義の存在を
起動条件にしたりしない。

resolverが返すdirect dispatch契約は、解決済みの正確なmodel / effortを保持する。値を別名へ変換せず、
起動後のmetadataと一致した場合だけ`launch-verified`と扱う既存ルールを維持する。

## RT-002 Legacy custom-agent設定の互換読込

共有または個人設定に旧`hosts.codex.custom_agents`が残っていても、runtime解決を失敗させない。
その設定はroutingへ影響しない非推奨入力として無視し、warningには少なくとも次を含める。

- 非推奨となった設定path
- custom agent経路を使わないこと
- 実効経路がnative direct dispatchであること
- ユーザーが既存設定やAgent定義を削除しなくても動作すること

新規初期化テンプレートには、この旧設定を生成しない。

## RT-003 Availability fallback

子Agent作成前の同期的な`Unknown model`としてLunaが拒否された場合だけ、既存のavailability fallbackを使う。
通常Generatorは設定済みのstrong Solへfreshに切り替え、Solも同様に拒否された場合はmodel / effortを
`inherit`へ戻してwarningを出す。Planner / Evaluatorで拒否された項目も既存契約どおりその項目だけ
`inherit`へ戻す。

実装失敗、テスト失敗、timeout、通信エラー、子作成有無が不明な失敗をlaunch rejectionとして扱わない。
Terraとshell-levelの`codex exec`は自動fallbackに使わない。

## DIST-001 配布物の単純化

配布pluginは、Harness専用Luna custom agentの定義を検査・生成・provisionするコードや利用手順を含めない。
初期化されたconfig、AGENTS / CLAUDEガイダンス、Harness Skillもcustom agentの作成や選択を要求しない。

過去の設計記録を残す場合は、現在も推奨される手順に見えないよう、廃止済みの歴史的記録であることを明記する。

## DOC-001 実行面の説明

README、設計知識、routing提案、配布ガイダンスの現在形を整合させる。
少なくとも次の観測事実を、resolverの机上結果ではなくhost metadataで確認済みの実起動として記録する。

- 確認日: 2026-08-17
- 実行面: Codex Desktop `0.148.0-alpha.9`、multi-agent v2
- dispatch: built-in/default Agent、model `gpt-5.6-luna`、effort `xhigh`
- child session: `01a00c9a-94b4-78c3-9398-6361f49d9f69`
- child metadata: model `gpt-5.6-luna`、effort `xhigh`、agent role `default`

古いAppでLunaが`Unknown model`だった記録は当時の履歴として区別できるが、現在の対応状況として表示しない。

## REL-001 配布versionの整合

runtime挙動と配布内容が変わるため、次のpatch versionへ進める。すべてのversion正本を同じ値にし、
今回の土台である`0.5.2`の次を`0.5.3`とする。
