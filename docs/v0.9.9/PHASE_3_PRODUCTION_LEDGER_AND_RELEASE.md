# v0.9.9 Phase 3 — Production Ledger & Final Release

## 目的

完成した商品を、

```text
今どこに何個あるか
今回の仕込みで何個できたか
累計で何個作ったか
最後に何が完成したか
```

まで追跡できるようにする。

Phase 3で設定と統計を正式に永続化し、public versionを0.9.9、save schemaを10へ更新する。

---

# 1. 完成品ページ

加工場画面の「完成品」ページに、製粉機とベーカリーを並べる。

## 製粉機

```text
完成品置き場 5 / 16

小麦粉 3
コーンミール 2

今回の仕込み
小麦粉 4 / 計画4
コーンミール 1 / 計画2

累計
小麦粉 27
コーンミール 13
```

## ベーカリー

```text
完成品置き場 4 / 12

パン 3
コーンブレッド 1

今回の仕込み
パン 3 / 計画4
コーンブレッド 1 / 計画2

累計
パン 18
コーンブレッド 7
```

「今回の仕込み」は、計画を変更またはリセットした時点からの進捗とする。

---

# 2. 最後に完成した商品

製造完了時に、世界上とUIへ短い通知を出す。

```text
小麦粉が1個完成しました
完成品置き場：小麦粉3
```

同時に多数完成しても、アニメーション数は固定上限とする。

例：

```text
パン +4
```

通知のために商品数だけのGameObjectを大量生成しない。

## 世界上表示

機械の状態板：

```text
製粉機
小麦粉を加工中 62%
完成：小麦粉3 / コーンミール2
```

待機時：

```text
製粉機
原料待ち
不足：麦2
```

詰まり時：

```text
ベーカリー
素材庫の配合を整理してください
余剰：小麦粉14
不足：たまご4
```

---

# 3. レシピ別統計

新しい統計：

```ts
interface ProcessingProductionStats {
  completedByRecipe: Record<RecipeId, number>;
  legacyUnattributedCycles: Record<MachineId, number>;
  lastCompleted: {
    recipeId: RecipeId;
    output: ResourceAmounts;
    completedAtPlayTimeMs: number;
  } | null;
}
```

`completedCycles`は互換性のため維持してもよいが、新規表示は`completedByRecipe`を利用する。

製造完了時に、

- completedCycles
- completedByRecipe[recipeId]
- currentPlanCompleted[recipeId]
- lastCompleted

を一つのstate transitionで更新する。

---

# 4. 完成品の一括回収

現行の一個ずつ回収を廃止する。

受取口へ入ると、持ち物の空き容量まで一括回収する。

例：

```text
完成品を7個回収しました
小麦粉 4
コーンミール 3
```

複数資源がある場合は、

- 選択中レシピの製品を優先
- 次にround-robin

または、完成品ページで優先順を設定できる。

同じ領域に立ち続けても再実行しない。

一度離れて戻るか、新しい完成品が増えたときに再armする。

## 倉庫へ移す

各機械ページと完成品ページへ、

```text
完成品をすべて倉庫へ移す
```

を置く。

加工スタッフが雇用済みなら、スタッフも同じ原子的取引を利用する。

---

# 5. 製造履歴

直近5件を表示する。

```text
12:31　パン 1個
12:29　小麦粉 1個
12:28　コーンミール 1個
```

実時刻ではなく、ゲーム内playTimeMsから相対表示してよい。

```text
15秒前
1分前
```

履歴は最大20件だけ保存する。

同じフレームで複数件が完成した場合はまとめる。

履歴は分析用の無制限ログにしない。

---

# 6. 計画の完了・繰り返し

機械ごとに、

```text
計画を繰り返す
計画完了で停止
```

を選ぶ。

## 繰り返す

計画回数を完了すると、currentPlanCompletedを0へ戻し、同じ計画を継続する。

## 完了で停止

全対象レシピが目標回数へ達したら、

```text
仕込み計画が完了しました
```

として新規サイクルを開始しない。

既存の完成品回収と入力整理は可能。

---

# 7. schema 10

## 7.1 保存する新状態

機械ごと：

```text
recipe target cycles
current plan completed cycles
repeat / stop-on-complete
supply source mode
auto balance enabled
```

加工全体：

```text
completedByRecipe
legacyUnattributedCycles
lastCompleted
recentProductionHistory（最大20）
```

## 7.2 schema 9 → 10移行

既存の、

- machine input
- output
- activeCycle
- reservedInputs
- remainingMs
- selectedMode
- enabled
- completedCycles

をそのまま維持する。

### 初期計画

selectedModeが単品の場合：

```text
選択レシピ 1回分
他レシピ 0
```

selectedModeがautoの場合：

```text
各対応レシピ 1回分
```

ただし既存入力庫を計画へ合わせて変更しない。

計画を超える既存在庫は余剰として診断する。

### 過去のcompletedCycles

レシピ別内訳は推定しない。

```text
legacyUnattributedCycles[machine] = old completedCycles
completedByRecipe = 0
```

とする。

画面：

```text
旧バージョンでの製造 18回
v0.9.9以降 小麦粉 4回 / コーンミール 2回
```

と表示できる。

### activeCycle

進行中サイクルは、recipeId、remainingMs、durationMs、reservedInputsを完全に維持する。

計画対象外になっていても、ロード直後にキャンセルしない。現在のサイクルを完了してから新しい計画を適用する。

---

# 8. E2E

## A. 完成数

- 小麦粉4回分を設定
- 4回完了
- currentPlanCompleted=4
- completedByRecipe=4
- output小麦粉4
- 最後に完成が小麦粉

## B. 複数レシピ

- パン3、コーンブレッド2
- 自動モード
- 両方が計画どおり完了
- 固定順で一方だけ作り続けない

## C. 一括回収

- 小麦粉4、コーンミール3
- 持ち物空き5
- 一回で5個回収
- 残り2個
- 同じ領域で重複回収なし

## D. 倉庫移送

- 複数完成品を一回で倉庫へ
- 資源保存
- 一回のpriority save

## E. 計画完了停止

- 2回分
- 2回完了後、新規開始なし
- 完成品回収可能

## F. 繰り返し

- 2回分
- 2回完了後、次の2回へ移行
- 統計は累積

## G. schema移行

schema 9 snapshot：

- activeCycleあり
- input満杯
- outputあり
- completedCyclesあり

を読み、

- 資源量不変
- remainingMs不変
- legacy cycles保持
- 計画外素材を削除しない

ことを確認する。

## H. 表示

1920×1080、1440×900、844×390、390×844、320×568で、

- 完成品数
- 今回の計画
- 累計
- 最後に完成
- 回収ボタン

へ到達できる。

---

# 9. リリース

Phase 3で更新する。

```text
package.json 0.9.9
package-lock.json 0.9.9
GAME_VERSION 0.9.9
タイトル画面 v0.9.9
HUD v0.9.9
README
```

save schema：

```text
10
```

Git tagとGitHub Releaseは、PRマージ後にPages受入を完了してから作成する。
