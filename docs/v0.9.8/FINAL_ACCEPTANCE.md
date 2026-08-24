# v0.9.8 Final Acceptance

## 自動ゲート

各PRで必須です。

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2
```

必須結果:

- TypeScript成功
- unit tests全成功
- build成功
- E2E初回成功
- repeat-each=2全成功
- retries 0
- skipped 0
- flaky 0
- expected failure 0
- console error 0

## Phase 1受入

### 牛舎

- 干し草台とミルクタンクを見分けられる
- どこに立つか分かる
- 干し草1個・10秒・牛乳1個が表示される
- 何頭が稼働、餌待ちか分かる
- 干し草台とタンクの現在量・容量が分かる
- 次の牛乳時間が分かる
- タンク満杯、餌不足を表示

### 倉庫連携

- 倉庫の干し草を一回で干し草台へ補充
- ミルクタンクを一回で倉庫へ移送
- 手持ちとの一括入出力
- 他資源不変
- 保存復元

### スタッフ

- 製粉スタッフ450
- 製パンスタッフ700
- 酪農スタッフ650
- 乳製品スタッフ750
- 正確な研修費・容量
- 一回課金
- 最大レベルで課金なし
- UI操作後も画面を維持
- 実際に倉庫と施設間をbatch移動

### 加工

- 倉庫から1回分を補充
- 選択レシピに必要な原料だけ
- 完成品を一括で倉庫
- staff自動化と同じ純粋取引

## Phase 2受入

### 倉庫

- 11資源混載を一回で全納品
- 一回の状態更新
- 一回の保存要求
- 範囲内で二重実行なし
- 数量保存

### 集配

- 麦・とうもろこし・たまごを一括預入
- 空き容量まで一括取出
- station別armed
- 1個ずつの待ち時間なし

### 建設

- lockedでpercentageを回さない
- coins不足でpercentageを回さない
- availableで一周だけ
- 成功後二重課金なし
- panel建設とworld建設が同じ取引
- exact cost

## Phase 3受入

### 麦畑

- 30株と土・柵が一致
- 42株と土・柵が同時拡張
- 54株と土・柵が同時拡張
- 全crop visualが畑内
- 旧west畑なし
- load時levelに合う表示

### 麦運搬

- Lv1 6個
- Lv2 8個
- Lv3 10個
- crate満杯から自動出発
- crateを手動で空にしなくても動く
- legacy over-capacityから回復
- 一括積込・一括納品
- resource conservation
- 長時間停止なし

## Pages手動確認

対象:

```text
https://shogo-ishikawa.github.io/hurry-go-round/
```

PC:

- Chrome
- 1920×1080
- 1440×900

スマートフォン相当:

- 844×390
- 390×844
- 320×568

確認手順:

1. v0.9.7の既存saveからcontinue
2. 牛舎の干し草台とタンクを確認
3. 倉庫hayを牛舎へ補充
4. 牛乳を回収
5. 加工スタッフを雇用
6. 倉庫原料を機械へ補充
7. 集配所locked状態で進捗が回らないことを確認
8. 解放後に一回で建設
9. 混載持ち物を倉庫へ一括納品
10. 集配ボックスへ一括預入
11. 麦畑30→42→54で見た目が追従
12. 一時集荷箱を満杯にし、運搬スタッフが自律配送
13. 保存・再読込
14. version 0.9.8 / schema 9

## リリース

すべて通過後:

```text
tag: v0.9.8
Release title: Hurry-Go-Round v0.9.8
target: main
```

Release前にタグを作成しません。
