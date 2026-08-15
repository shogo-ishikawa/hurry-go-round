# Hurry-Go-Round v0.9.1
## Training Lodge & Collection Network

対象リポジトリ：

```text
shogo-ishikawa/hurry-go-round
```

本仕様は、v0.9.0 `Processing Yard & Production Planning` の実装後に行う増分更新です。

v0.9.0で追加した加工場、製粉機、ベーカリー、小麦粉、コーンミール、パン、コーンブレッド、生産方針、契約、IndexedDBセーブを維持したまま、次の三点を改善します。

1. 公開UIの「背負い籠」という不自然な名称を、文脈に応じた自然な日本語へ変更する
2. 麦畑と重なっている中央の研修・運営施設を撤去し、独立した「研修小屋」へ移す
3. 収穫物を加工場まで手作業で運ばなくてもよい「集配ネットワーク」を追加する

この更新では新しい作物、動物、レシピ、加工品を追加しません。v0.9.0で増えた生産チェーンを、無理なく運用できるようにする品質改善と物流自動化が中心です。

---

# 0. 作業開始前の必須確認

この実装は、過去のCodexタスクを継続せず、新しいCodexタスクとして開始してください。

仕様書作成時点の最新`main`は次です。

```text
4cc18949cbb5ee996941c6ffc34d5af92904206f
```

ファイルを変更する前に、次を実行してください。

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

`HEAD`がGitHub上の真の最新`main`と一致しない場合は、ファイルを変更せず停止してください。

次の既存ファイルを再生成しないでください。

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
tsconfig.json
既存のv0.1.0〜v0.9.0仕様書
既存の永続化・契約・加工システム
```

PRが既存プロジェクト全体の再追加に見える場合は、古いworktreeを使っているため、PRを作成せず停止してください。

---

# 1. マイルストーン

実装するバージョン：

```text
Hurry-Go-Round v0.9.1
Training Lodge & Collection Network
```

v0.9.0までの次の機能をすべて維持します。

- 麦・とうもろこし・たまごの生産
- とうもろこし畑の二段階拡張
- 養鶏
- 7資源の倉庫・市場・契約
- 混載可能なプレイヤー所持品
- 麦・とうもろこし・養鶏の自動化
- 加工場、製粉機、ベーカリー
- 小麦粉、コーンミール、パン、コーンブレッド
- 製粉スタッフと製パンスタッフ
- 生産方針と原料保護量
- 顧客の忍耐時間と離脱
- 出荷契約と評判
- IndexedDB保存、backup復旧、JSON入出力
- schema 1〜3のmigration
- PC・スマートフォンの移動操作
- GitHub Pages公開

v0.9.1では次を追加・修正します。

- 公開UIの名称整理
- 「持ち物」「運搬かご」「持てる数」の文脈別表記
- 麦畑上の運営所を撤去
- 西側の空き地へ独立した研修小屋を建設
- 全スタッフの雇用・研修を研修小屋へ集約
- 集配所の建設
- 麦畑・とうもろこし畑・鶏小屋の集配ポイント
- 加工場受入ボックス
- 集配スタッフ
- 一個ずつ往復しないバッチ集配送
- 倉庫・加工場への配送先制御
- 加工場の入力不足を考慮した自動仕分け
- schema 3からschema 4へのセーブ移行
- 施設重なり、在庫保存、長時間稼働の自動テスト

---

# 2. 仕様書構成

```text
docs/v0.9.1/
├── README.md
├── TERMINOLOGY_AND_TRAINING_HUT.md
├── COLLECTION_NETWORK.md
├── PERSISTENCE_AND_MIGRATION.md
└── VALIDATION.md
```

各ファイルをすべて読んでから実装してください。

---

# 3. 必須範囲

## 必須実装

1. 公開UIから現在形の「背負い籠」を廃止
2. HUD見出しを「持ち物」へ変更
3. 物理設備と強化名称を「運搬かご」へ変更
4. 麦畑と重なる`operations-office`の撤去
5. 独立した研修小屋の建設
6. 研修小屋の施設・操作・看板登録
7. 全スタッフの一覧、雇用、研修
8. 加工スタッフと集配スタッフを含む管理画面
9. 集配所の購入
10. 麦・とうもろこし・鶏小屋の集配ポイント
11. 加工場受入ボックス
12. 集配スタッフの雇用
13. 集配スタッフのLv1〜Lv3研修
14. バッチ積込・運搬・荷下ろし
15. 配送先の自動判定
16. 倉庫へのfallback
17. 箱・スタッフ・機械buffer間の資源不変条件
18. 日本語案内と視覚的な積載表示
19. schema 4の保存・validation・migration
20. READMEとART_DIRECTIONの更新
21. 自動テストと手動受入試験

## 明示的に対象外

- 新しい作物
- 新しい動物
- 新しいレシピ
- 新しい加工品
- 車両
- 複数の集配スタッフ
- リアルタイム道路交通
- 汎用経路探索
- 経路探索ライブラリ
- 実通貨による課金
- 広告
- クラウドセーブ
- アカウント
- マルチプレイ
- オフライン生産

本仕様における「購入」「料金」「コイン」は、すべてゲーム内コインです。現実の決済機能を追加しないでください。

---

# 4. バージョン更新

次を`0.9.1`へ更新してください。

```text
package.json
package-lock.json
GAME_VERSION
README.md
```

作成：

```text
docs/V0.9.1_SPEC.md
```

更新：

```text
README.md
docs/ART_DIRECTION.md
src/game/config/localization.ts
```

過去バージョンの仕様書は履歴資料として維持し、文中の「背負い籠」を一括置換しないでください。現行README、現行UI、現行ヘルプ、v0.9.1仕様だけを新表記へ更新します。

---

# 5. 主要なゲームループ

v0.9.1の物流ループ：

```text
プレイヤーまたは既存スタッフが資源を生産
→ 生産区画の集配ポイントへ預ける
→ 集配スタッフが有用な量までまとめて積み込む
→ 加工場受入ボックスまたは倉庫へ運ぶ
→ 自動仕分けで製粉機・ベーカリーへ供給
→ 加工スタッフが既存の生産サイクルを継続
```

プレイヤーは従来どおり自分で倉庫・加工場へ運べます。集配ネットワークは便利機能であり、手動操作を禁止しません。

---

# 6. Codexへ渡す短い起動指示

この仕様書PRを`main`へマージした後、新しいCodexタスクへ次を貼り付けてください。

```text
Implement Hurry-Go-Round v0.9.1 as an incremental update to the latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.9.1/.
3. Read README.md, docs/V0.9.0_SPEC.md, docs/ART_DIRECTION.md, docs/v0.9.0/, and the current implementation/tests.
4. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
5. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement every required item in docs/v0.9.1/, including the public terminology cleanup, relocation of the overlapping operations/training facility into a dedicated training lodge, the collection hub, local collection points, processing intake box, batched collection courier, routing/fallback rules, schema-4 persistence migration, and all required tests.

Preserve all working v0.9.0 processing, recipes, workers, contracts, saves, controls, and the GitHub Pages base path /hurry-go-round/.

Do not recreate the project, CI, Pages workflows, AGENTS.md, Vite configuration, persistence subsystem, contract subsystem, processing subsystem, or previous specifications.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build

Review the complete diff and create a focused pull request. If existing project files appear as newly added instead of incrementally modified, stop without creating the pull request.
```
