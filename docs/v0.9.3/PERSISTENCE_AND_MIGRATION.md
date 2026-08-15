# v0.9.3 保存・復元・schema 5 migration

v0.9.3では、保存機能を単なる補助機能ではなく、リリース必須機能として扱います。

次の四つが実機で成立しなければなりません。

```text
保存できる
保存成功が分かる
再読込できる
続きから正しく再開できる
```

---

# 1. セーブスキーマ

```text
schema 4 → schema 5
```

公開ゲームバージョン：

```text
0.9.3
```

既存のschema 1、2、3、4を読み込める必要があります。

migration chainを削除せず、次のいずれかで処理します。

```text
1 → 2 → 3 → 4 → 5
```

または、各旧schemaから5への明示的migrationです。

どちらの場合も、各段階を純粋関数としてテストしてください。

---

# 2. schema 5へ追加する状態

## 2.1 牧草地

```ts
interface PersistedPastureState {
  unlocked: boolean;
  level: 0 | 1 | 2;
  nodes: PersistedPastureNode[];
}

interface PersistedPastureNode {
  id: string;
  state: "growing" | "ready" | "cut";
  remainingMs: number;
}
```

## 2.2 牛舎

```ts
interface PersistedCowState {
  id: string;
  fed: boolean;
  productionRemainingMs: number;
  readyMilk: number;
  activitySeed: number;
}

interface PersistedDairyBarnState {
  built: boolean;
  cows: PersistedCowState[];
  hayFeed: number;
  hayFeedCapacity: number;
  milkTank: number;
  milkTankCapacity: number;
}
```

## 2.3 乳製品工房

```ts
interface PersistedDairyWorkshopState {
  built: boolean;
  level: 0 | 1 | 2 | 3;
  enabled: boolean;
  selectedMode: "auto" | "butter" | "cheese";
  inputMilk: number;
  inputCapacity: number;
  output: {
    butter: number;
    cheese: number;
  };
  outputCapacity: number;
  activeCycle: null | {
    recipe: "butter" | "cheese";
    remainingMs: number;
    durationMs: number;
    reservedMilk: number;
  };
  completedCycles: number;
}
```

## 2.4 新スタッフ

```ts
interface PersistedDairyWorker {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: "hay" | "milk" | null;
  carriedAmount: number;
  safeRestartTask: string;
}

interface PersistedDairyProcessor {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: "milk" | "butter" | "cheese" | null;
  carriedAmount: number;
  safeRestartTask: string;
}
```

## 2.5 集配ネットワーク

schema 4の集配ネットワークへ追加します。

```text
牧草地集配ボックス
牛舎集配ボックス
乳製品完成品ボックス
```

各ボックスについて、次を保存します。

```text
建設状態
容量
資源量
source age
```

集配スタッフが新施設へ向かっている途中で保存された場合も、積載物を保持し、安全な固定地点から再開します。

## 2.6 進行状態

```ts
interface DairyProgressionState {
  processingUnlockNoticeSeen: boolean;
  processingGuidanceCompleted: boolean;
  pastureUnlocked: boolean;
  dairyBarnBuilt: boolean;
  firstCowMilkProduced: boolean;
  dairyWorkshopBuilt: boolean;
  firstButterProduced: boolean;
  firstCheeseProduced: boolean;
}
```

---

# 3. 資源拡張migration

schema 4のResourceAmountsには、次の資源がありません。

```text
hay
milk
butter
cheese
```

migrationで、すべてのResourceAmountsへ0を追加します。

対象：

- cargo
- barn
- market
- marketCapacity
- soldByResource
- contract requirements
- contract delivered
- machine input/output
- active reserved inputs
- collection boxes
- collection courier cargo
- processing intake

未追加のキーが一つでもある場合、schema 5として検証成功させないでください。

## 3.1 market capacity初期値

```text
hay    0
milk   8
butter 6
cheese 6
```

ただし、施設未解放中は顧客需要と補充を無効にします。

## 3.2 unit price

```text
hay    0
milk   8
butter 20
cheese 32
```

---

# 4. schema 4から5への初期化

既存v0.9.1セーブは、次として移行します。

```text
牧草地：未購入
牧草地レベル：0
牧草ノード：初期定義から生成、未表示
牛舎：未建設
牛：0頭
干し草台：0 / 24
ミルクタンク：0 / 24
乳製品工房：未建設
酪農スタッフ：未雇用
乳製品スタッフ：未雇用
新集配ボックス：未建設
新資源：すべて0
```

次は保持します。

- プレイヤー位置
- 既存7資源
- コイン
- 土地
- とうもろこし畑拡張
- 鶏小屋
- 全既存スタッフ
- 研修レベル
- 契約
- 評判
- 加工場
- 製粉機
- ベーカリー
- 加工中cycle
- reserved inputs
- 集配所
- 既存集配ボックス
- 集配スタッフ
- JSON入出力可能性

---

# 5. 時間値の正規化

保存失敗の再発防止として、スナップショット作成時に時間値を正規化します。

推奨：

```ts
function normalizeDurationMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
```

対象：

- 作物remainingMs
- 牧草remainingMs
- 牛乳生産remainingMs
- 鶏卵remainingMs
- 機械cycle remainingMs
- 乳製品cycle remainingMs
- 集配source age
- スタッフbatch wait
- 契約active time
- playTimeMs

資源数・容量・レベル・コインは、整数を維持します。

## 5.1 validator

```ts
isNonNegativeInteger
isFiniteNonNegativeNumber
isValidDurationMs
```

を分けます。

旧セーブに小数ミリ秒がある場合は、migrationで正規化します。

---

# 6. 原料予約とcycle保存

## 6.1 製粉機・ベーカリー

既存処理を維持します。

生産開始時：

```text
input bufferから原料を減らす
reservedInputsへ移す
activeCycleを作る
```

保存・復元時に、原料を二度減らしてはいけません。

## 6.2 乳製品工房

バター：

```text
reservedMilk = 2
```

チーズ：

```text
reservedMilk = 3
```

activeCycle中の保存：

- reservedMilkを保存
- remainingMsを保存
- outputへまだ追加しない

復元：

- cycleを継続
- 原料を再消費しない
- 完了時に一度だけoutputへ追加

cancel：

- reservedMilkをinputへ返す
- 容量超過なら倉庫へ返す
- 資源を消失させない

---

# 7. 牛乳生産保存

牛が生産中の場合：

```text
fed = true
productionRemainingMs > 0
```

として保存します。

復元時：

- 干し草を再消費しない
- remainingMsから再開
- 完了時に牛乳を一度だけ生成

タンク満杯で完成待ちの場合：

```text
readyMilk > 0
```

として保持します。

タンクに空きができた後、一度だけ移します。

---

# 8. スタッフ保存・安全な再開

Phaserの座標補間やTween自体は保存しません。

保存するもの：

- 雇用状態
- レベル
- 積載資源
- 積載数
- sourceId
- destinationId
- safeRestartTask
- batch waitが必要なら残り時間

ロード後：

## 酪農スタッフ

```text
干し草を持っている
→ 牛舎へ向かう

牛乳を持っている
→ 保存済み配送先へ向かう
```

## 乳製品スタッフ

```text
牛乳を持っている
→ 乳製品工房へ向かう

バターまたはチーズを持っている
→ 倉庫または完成品ボックスへ向かう
```

## 集配スタッフ

既存ルールを維持し、新しいsource/destinationを追加します。

積載資源を失ったり、sourceへ戻して二重取得したりしないでください。

---

# 9. 保存repository

## 9.1 primary

```text
IndexedDB
```

## 9.2 backup

```text
IndexedDB backup slot
```

## 9.3 emergency

```text
localStorage emergency snapshot
```

## 9.4 fallback

IndexedDBが利用不能の場合：

```text
localStorage primary-like fallback
```

保存先をenvelope metadataまたは別metadataへ記録します。

例：

```ts
storageBackend: "indexeddb" | "localstorage-fallback";
```

チェックサム対象外のenvelope metadataとしても構いません。

---

# 10. 保存状態UI

常時の小表示：

```text
保存済み 15:42
未保存
保存中…
保存エラー
簡易保存
```

管理画面：

```text
保存先
最終保存
前回の検証結果
今すぐ保存
保存機能を確認
JSON書き出し
JSON読み込み
```

成功した保存時刻を、ユーザーが確認できるようにします。

---

# 11. 保存失敗時の情報

ユーザー向け：

```text
保存に失敗しました
JSONとして書き出して進行を保護できます
```

開発者向け：

```text
error code
validation error list
backend
schema version
save sequence
snapshot size
```

個人情報や絶対ローカルパスをログへ出さないでください。

---

# 12. JSON入出力

最大サイズ：

```text
2 MiB
```

読み込みプレビュー：

- 保存日時
- ゲームバージョン
- schema
- 保存先由来
- 所持金
- 土地
- 牛の頭数
- 加工場
- 乳製品工房
- スタッフ数
- 契約
- 評判

適用前に、現在のprimaryをbackupへ保存します。

---

# 13. 自動保存

通常：

```text
15秒ごと
ただしdirty時のみ
```

priority save：

- 土地購入
- 牛舎建設
- 牛購入
- 乳製品工房建設
- スタッフ雇用
- 研修
- 加工開始
- 加工完了
- 契約受注
- 契約完了
- 配送モード変更
- JSON import

500ms debounce後に保存して構いません。

保存中のpriority save要求を捨てないでください。

---

# 14. migrationテスト

## schema 1

- 既存麦状態を保持
- 新資源0
- 加工・集配・酪農は未解放

## schema 2

- とうもろこし畑レベル保持
- スタッフレベル保持
- 新資源0

## schema 3

- 加工場cycle保持
- reserved inputs保持
- 集配は初期化
- 酪農は初期化

## schema 4

- 集配ネットワーク保持
- 加工場保持
- 酪農だけ初期化

## schema 5 round-trip

- 全11資源
- 牧草ノード
- 牛
- 干し草
- 牛乳
- 乳製品cycle
- 新スタッフ
- 新集配ボックス
- 契約
- 保存連番

を保持します。

---

# 15. 保存回帰テスト

次の実プレイ相当snapshotで、保存を成功させます。

- 小数の作物remainingMs
- 小数のmachine remainingMs
- 小数のcourier waitMs
- 牛乳生産中
- チーズ加工中
- 集配スタッフ移動中
- 顧客列稼働中
- 契約進行中

顧客列そのものは保存しなくて構いませんが、保存処理が失敗してはいけません。
