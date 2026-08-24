# Phase 2 — Atomic Storage & Collection Construction

## 目的

通常倉庫と集配ボックスの逐次処理を廃止し、建設進捗の無限再試行を修正します。

## 1. 倉庫への一括納品

`GameScene.tryUnload()` の一個ずつ処理を、純粋な一括取引へ置き換えます。

```ts
interface CargoToBarnBatchResult {
  changed: boolean;
  cargo: CarriedCargo;
  barn: ResourceAmounts;
  breakdown: Array<{
    resource: ResourceId;
    amount: number;
  }>;
  totalMoved: number;
}
```

規則:

- 11資源すべてを一回で移す
- `RESOURCE_IDS`の安定順
- cargoを0へ、barnを同量増加
- 他の保管場所は変更しない
- 商品総数を保存
- 一回の進入または明示操作につき一回だけ
- 一回の状態emit
- 一回の保存要求
- 一回のbounded animation

表示例:

```text
倉庫へ18個納品しました
麦 7
たまご 3
小麦粉 4
牛乳 4
```

## 2. 倉庫interactionのarmed制御

```text
範囲外
→ armed = true

範囲内へ入る
→ 全量一括納品
→ armed = false

範囲内に立ち続ける
→ 再実行しない

範囲内で新しい商品を得る
→ E / Space / タップで明示実行可能
```

接触だけで毎フレーム再納品しません。

## 3. 集配ボックスへの一括預入

純粋関数を追加します。

```ts
depositPlayerResourceBatch(
  cargo,
  source,
  box,
)
```

移動量:

```text
min(
  cargo[source],
  box.capacity - box total
)
```

結果:

- 対象sourceだけを移す
- boxに空きがなければno-op
- 他の資源を変更しない
- 一回の操作で一回だけ保存要求

表示例:

```text
麦を9個預けました
麦畑集配ボックス 12 / 24
```

## 4. 集配ボックスからの一括取出

```ts
withdrawPlayerResourceBatch(
  cargo,
  source,
  box,
)
```

移動量:

```text
min(
  box.amounts[source],
  cargo.capacity - cargo total
)
```

表示例:

```text
とうもろこしを6個取り出しました
持ち物 18 / 24
```

## 5. station別armed状態

次を独立管理します。

- wheat deposit
- wheat withdraw
- corn deposit
- corn withdraw
- egg deposit
- egg withdraw

別stationへ移動したとき、前のstationの状態に妨げられてはいけません。

一つの共有cooldownで全stationを止めないでください。

## 6. 集配施設の建設ゲート

建設進捗を開始する前に、必ず `getCollectionFacilityAvailability()` を呼びます。

### locked

```text
進捗 0%
固定理由を表示
```

例:

```text
集配所
加工場の解放後に建設できます
```

### insufficient coins

```text
進捗 0%
あと120コイン必要です
```

### built

```text
建設済み
進捗を開始しない
```

### available

初めて進捗を開始します。

```text
0 → 100%
1200ms
```

## 7. 建設armed状態

施設ごとに、少なくとも次を管理します。

```ts
interface ConstructionRuntime {
  facilityId: CollectionFacilityId | null;
  holdMs: number;
  armed: boolean;
  lastAvailabilitySignature: string;
}
```

成功・失敗後は、

- 範囲を離れる
- 前提条件が変わる
- 財布残高が変わる
- 別施設へ移動する

まで同じ取引を繰り返しません。

前提未達のまま1200msごとに進捗を再開してはいけません。

## 8. 操作方法

建設は次へ対応します。

- 範囲内ホールド
- E
- Space
- 世界上のタップ
- 管理画面の建設ボタン

E / Space / タップは即時購入ではなく、同じauthoritative取引を一回だけ起動します。ホールド時間を短縮する場合も二重購入を防ぎます。

## 9. 進捗表示

進捗リングまたはバーは、

- available時のみ表示
- 0〜100%を一周
- 失敗理由表示時は静止
- 成功後は消える
- 範囲外で0へ戻る

とします。

## 10. 名称の分離

次を混同しないでください。

```text
麦の集荷箱
収穫スタッフと麦運搬スタッフが使う生産バッファ

麦畑集配ボックス
プレイヤーと集配スタッフが使う物流設備

集配所
集配ネットワーク全体の管理施設
```

世界表示、パネル、hint、テスト名で統一します。

## 11. Bounded animation

一括移動18個で18個の長いアニメーションを作りません。

- 最大6個の代表アイコン
- `+18`または`18個`
- 650ms以内
- reduced motion対応

論理取引はアニメーション完了を待ちません。

## 12. 保存

save schemaは9のままです。

保存する:

- 倉庫
- cargo
- 集配ボックス
- 建設状態

保存しない:

- armed
- holdMs
- transfer station
- 進捗リング
- 通知

ロード時はarmed=trueから開始します。

## 13. 単体テスト

- 全11資源の一括倉庫納品
- 空cargo no-op
- box部分預入
- box満杯no-op
- cargo空き分だけ取出
- 資源保存則
- 一回の取引
- locked施設ではholdを進めない
- coins不足ではholdを進めない
- 成功後に同じ範囲で二重課金しない
- 財布変化後に再評価できる

## 14. ブラウザーE2E

### 倉庫

1. 混載cargoを設定
2. 実際の倉庫範囲へ入る
3. 一回で全量移動
4. 範囲内で待っても再実行なし
5. 商品総数保存
6. 保存・再読込

### 集配ボックス

1. built boxをsetup
2. 実際のdeposit側へ移動
3. 一回で全量または空き分を預入
4. withdraw側へ移動
5. cargo空き分を一回で取出
6. station変更で即時反応

### 建設

1. 加工場未解放
2. 集配所範囲で5秒進める
3. level/coins/build state不変
4. 進捗が繰り返されない
5. 加工場をsetupで解放
6. コイン不足理由
7. コイン追加
8. 実建設
9. 600コイン一回控除
10. 範囲内に留まっても二重控除なし

既存の集配E2Eを削除せず、今回の回帰を追加します。
