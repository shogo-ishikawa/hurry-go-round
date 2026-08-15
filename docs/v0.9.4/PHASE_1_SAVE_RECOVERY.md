# Phase 1 — Save Recovery

## 1. 目的

Phase 1では、保存を実機で確実に成立させます。

完了条件は次です。

```text
ゲーム開始
→ 今すぐ保存
→ 保存成功表示
→ ページ再読み込み
→ タイトル画面に「つづきから」
→ 保存時の状態へ復元
```

このPhaseが完了するまで、加工場・集配・酪農のランタイム実装へ進みません。

## 2. バージョンとPR

推奨ブランチ：

```text
codex/v0.9.4-save-recovery
```

推奨PRタイトル：

```text
Fix v0.9.4 save validation, recovery, and browser persistence
```

このPRでは新しい農場機能を実装しません。

## 3. スナップショット正規化

### 3.1 保存境界を一つにする

次の純粋関数を作成します。

```ts
normalizePersistedSnapshot(
  snapshot: PersistedGameSnapshot,
): PersistedGameSnapshot;
```

保存するすべてのスナップショットは、checksum生成・validation・書込の前にこの関数を通します。

### 3.2 整数であるべき値

次は、非負整数へ正規化します。

```text
資源数
コイン
容量
販売数
顧客数
スタッフ積載数
レベル
契約必要数
契約納品数
機械completedCycles
saveSequence
round-robin index
```

正規化：

```ts
Math.max(0, Math.floor(value))
```

ただし、不正な`NaN`や`Infinity`を黙って0へ直してはいけません。

非有限値はvalidation errorにします。

### 3.3 時間値

次は、非負有限数として扱います。

```text
playTimeMs
crop.remainingMs
livestock.eggRemainingMs
processing.activeCycle.remainingMs
processing.activeCycle.durationMs
collection courier waitMs
collection sourceAgesMs
dairy cow productionRemainingMs
dairy cycle remainingMs
dairy cycle durationMs
将来追加されるruntime残り時間
```

保存時は、比較と再現性のため整数ミリ秒へ丸めます。

```ts
Math.max(0, Math.round(value))
```

validationは、保存境界外から入るimportも考慮し、非負整数を要求して構いません。

重要なのは、実ランタイム値を先に正規化することです。

### 3.4 Crop snapshot

現在の、

```ts
regrowMs - elapsedMs
```

を直接保存しません。

```ts
remainingMs: normalizeDurationMs(regrowMs - elapsedMs)
```

とします。

麦だけでなく、とうもろこし、将来の牧草も同じsnapshot registryへ統合できる形にします。

## 4. Validationの修正

### 4.1 関数を分離

```ts
finiteNonNegativeInteger(...)
finitePositiveInteger(...)
finiteNonNegativeNumber(...)
finitePositiveNumber(...)
```

用途を混同しません。

### 4.2 エラーを構造化

文字列だけではなく、少なくとも内部的には次の形を使います。

```ts
interface SaveValidationIssue {
  path: string;
  code: string;
  message: string;
  received?: unknown;
}
```

例：

```text
payload.crops[3].remainingMs
NON_INTEGER_DURATION
```

ユーザー画面では簡潔な日本語へ変換します。

### 4.3 実ランタイムfixture

手作りの整数fixtureだけでなく、次を含むfixtureを作ります。

```text
小数deltaを経た作物
稼働中製粉機
稼働中ベーカリー
集配スタッフの待機時間
牛乳生産中の牛
乳製品加工中cycle
```

正規化前は小数、正規化後は有効なsaveになることをテストします。

## 5. SaveServiceの書込順序

現在の「書いてから検証」を廃止します。

必須順序：

```text
1. runtime snapshot取得
2. normalizePersistedSnapshot
3. envelope作成
4. checksum作成
5. pre-write validation
6. 現在のvalid primaryを読み込む
7. valid primaryをbackupへ保存
8. 新envelopeをprimaryへ保存
9. primaryを読み戻す
10. post-write validation
11. 失敗時は直前のvalid primaryをprimaryへ復元
12. 成功結果を返す
```

### 5.1 invalid primaryを残さない

post-write validationに失敗した場合、無効なprimaryを残しません。

直前のvalid primaryがある場合：

```text
old primaryをprimaryへ復旧
```

ない場合：

```text
invalid primaryを削除
```

### 5.2 backup rotation

backupへ移すのはvalid primaryだけです。

無効なprimaryをbackupへコピーしません。

## 6. Save Coordinator

`main.ts`に保存状態を集中させ続けず、次の責務を分離します。

```text
SaveCoordinator
AppController
```

### 6.1 revision管理

状態変更ごとに、

```ts
stateRevision += 1;
```

保存開始時に、

```ts
savingRevision = stateRevision;
```

成功時、

```text
stateRevision === savingRevision
→ 保存済み

stateRevision > savingRevision
→ 追加保存を実行
```

とします。

単純なbooleanだけで、保存中の変更を取りこぼさないようにします。

### 6.2 saveSequence

```text
nextSequence = currentSequence + 1
```

をsnapshotへ入れ、保存成功後にだけ、

```text
currentSequence = nextSequence
```

とします。

保存失敗でsequenceだけ増やしません。

### 6.3 保存要求の種類

```ts
type SaveRequestReason =
  | "manual"
  | "autosave"
  | "priority"
  | "visibility-hidden"
  | "pagehide"
  | "before-title";
```

ログとUIに理由を残します。

## 7. Repositoryの堅牢化

### 7.1 IndexedDB

`IndexedDbSaveRepository`へ次を追加します。

```text
open timeout
onblocked
onversionchange
transaction.onabort
transaction.onerror詳細
DB close/reopen
availability probe
```

### 7.2 fallback repository

次を実装します。

```text
LocalStorageSaveRepository
ResilientSaveRepository
```

`ResilientSaveRepository`は、起動時にIndexedDBを自己診断します。

```text
IndexedDB利用可
→ IndexedDBを使用

IndexedDB利用不可
→ localStorage fallback
```

fallbackは、primary、backup、settings、emergencyを別キーで保持します。

推奨キー：

```text
hurry-go-round:save:primary
hurry-go-round:save:backup
hurry-go-round:save:emergency
hurry-go-round:settings
```

### 7.3 storage種別を表示

管理画面に次を表示します。

```text
保存先：IndexedDB
```

または、

```text
保存先：簡易保存
```

fallback使用時は、JSON書き出しを推奨します。

## 8. Emergency save

`pagehide`では非同期IndexedDB完了が保証されません。

次を実装します。

```text
最新の正規化snapshotをlocalStorage emergencyへ同期保存
```

emergency保存は、primaryの代替ではありません。

起動時に、

```text
primaryなし
backupなし
emergencyあり
```

なら、復旧候補として表示します。

## 9. 保存UI

### 9.1 管理画面内表示

「今すぐ保存」ボタンの近くに、次を表示します。

```text
保存中…
保存しました 18:42:10
保存に失敗しました
```

背景HUDだけに表示しません。

### 9.2 詳細エラー

保存失敗時：

```text
保存に失敗しました
原因：作物の残り時間が不正です
```

一般ユーザーには簡潔に表示し、開発者向け詳細はconsoleへ出します。

### 9.3 保存診断

設定または管理画面へ、

```text
保存機能を確認
```

を追加します。

診断手順：

```text
1. 現在状態をsnapshot化
2. normalize
3. validate
4. 一時診断キーへ書込
5. 読戻し
6. checksum/validation
7. 一時キー削除
```

成功：

```text
保存機能は正常です
保存先：IndexedDB
```

失敗：

```text
保存機能を利用できません
JSON書き出しを使用してください
```

## 10. Browser E2E

単体テストだけではPhase 1完了としません。

### 10.1 Playwright導入

このE2Eは保存の重大不具合を防ぐために必要なので、`@playwright/test`の追加を許可します。

追加例：

```text
playwright.config.ts
tests/e2e/save-and-continue.spec.ts
.github/workflows/e2e.yml
```

Chromiumだけで構いません。

### 10.2 test-only API

canvas操作を安定させるため、E2Eビルドでのみ次を公開して構いません。

```ts
window.__HGR_E2E__
```

条件：

```text
VITE_E2E=1のときだけ有効
本番Pages buildには含めない
```

許可する操作：

```text
getStateSummary()
requestSave()
waitForSave()
getSaveBackend()
getLastSaveError()
```

ゲーム状態を直接成功状態へ書き換えるcheat APIはPhase 1では不要です。

### 10.3 必須E2E

```text
1. タイトル画面で新規ゲーム開始
2. 保存要求
3. 保存成功を待つ
4. ページ再読み込み
5. 「つづきから」が表示される
6. つづきから開始
7. saveSequenceが維持される
8. 再度保存
9. primaryとbackupが存在する
```

追加：

```text
IndexedDB primary破損
→ backupから復旧
```

```text
IndexedDB利用不可を模擬
→ localStorage fallback
```

## 11. Unit tests

最低限：

- 小数crop timeを正規化
- 小数machine remainingを正規化
- 小数courier waitを正規化
- 小数cow timeを正規化
- invalid finite valueを拒否
- pre-write validation失敗でwriteしない
- post-write validation失敗でold primaryを復旧
- backupへinvalid primaryを入れない
- sequenceは成功後だけ増える
- 保存中変更を2回目保存で回収
- IndexedDB failureでfallback
- emergency復旧

## 12. Phase 1の完了条件

次がすべて満たされるまでPRをReadyにしません。

```text
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
```

GitHub Actionsで、

```text
CI: success
E2E: success
```

が必要です。

PR本文に、E2E実行結果と保存backendを記載します。
