# v0.9.4 Final Acceptance

## 1. 目的

この文書は、v0.9.4を「実装済み」と判断するための最終ゲートです。

単体テストとbuild成功だけでは、リリース完了としません。

## 2. 必須チェック

各Phaseで、次を実行します。

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test
npm run build
npm run e2e
```

最終PRでは、GitHub Actions上で次が必要です。

```text
CI: success
E2E Chromium: success
Pages build: success
```

## 3. Implementation Matrix

PR本文へ次の表を記載します。

| Feature | State | Logic | Runtime | Interaction | Presentation | Save | E2E |
|---|---:|---:|---:|---:|---:|---:|---:|
| 保存 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 加工場 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 集配 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 酪農 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

空欄が一つでもある場合、正式リリースしません。

## 4. 保存受入試験

### 4.1 新規ゲーム

```text
1. 新規ゲームを開始
2. 今すぐ保存
3. 「保存しました」を確認
4. ページ再読込
5. タイトルに「つづきから」
6. つづきから開始
7. 同じ所持金・在庫・土地状態
```

### 4.2 進行状態

次を含むsaveを作成します。

```text
東農地解放
鶏小屋解放
加工場建設
製粉機稼働中
集配スタッフ配送中
牧草地解放
牛乳生産中
乳製品加工中
進行中契約
```

保存→再読込後に、すべて維持されます。

### 4.3 Backup

```text
primaryを破損
→ backupから復旧
→ 日本語通知
→ 復旧後に再保存可能
```

### 4.4 Fallback

IndexedDB利用不可を模擬します。

```text
localStorage fallback
→ 保存
→ 再読込
→ つづきから
```

### 4.5 Failure visibility

validationを意図的に失敗させます。

```text
保存失敗
→ UIに失敗表示
→ consoleにpath/code
→ 直前primaryは維持
→ JSON書き出し導線
```

## 5. 加工場受入試験

```text
1. 東農地・鶏小屋解放
2. 次の目標表示
3. 加工場予定地へ案内
4. 条件と価格が見える
5. 加工場購入
6. 製粉機建設
7. 麦2を搬入
8. 小麦粉1完成
9. 回収
10. とうもろこし2を搬入
11. コーンミール1完成
12. ベーカリー建設
13. 小麦粉1＋卵1を搬入
14. パン1完成
15. コーンブレッド完成
16. 市場へ補充
17. 顧客が購入
18. 契約へ納品
```

確認：

- 原料二重消費なし
- 出力二重生成なし
- buffer負数なし
- output満杯で停止
- 空きができると再開

## 6. 集配受入試験

```text
1. 集配所建設
2. 麦箱建設
3. 東農地箱建設
4. 鶏小屋箱建設
5. 各商品を預ける
6. 集配スタッフ雇用
7. 1個ではなくbatch積載
8. 道路を移動
9. 加工場へ配送
10. 受入箱満杯にする
11. 倉庫fallback
12. モードを倉庫優先へ変更
13. 倉庫へ配送
```

確認：

- box負数なし
- courier capacity超過なし
- source公平性
- 永久停止なし
- destination変更で資源消失なし

## 7. 酪農受入試験

```text
1. 牧草地購入
2. 24ノード表示
3. 干し草収穫
4. 牧草地拡張
5. 牛舎建設
6. 牛1頭表示
7. 2頭目・3頭目購入
8. 干し草台へ給餌
9. 牛乳生産
10. ミルクタンク満杯
11. readyMilk保持
12. 牛乳回収
13. 乳製品工房建設
14. バター生産
15. チーズ生産
16. 酪農スタッフ雇用
17. 乳製品スタッフ雇用
18. batch運搬
19. 市場販売
20. 契約納品
```

確認：

- 干し草負数なし
- 牛乳二重生成なし
- タンク満杯で消失なし
- 保護牛乳を加工しない
- staff一個往復なし

## 8. Cross-System Test

全システムを同時に稼働します。

```text
麦自動化
とうもろこし自動化
養鶏自動化
加工場
集配
酪農
市場
契約
```

30分相当の加速シミュレーションで、資源不変条件を確認します。

### 8.1 資源不変条件

収穫・生産・販売・加工変換以外の移送は、資源総量を保存します。

#### 麦

```text
player
+ wheat crate
+ worker cargo
+ collection box
+ courier
+ processing intake
+ mill input
+ active reserved
+ barn
+ market
+ contract delivered
```

#### とうもろこし

上記に加え、

```text
chicken feed
```

を含めます。

卵生産時だけ、

```text
とうもろこし -1
たまご +1
```

です。

#### 牛乳

```text
cow readyMilk
+ milk tank
+ player
+ dairy worker
+ collection boxes
+ courier
+ workshop input
+ active reserved
+ barn
+ market
+ contract delivered
```

バター・チーズ加工時だけ、レシピどおりに変換します。

## 9. Responsive Test

必須viewport：

```text
1920 × 1080
1440 × 900
1024 × 768
844 × 390
390 × 844
320 × 568
```

確認：

- HUDが画面外へ出ない
- ジョイスティックと重ならない
- 管理ボタンが押せる
- 看板が重ならない
- Interaction範囲が見える
- 加工場パネルがスクロール可能
- 集配パネルがスクロール可能
- 酪農パネルがスクロール可能
- 日本語が切れない
- canvas外背景が見えない

## 10. Manual Pages Test

GitHub Pagesの実URLで、PCとスマートフォンから確認します。

```text
https://shogo-ishikawa.github.io/hurry-go-round/
```

### PC

- Chrome
- キーボード
- クリック移動
- ドラッグ方向移動
- 保存・再読込

### スマートフォン

- タッチジョイスティック
- タップ移動
- ドラッグ方向移動
- 縦向き
- 横向き
- 保存・再読込

## 11. Console / Network

必須：

```text
console error: 0
unhandled rejection: 0
404 asset: 0
runtime external request: 0
```

## 12. PR Diff Gate

各PhaseのPRで、次を確認します。

```text
既存プロジェクト全体を再生成していない
CI/Pagesを理由なく再作成していない
過去仕様書を変更していない
無関係な整形をしていない
古いcarry-and-thrive pathを戻していない
```

## 13. README Gate

READMEへ利用可能と書く機能は、E2Eが通ったものだけです。

実装途中の機能は、

```text
開発中
```

または、記載しません。

## 14. Release Checklist

```text
[ ] Phase 1 merged
[ ] Phase 2 merged
[ ] Phase 3 merged
[ ] Phase 4 merged
[ ] all unit tests pass
[ ] all browser E2E pass
[ ] Pages manual test pass
[ ] PC save/continue pass
[ ] mobile save/continue pass
[ ] processing pass
[ ] collection pass
[ ] dairy pass
[ ] version set to 0.9.4
[ ] README updated from actual behavior
[ ] release tag created after verification
```
