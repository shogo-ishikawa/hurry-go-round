# Phase 3 — Dynamic Wheat Field & Transport Recovery

## 目的

麦畑の作物、土、畝、柵を同じlevelから描画し、麦運搬スタッフが一時集荷箱の状態に依存せず自律して倉庫へ運ぶようにします。

## 1. WheatFieldView

静的な `createFarmWorld()` から麦畑の可変表示を分離します。

```ts
class WheatFieldView {
  render(level: WheatFieldLevel): void;
  getDiagnostics(): WheatFieldViewDiagnostics;
  destroy(): void;
}
```

保持する描画:

- 全体予定地
- 現在有効な土
- 畝
- 拡張予定ストリップ
- 柵
- 拡張パッドへの農道
- 段階ラベル

シーン生成時、購入成功時、ロード復元時に `render(level)` を呼びます。

## 2. authoritativeな視覚境界

視覚境界を `[430, 595, 760]` の独立した固定値で持ちません。

次から導出します。

- active nodeの最小・最大x/y
- 作物spriteの見た目半径
- 外周margin
- 柵のstroke幅

概念:

```ts
getWheatFieldVisualBounds(level, nodes, cropVisualRadius, margin)
```

必須不変条件:

```text
各active cropのvisual bounds
⊂ active soil bounds

active soil bounds
⊂ active fence bounds内側

inactive crop
not rendered
```

## 3. 段階

論理値は維持します。

| Level | 列×行 | 株数 | 集荷箱 | 費用 |
|---|---:|---:|---:|---:|
| 0 | 5×6 | 30 | 16 | - |
| 1 | 7×6 | 42 | 24 | 220 |
| 2 | 9×6 | 54 | 32 | 520 |

第1拡張では右へ2列、第2拡張でも右へ2列増えます。

一列だけが土の外側へ見える状態を禁止します。

## 4. runtime再描画

購入時の順序:

```text
purchase transaction
→ state level更新
→ crop nodes更新
→ WheatFieldView.render(newLevel)
→ interaction/view diagnostics更新
→ state emit
→ priority save
```

描画失敗で論理購入をrollbackする必要はありませんが、テストでは必ず一致を確認します。

## 5. 麦運搬スタッフのauthoritative runtime値

`getWheatWorkerRuntimeParameters("wheat-transporter", level)` を使用します。

| Level | 容量 | 移動倍率 | 操作間隔倍率 |
|---|---:|---:|---:|
| 1 | 6 | 1.00 | 1.00 |
| 2 | 8 | 1.15 | 0.85 |
| 3 | 10 | 1.30 | 0.70 |

固定の、

```text
transportWorkerCarryCapacity = 6
transportWorkerMoveSpeed = 185
150ms
```

をレベル2・3にも使い続けてはいけません。

## 6. 出発判定を積込前に行う

毎updateの最初に純粋判定します。

```ts
decideTransportLoad(crate, cargo, capacity)
```

次なら即時に倉庫へ向かいます。

```text
cargo >= capacity
crate <= 0 && cargo > 0
legacy cargo > capacity
最大待ち時間経過 && cargo > 0
```

`loadTransportWorkerBatch()` がchanged=falseでもloadingへ残り続けてはいけません。

## 7. 一括積込

一時集荷箱から一回の論理取引で積みます。

```text
moved =
min(
  crate amount,
  capacity - worker cargo
)
```

結果:

- crateをmoved減らす
- worker cargoをmoved増やす
- 保存則
- level容量到達なら即出発
- crateが空なら部分積載でも出発
- 700ms待機後は部分積載でも出発

## 8. 一括荷下ろし

倉庫到着時、持っている麦を一回で全量納品します。

```text
barn wheat += worker cargo
worker cargo = 0
```

一個ずつ150ms処理しません。

bounded animationと数量表示だけを行います。

## 9. 満杯一時集荷箱

次の状態から回復できなければなりません。

```text
crate = capacity
worker cargo = 0
→ 一括積込
→ 倉庫へ出発

crate = capacity
worker cargo = capacity
→ 積込を試さず倉庫へ出発

crate = capacity
worker cargo > capacity  // 旧セーブ・異常状態
→ 商品を捨てず倉庫へ出発
```

プレイヤーが箱を空にすることを回復条件にしてはいけません。

## 10. 状態表示

公開状態:

```text
集荷箱へ移動中
麦を6個積みました
倉庫へ運搬中
麦を6個納品しました
集荷箱が空です
積込待ち
```

「loading」など内部名を表示しません。

HUDはレベル別容量と現在積載を表示できるようにします。

## 11. 旧セーブ

schema 9を維持します。

- `workers.transportWorker.carried`をそのまま保持
- level別容量を超えていても資源を切り捨てない
- ロード直後に倉庫配送へ遷移
- fieldCrate、barn、cargo、worker cargoの合計を保持

## 12. 単体テスト

- 30/42/54 nodeがvisual bounds内
- 6/8/10 capacity
- crate満杯からbatch load
- partially loaded + timeout departure
- already full cargo departure
- legacy over-capacity cargo departure
- batch unload
- 保存則
- player pickupとworker loadが同時でも負数なし
- view redraw after level purchase
- static terrainに旧field graphicが残らない

## 13. E2E

### 視覚

各levelでdiagnosticsを取得します。

```text
nodeVisualBounds
activeSoilBounds
fenceBounds
renderedLevel
```

全nodeがactive soil内であることを検証します。

可能ならスクリーンショットも保存し、少なくとも次を確認します。

- 30株で5列
- 42株で7列
- 54株で9列
- 追加列と土が同時に増える
- 旧west畑の表示がない

### 運搬スタッフ

1. Lv1、crate満杯
2. workerを実際に雇用済みsetup
3. 実状態機械を固定stepで進める
4. 6個積込
5. 倉庫へ移動
6. 6個一括納品
7. crateが残っていれば次便
8. Lv2 8個、Lv3 10個
9. carried=11の旧セーブ相当
10. 停止せず11個を倉庫へ納品
11. 資源保存

## 14. 最終バージョン

Phase 3の最終PRで更新します。

```text
package.json       0.9.8
package-lock.json  0.9.8
GAME_VERSION       0.9.8
タイトル画面       v0.9.8
HUD                 v0.9.8
README              v0.9.8
```

save schemaは9のままです。

タグとGitHub ReleaseはPages受入後に別途作成します。
