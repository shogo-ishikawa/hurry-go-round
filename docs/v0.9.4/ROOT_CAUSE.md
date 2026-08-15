# v0.9.3 Root-Cause Analysis

## 1. 結論

v0.9.3で「セーブ」「加工場」「集配」「牧草・牛・乳製品」が利用できない主因は、単一のバグではありません。

次の三つの設計上の問題が重なっています。

1. **純粋ロジックと状態型だけが実装され、ランタイム接続が欠けている**
2. **単体テストが手作りの正常値だけを検証し、実ゲームから生成される値を検証していない**
3. **一つの巨大タスクで多数機能を要求し、Codexが「基盤実装」を完了としてPR化した**

## 2. PR #24の変更範囲

v0.9.3実装PR #24が変更した主なファイルは次です。

```text
src/game/logic/dairy.ts
src/game/logic/dairy.test.ts
src/game/state/GameState.ts
src/game/persistence/saveSchema.ts
src/game/persistence/migrations.ts
src/game/persistence/saveValidation.ts
src/game/logic/saveSnapshot.ts
src/game/scenes/GameScene.ts
src/main.ts
resource/contract関連
```

一方、次の重要ファイル・領域は変更されていません。

```text
src/game/art/terrain.ts
src/game/logic/facilities.ts
src/game/scenes/UIScene.ts
新しいDairySystem
新しいProcessingSystem
新しいCollectionNetworkSystem
牧草・牛・乳製品施設のentities
集配スタッフのruntime entity
加工スタッフのruntime entity
```

これは、v0.9.3が「状態・純粋ロジック・保存形式の基盤」を実装した一方で、ゲーム内で利用するための層を完成させていないことを示します。

## 3. 加工場が使えない理由

### 3.1 状態の初期値

`GameState`では加工状態が次のように初期化されます。

```text
yardUnlocked = false
millBuilt = false
bakeryBuilt = false
```

製粉機とベーカリーも未建設状態です。

### 3.2 購入関数は存在する

`src/game/logic/processing.ts`には次の純粋関数があります。

```text
purchaseProcessingYard(...)
buildProcessingMachine(...)
upgradeMachine(...)
```

### 3.3 しかし呼び出すランタイムがない

`GameScene.create()`では、次のシステムだけが生成されています。

```text
MarketSystem
UpgradeSystem
WorkerSystem
HiringSystem
ExpansionSystem
ExpandedAutomationSystem
```

加工場用地・製粉機・ベーカリーを購入する`ProcessingSystem`は生成されていません。

`GameScene.updateProduction()`は、既存の機械状態へ、

```text
advanceProductionCycle(...)
startProductionCycle(...)
```

を適用するだけです。

未建設状態では`startProductionCycle()`が開始できないため、更新処理が存在しても何も起きません。

### 3.4 施設レジストリにも存在しない

`src/game/logic/facilities.ts`には、v0.9.1の集配施設名は追加されていますが、少なくとも現在の公開ランタイムで必要な次の施設・操作が揃っていません。

```text
加工場予定地
加工場購入
製粉機建設
ベーカリー建設
製粉機操作
ベーカリー操作
加工スタッフ雇用
加工完成品回収
```

したがって、プレイヤーが加工状態を`false`から`true`へ変更する経路がありません。

## 4. 集配システムが使えない理由

### 4.1 状態と純粋ロジックは存在する

v0.9.1で、

```text
collectionNetwork
collection boxes
processing intake
courier state
routing mode
```

が追加されています。

### 4.2 施設名はあるが操作定義が不足

`FACILITIES`には、

```text
collection-hub
wheat-collection-box
corn-collection-box
egg-collection-box
processing-intake
```

があります。

しかし`INTERACTIONS`には、次の操作がありません。

```text
集配所を建設
各集配ボックスを建設
持ち物を集配ボックスへ預ける
集配スタッフを雇う
集配スタッフを研修する
配送モードを変更する
加工場受入ボックスを操作する
```

### 4.3 Runtime Systemがない

`GameScene`は`CollectionNetworkSystem`を生成していません。

`updateProduction()`で、加工場受入ボックスから機械入力へ1個を仕分ける処理だけは呼ばれていますが、次がありません。

```text
プレイヤーから集配箱への預入
集配箱から集配スタッフへの積込
スタッフの移動
加工場または倉庫への荷下ろし
建設・雇用・研修
世界描画
HUD
```

したがって、`collectionNetwork`は保存可能なデータ構造であって、プレイ可能なシステムではありません。

## 5. 牧草・牛・乳製品が使えない理由

### 5.1 DairyStateはすべて未解放

`createDairyState()`は次の状態を返します。

```text
pastureUnlocked = false
pastureLevel = 0
barnBuilt = false
cows = []
workshopBuilt = false
workshopLevel = 0
dairyWorker.hired = false
workshopWorker.hired = false
```

### 5.2 購入関数は存在する

`src/game/logic/dairy.ts`には、

```text
purchasePasture(...)
expandPasture(...)
buildCowBarn(...)
buyCow(...)
```

があります。

### 5.3 しかし購入経路がない

次が存在しません。

```text
牧草地の施設定義
牧草地購入Interaction
牧草ノード
牧草収穫
干し草をhayRackへ移す処理
牛舎の施設定義
牛舎建設Interaction
牛購入UI
牛のGameObject
干し草台
ミルクタンク
乳製品工房の施設定義
乳製品工房建設Interaction
酪農スタッフのruntime
乳製品スタッフのruntime
酪農HUD
```

### 5.4 時間更新だけが接続されている

`GameScene.updateProduction()`は、

```text
advanceCows(...)
advanceDairyCycle(...)
startDairyCycle(...)
```

を呼びます。

しかし、牛が0頭、干し草が0、工房が未建設なので、初期状態から何も変化しません。

これは「実装済みだが条件を満たしていない」のではなく、「条件を満たすゲーム内経路が未実装」です。

## 6. セーブが失敗する理由

### 6.1 実ランタイム値と整数限定検証の不一致

`GameScene.getPersistedSnapshot()`は作物の残り時間を次のように作ります。

```text
regrowMs - elapsedMs
```

Phaserの`delta`は小数を含むことがあるため、この値も小数になります。

しかし`saveValidation.ts`では、作物の`remainingMs`に整数限定関数を適用しています。

```text
finiteNonNegativeInteger(crop.remainingMs)
```

したがって、実ゲームを数フレーム動かした後の正常なスナップショットが、保存検証で拒否される可能性が高いです。

### 6.2 他の時間値にも同じ危険がある

次の値もフレームdeltaから小数になる可能性があります。

```text
processing.activeCycle.remainingMs
collectionNetwork.courier.waitMs
crop.remainingMs
cow.productionRemainingMs
dairy.cycle.remainingMs
```

一部は`finiteNonNegativeNumber`へ修正されていますが、全時間値に一貫して適用されていません。

### 6.3 保存前に検証していない

`SaveService.save()`は、

```text
1. envelopeを作る
2. primaryへ書く
3. primaryを読み直す
4. 検証する
```

という順序です。

新しいenvelopeが無効な場合でも、無効なprimaryを先に保存します。

その後に例外が発生します。

望ましい順序は、

```text
1. snapshotを正規化
2. envelopeを作る
3. 書込前に検証
4. old primaryをbackupへ
5. primaryへ書く
6. 読み戻して検証
7. 失敗時はold primaryを復旧
```

です。

### 6.4 IndexedDB fallbackがない

現在の`IndexedDbSaveRepository`はIndexedDBだけを使用します。

次がありません。

```text
open blocked処理
versionchange処理
transaction abort詳細
localStorage緊急保存
IndexedDB使用可否診断
保存先表示
```

ブラウザー設定、プライベートモード、容量、既存DB状態などでIndexedDBが失敗した場合、保存経路全体が失われます。

### 6.5 単体テストが実ゲームスナップショットを使っていない

保存テストは、整数だけを持つ手作りfixtureを使うと成功します。

しかし実ゲームでは、

```text
小数delta
実際のScene time
作物の経過時間
稼働中機械
稼働中スタッフ
```

を含みます。

`GameScene.getPersistedSnapshot()`から生成した実スナップショットを、保存→読込へ通すテストがありません。

## 7. なぜCIが成功したのか

CIが確認したのは主に次です。

```text
TypeScript型チェック
純粋関数の単体テスト
手作りsnapshotのvalidation
Vite build
```

CIは次を確認していません。

```text
施設がマップ上に存在する
プレイヤーが購入範囲へ入れる
購入後に状態が変わる
スタッフが画面上を移動する
GitHub PagesでIndexedDBへ保存できる
再読込後に「つづきから」が出る
```

したがって、CI成功は「コードがコンパイルされ、単体テストが通った」ことを示すだけで、「ゲーム機能がプレイ可能」であることを示しません。

## 8. Codexタスク設計上の問題

v0.9.3は、次を一つのタスクへ含めました。

```text
保存修復
加工場完成
集配ランタイム
牧草
牛
牛乳
乳製品
スタッフ
市場
契約
migration
```

範囲が大きすぎるため、Codexは実装コストの低い、

```text
型
純粋ロジック
migration
unit test
GameSceneの最小更新
```

を優先し、PR本文でも「foundations」と表現しています。

今後は、実装を4つのPRへ分割し、各PRでブラウザー受入条件を必須にします。

## 9. 再発防止ルール

新機能ごとに次の表をPR本文へ記載します。

| 層 | 完了条件 |
|---|---|
| State | 初期状態・更新状態が定義済み |
| Logic | 純粋関数と単体テストがある |
| Runtime | Scene/Systemへ生成・update・shutdownが接続済み |
| Interaction | 購入・利用・雇用を実行できる |
| Presentation | 施設・キャラ・HUD・案内が見える |
| Persistence | 保存・復元・migration済み |
| E2E | ブラウザーで主要シナリオが通る |

一つでも未完了なら、その機能をPRタイトルやREADMEで「実装済み」と書きません。
