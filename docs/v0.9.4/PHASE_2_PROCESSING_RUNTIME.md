# Phase 2 — Processing Runtime

## 1. 前提

Phase 1の保存修復PRが`main`へマージ済みであること。

新しいCodexタスクを、Phase 1後の最新`main`から開始します。

## 2. 目的

v0.9.0で追加された加工ロジックを、実際に遊べるシステムへ完成させます。

完了ループ：

```text
東農地と鶏小屋を解放
→ 加工場予定地を発見
→ 条件と価格を確認
→ 加工場用地を購入
→ 製粉機を建設
→ 麦・とうもろこしを搬入
→ 小麦粉・コーンミールを生産
→ ベーカリーを建設
→ 小麦粉・コーンミール・たまごを搬入
→ パン・コーンブレッドを生産
→ 持ち物または倉庫へ回収
→ 市場・契約で利用
```

## 3. PR

推奨ブランチ：

```text
codex/v0.9.4-processing-runtime
```

推奨PRタイトル：

```text
Complete v0.9.4 processing-yard runtime and interactions
```

## 4. Runtime System

次を実装します。

```text
ProcessingSystem
ProcessingFacilityView
ProcessingWorkerSystem
ProcessingPanel
```

`GameScene`はシステムを生成・更新・破棄します。

```ts
private processingSystem!: ProcessingSystem;
```

`GameScene.updateProduction()`に全処理を詰め込みません。

## 5. Facility Registry

次の施設を`FacilityId`へ追加します。

```text
processing-yard
processing-yard-gate
processing-control-board
grain-mill
grain-mill-input
grain-mill-output
bakery
bakery-input
bakery-output
mill-operator-station
baker-station
```

次のInteractionを追加します。

```text
purchase-processing-yard
build-grain-mill
build-bakery
open-processing-panel
transfer-mill-input
collect-mill-output
transfer-bakery-input
collect-bakery-output
```

必要なら、機械強化はパネルから行います。

### 5.1 Authority

施設座標、範囲、表示半径、看板、Interaction座標を複数ファイルへ重複させません。

`FacilityRegistry`または既存`facilities.ts`を権威ある定義にします。

## 6. 加工場用地

### 6.1 配置

既存の加工場受入ボックス・集配所と自然につながる、南東側の区画を使用します。

座標は、実際の施設矩形と次を照合して決定します。

```text
鶏小屋
東農地
集配所
加工場受入ボックス
契約施設
主要道路
スタッフ経路
```

固定座標を仕様からそのまま採用せず、重なり検査を通します。

### 6.2 未購入状態

未購入でも、次が見えます。

```text
加工場予定地
閉じた門
基礎杭
建設予定の輪郭
加工場案内板
```

遠くから存在を発見できます。

### 6.3 購入条件

```text
東農地を購入済み
鶏小屋を購入済み
800コイン
```

案内例：

```text
加工場

✓ 東農地
✓ 鶏小屋
あと 230コイン
```

条件を満たす：

```text
加工場を建設
800コイン
```

### 6.4 購入操作

```text
範囲内に1200ms滞在
進捗リング
離れるとリセット
成功時に800コインを1回だけ減算
優先保存
```

成功後：

```text
門が開く
予定地表示を撤去
加工場の地面・道・管理板を描画
```

## 7. 次の目標

東農地と鶏小屋を解放した時点で、カメラ固定HUDへ一度だけ表示します。

```text
次の目標
加工場を建設できます
```

ボタン：

```text
加工場へ案内
```

ボタンは、

```text
マップ上の加工場アイコンを点滅
目的地マーカーを門前へ設定
```

します。

プレイヤーを強制テレポートしません。

## 8. 製粉機

### 8.1 建設

加工場用地購入後：

```text
製粉機 350コイン
```

範囲内1000msで建設します。

成功時：

```text
millBuilt = true
mill.level = 1
```

現在の純粋関数とstate invariantを維持します。

### 8.2 見た目

- 木造の製粉小屋
- 粉袋
- 歯車または小型水車風パーツ
- 原料搬入口
- 完成品受取口
- 稼働中の回転
- 停止中の静止
- 原料不足アイコン
- 出力満杯アイコン

### 8.3 手動搬入

製粉機入力範囲で、持ち物から次だけを1個ずつ移します。

```text
麦
とうもろこし
```

他資源は保持します。

入力buffer容量を超えません。

### 8.4 手動回収

出力範囲で、次を持ち物へ1個ずつ回収します。

```text
小麦粉
コーンミール
```

持てる数を超えません。

### 8.5 レシピ

既存レシピを維持します。

```text
麦2 → 小麦粉1
とうもろこし2 → コーンミール1
```

### 8.6 モード

加工場パネルから選択します。

```text
自動
小麦粉を優先
コーンミールを優先
停止
```

## 9. ベーカリー

### 9.1 建設条件

```text
加工場購入済み
製粉機建設済み
850コイン
```

### 9.2 手動搬入

対応資源：

```text
小麦粉
コーンミール
たまご
```

### 9.3 手動回収

```text
パン
コーンブレッド
```

### 9.4 レシピ

```text
小麦粉1 + たまご1 → パン1
小麦粉1 + コーンミール1 + たまご1 → コーンブレッド1
```

### 9.5 モード

```text
自動
パンを優先
コーンブレッドを優先
停止
```

## 10. ProcessingPanel

加工場管理板に近づき、E/Spaceまたはボタンで開きます。

表示：

```text
加工場

製粉機 Lv1
状態：小麦粉を加工中
入力：麦 8 / 24、とうもろこし 4 / 24
出力：小麦粉 3、コーンミール 2

ベーカリー 未建設
850コイン
```

操作：

- 機械建設
- 機械強化
- 運転モード変更
- 稼働/停止
- 製粉スタッフ雇用・研修
- 製パンスタッフ雇用・研修
- 原料保護量
- 生産方針

パネルを開いている間、GameSceneをpauseします。

## 11. Processing Workers

### 11.1 Workforce registry

次のroleを研修小屋と加工場パネルへ統合します。

```text
mill-operator
baker
```

既存`ProcessingWorkerState`を権威ある状態として使います。

### 11.2 製粉スタッフ

役割：

```text
倉庫または加工場受入ボックス
→ 麦・とうもろこしをまとめて積む
→ 製粉機入力へ搬入
→ 製粉機出力から完成品をまとめて回収
→ 倉庫へ運ぶ
```

積載：

```text
Lv1 8
Lv2 12
Lv3 16
```

一往復一個を禁止します。

### 11.3 製パンスタッフ

役割：

```text
倉庫または加工場受入ボックス
→ レシピに必要な原料をまとめて積む
→ ベーカリーへ搬入
→ パン類をまとめて回収
→ 倉庫へ運ぶ
```

積載：

```text
Lv1 6
Lv2 9
Lv3 12
```

### 11.4 Runtime entity

スタッフは、

- 画面上に存在する
- 道に沿って移動する
- 積載物が見える
- 状態がHUDへ出る
- shutdownで破棄される

必要があります。

純粋関数が在庫を遠隔移動するだけの実装は禁止です。

## 12. 生産ループ

`ProcessingSystem.update(delta)`が次を担当します。

```text
機械cycle進行
cycle開始
入力不足判定
出力満杯判定
スタッフruntime更新
手動搬入・回収
状態表示更新
priority save通知
```

`GameScene`は、

```ts
this.processingSystem.update(delta);
```

を呼ぶだけにします。

## 13. 保存・復元

既存schema 5を維持できます。

追加で、次を確認します。

- 購入状態
- 機械レベル
- モード
- 入力buffer
- 出力buffer
- activeCycle
- reservedInputs
- スタッフ雇用・レベル・積載

ロード時：

```text
activeCycleは残り時間から再開
積載中スタッフは安全な固定地点から目的地へ再出発
```

資源を二重に生成しません。

## 14. Unit tests

- 加工場前提条件
- 加工場購入価格
- 二重購入防止
- 製粉機建設
- ベーカリー前提条件
- 手動搬入の資源allowlist
- buffer容量
- 手動回収の持ち物容量
- cycle原料予約
- cycle完了
- cycleキャンセル
- 出力満杯停止
- worker batch積込
- worker batch荷下ろし
- resource invariant
- save/restore active cycle

## 15. Browser E2E

E2E用fixture saveで、

```text
東農地解放
鶏小屋解放
所持金5000
```

を用意します。

fixtureは正規save envelopeとして生成し、import経路またはtest-only bootstrapから読みます。

必須シナリオ：

```text
1. 加工場予定地が存在
2. 条件表示
3. 加工場購入
4. 製粉機建設
5. 麦を搬入
6. 小麦粉が完成
7. 回収
8. ベーカリー建設
9. パン完成
10. 保存
11. 再読込
12. 建設・buffer・cycle状態が維持
```

E2E test APIは、プレイヤー位置移動だけを補助して構いません。

購入関数やstateを直接成功状態へ変更してはいけません。

## 16. 完了条件

- 加工場を最初からゲーム内で解放できる
- 施設が見える
- 条件が分かる
- 手動搬入・回収できる
- スタッフが実際に動く
- 市場・契約へ加工品が流れる
- 保存・復元できる
- unit/CI/E2Eが成功

READMEへ「加工場実装済み」と書くのは、この完了条件を満たした後だけです。
