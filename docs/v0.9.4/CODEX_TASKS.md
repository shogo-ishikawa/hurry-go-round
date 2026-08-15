# v0.9.4 Codex Tasks

## 1. 運用ルール

v0.9.4を一つのCodexタスクへ貼り付けてはいけません。

次の4タスクを順番に実行します。

```text
Task 1 → PR → mainへマージ
Task 2 → 新しいCodex task → PR → mainへマージ
Task 3 → 新しいCodex task → PR → mainへマージ
Task 4 → 新しいCodex task → PR → mainへマージ
```

各タスク開始時に、以前のtaskの「続き」を使いません。

各タスクは`Repository: shogo-ishikawa/hurry-go-round`、`Branch: main`から開始します。

## 2. Task 1 — Save Recovery

Codexへ貼り付ける指示：

```text
Implement Phase 1 of Hurry-Go-Round v0.9.4 as an incremental update to the true latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read docs/v0.9.4/README.md.
3. Read docs/v0.9.4/ROOT_CAUSE.md.
4. Read docs/v0.9.4/PHASE_1_SAVE_RECOVERY.md.
5. Read docs/v0.9.4/FINAL_ACCEPTANCE.md only for the save-related gates.
6. Inspect the current persistence implementation, GameScene snapshot creation, main.ts lifecycle, tests, and GitHub workflows.
7. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
8. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement Phase 1 only.
Do not implement processing-yard facilities, collection runtime, pasture, cows, or dairy runtime in this task.

The task is incomplete unless all of the following work:
- runtime snapshot normalization
- pre-write and post-write validation
- rollback after failed writes
- primary/backup recovery
- IndexedDB diagnostics
- localStorage fallback
- visible save result and storage backend
- preserved saveSequence
- browser E2E for save, reload, and continue

Add a real Chromium E2E job because unit tests alone did not detect the current save failure.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

Create a focused draft pull request only if all checks pass. Include the exact runtime save bug found, tests added, browser E2E result, and any remaining limitation.

If browser E2E cannot run in the Codex container, still implement it and require the GitHub Actions E2E job to pass before the PR is ready. Do not report Phase 1 complete without a passing browser result.
```

## 3. Task 2 — Processing Runtime

Phase 1をmainへマージした後に使用します。

```text
Implement Phase 2 of Hurry-Go-Round v0.9.4 as an incremental update to the true latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read docs/v0.9.4/README.md.
3. Read docs/v0.9.4/ROOT_CAUSE.md.
4. Read docs/v0.9.4/PHASE_2_PROCESSING_RUNTIME.md.
5. Read the merged Phase 1 implementation and tests.
6. Inspect processing.ts, processing workers, GameState, facilities, GameScene, UIScene, persistence, market, contracts, and current E2E support.
7. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
8. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement Phase 2 only.
Do not implement collection courier runtime or dairy runtime in this task.

Existing pure processing logic is not enough. This task must add the complete runtime chain:
- visible processing-yard site and prerequisites
- actual yard purchase interaction
- grain-mill and bakery construction
- manual input and output interactions
- machine management panel
- real ProcessingSystem update lifecycle
- visible mill operator and baker with batched movement
- market and contract integration
- save/restore of active cycles and worker cargo
- browser E2E that purchases and uses the facilities

Use the implementation matrix in the specification. A feature is not complete unless State, Logic, Runtime, Interaction, Presentation, Save, and E2E are all complete.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

Create a focused draft pull request only if all checks pass. Do not describe processing as complete if the facilities cannot be purchased and operated in the browser.
```

## 4. Task 3 — Collection Runtime

Phase 2をmainへマージした後に使用します。

```text
Implement Phase 3 of Hurry-Go-Round v0.9.4 as an incremental update to the true latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read docs/v0.9.4/README.md.
3. Read docs/v0.9.4/ROOT_CAUSE.md.
4. Read docs/v0.9.4/PHASE_3_COLLECTION_RUNTIME.md.
5. Inspect the merged save and processing runtime implementations.
6. Inspect collectionNetwork.ts, facilities, GameState, GameScene, UIScene, persistence, routing, and E2E support.
7. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
8. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement Phase 3 only.
Do not implement pasture, cows, or dairy runtime in this task.

The existing collectionNetwork data model and pure functions are not a playable feature. Add:
- visible collection hub and boxes
- build interactions and exact prerequisites/costs
- player deposit and recovery interactions
- collection management panel
- courier hire and training
- visible courier entity, routes, cargo, batch loading, and unloading
- processing-intake integration
- deterministic barn fallback
- persistence and restart handling
- browser E2E that constructs, deposits, hires, transports, saves, and reloads

Do not move inventory remotely without the visible courier runtime.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

Create a focused draft pull request only if all checks pass. Do not report the collection network complete if the player cannot build and use it in the browser.
```

## 5. Task 4 — Dairy Runtime & Release

Phase 3をmainへマージした後に使用します。

```text
Implement Phase 4 of Hurry-Go-Round v0.9.4 as an incremental update to the true latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.9.4/.
3. Inspect the merged save, processing, and collection runtime implementations.
4. Inspect dairy.ts, resource metadata, market, contracts, facilities, scenes, persistence, migrations, and E2E support.
5. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
6. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement Phase 4 and the final v0.9.4 release gates.

The existing DairyState and dairy pure functions are not a playable dairy feature. Add:
- expanded world and visible pasture district
- pasture purchase and two expansions
- pasture nodes and hay harvesting
- cow barn construction and 1–3 visible cows
- hay rack, milk tank, manual feed, and milk collection
- dairy workshop construction and management
- butter and cheese production
- visible dairy worker and workshop worker with batched logistics
- collection-network extension for hay, milk, butter, and cheese
- market and contract gating through one unlocked-resource function
- schema migration and full save/restore
- browser E2E for the complete dairy loop
- final cross-system long-run acceptance

Do not add new crops, seasons, traders, meat, or decoration systems in this task.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

Run the final acceptance matrix in docs/v0.9.4/FINAL_ACCEPTANCE.md.
Only after all required tests and browser scenarios pass, set package, save GAME_VERSION, UI, and README to v0.9.4.

Create a focused draft pull request. The PR body must include the completed State/Logic/Runtime/Interaction/Presentation/Save/E2E matrix for save, processing, collection, and dairy.
```

## 6. 各PRのレビュー

各PRで、最低限次を確認します。

```text
changed files are incremental
no project reinitialization
no unrelated formatting rewrite
no old task worktree
no false README claims
unit tests pass
browser E2E pass
manual Pages checks remain clearly listed
```

## 7. マージ順

```text
Phase 1 PR
↓ merge
Phase 2 PR
↓ merge
Phase 3 PR
↓ merge
Phase 4 PR
↓ Pages manual verification
v0.9.4 tag/release
```

並列実装しません。
