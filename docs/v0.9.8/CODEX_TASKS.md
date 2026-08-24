# v0.9.8 Codex Tasks

各Phaseは、直前Phaseをmainへマージし、Pages受入後に、新しいCodexタスクとして開始します。

過去タスクのworktreeを再利用しません。

---

# Phase 1 Prompt

```text
Implement Hurry-Go-Round v0.9.8 Phase 1:
Dairy & Processing Supply.

Repository:
shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main branch.
Do not reuse the v0.9.7 task or an old worktree.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

The local branch name may be "work".
Confirm HEAD is the current GitHub main containing v0.9.7 and save schema 9.
If not, stop without modifying files.

Read:

- AGENTS.md
- README.md
- every file under docs/v0.9.8/
- docs/v0.9.3/PASTURE_AND_DAIRY.md
- docs/v0.9.3/DAIRY_LOGISTICS_AND_FUTURE_TRADE.md
- src/game/systems/DairySystem.ts
- src/game/logic/dairy.ts
- src/game/systems/ProcessingSystem.ts
- src/game/systems/ProcessingWorkerSystem.ts
- src/game/logic/processingWorkers.ts
- src/game/scenes/UIScene.ts
- src/game/state/GameState.ts
- src/game/persistence/
- existing E2E tests

Implement all requirements in:

docs/v0.9.8/PHASE_1_DAIRY_AND_PROCESSING_SUPPLY.md

Release constraints:

- keep package/game version 0.9.7
- keep save schema 9
- preserve all v0.9.7 saves and E2E tests
- do not implement Phase 2 or Phase 3

Release blockers:

1. Cow barn clearly shows the hay rack and milk tank.
2. Show the exact rule: 1 hay + 10 seconds = 1 milk per cow.
3. Show active cows, feeding wait, tank amount, rack amount, and next milk time.
4. Add a responsive dairy panel.
5. Add atomic cargo-to-hay-rack, barn-to-hay-rack, milk-to-cargo, and milk-to-barn transactions.
6. Connect the existing dairyWorker and workshopWorker state to real runtime automation.
7. Add dairy/workshop staff hire and training with authoritative costs and capacities.
8. Add real mill-operator and baker hire/train controls.
9. Use authoritative processing-worker costs and capacities.
10. Add recipe-aware one-cycle refill from barn and batch output-to-barn.
11. Keep the panel open after commands and show structured results.
12. No one-item long-distance staff loops.
13. No resource loss or duplication.
14. Persist every existing worker/facility state exactly once.

E2E setup may seed coins, unlocks, and inventory.
It must not directly hire/train workers or execute the facility command under test.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Create one focused PR titled similar to:

Complete v0.9.8 Phase 1 dairy and processing supply

If E2E fails, update the same PR and task.
Do not create a replacement PR.

Report:
- starting SHA
- files changed
- dairy facility registry
- hay/milk batch transactions
- worker costs/capacities
- warehouse refill behavior
- E2E scenarios/results
- skipped/flaky count
- manual Pages checks
```

---

# Phase 2 Prompt

```text
Implement Hurry-Go-Round v0.9.8 Phase 2:
Atomic Storage & Collection Construction.

Start a new Codex task from the true latest main after Phase 1 is merged.

Before editing, verify HEAD, status, and recent log.
Read AGENTS.md and every file under docs/v0.9.8/.

Implement all requirements in:

docs/v0.9.8/PHASE_2_ATOMIC_STORAGE_AND_COLLECTION.md

Constraints:

- keep public version 0.9.7
- keep save schema 9
- preserve Phase 1
- do not implement Phase 3

Required:

1. Replace one-item barn unload with one atomic all-cargo transaction.
2. Add per-resource breakdown and bounded visual feedback.
3. Add armed/re-entry behavior to prevent repeated unload.
4. Replace collection-box one-item deposit with atomic batch deposit.
5. Replace collection-box one-item withdraw with capacity-limited batch withdraw.
6. Use independent station armed state.
7. Check collection-facility availability before construction progress begins.
8. Locked, insufficient-coins, and built facilities must not spin progress.
9. Available facilities progress once and charge once.
10. Re-evaluate only after leaving, state change, or facility change.
11. World and panel construction must share one pure transaction.
12. Preserve all resources and save once per command.

Add unit and browser E2E for:
- mixed cargo to barn
- partial box deposit
- partial box withdraw
- locked hub no progress
- insufficient coins no progress
- successful hub one charge
- no duplicate action while standing
- save/reload

Do not solve by reducing assertions, using retries, or calling command functions directly from Playwright UI acceptance tests.

Run all standard checks plus repeat-each=2.

Create one focused PR titled similar to:

Complete v0.9.8 Phase 2 atomic storage and collection construction
```

---

# Phase 3 Prompt

```text
Implement Hurry-Go-Round v0.9.8 Phase 3:
Dynamic Wheat Field, Transport Recovery & Final Release.

Start a new Codex task from the true latest main after Phase 2 is merged.

Read AGENTS.md and every file under docs/v0.9.8/.

Implement all requirements in:

docs/v0.9.8/PHASE_3_WHEAT_VIEW_AND_TRANSPORT_RECOVERY.md
docs/v0.9.8/PERSISTENCE_AND_COMPATIBILITY.md
docs/v0.9.8/FINAL_ACCEPTANCE.md

Required:

1. Separate dynamic wheat graphics from static terrain.
2. Redraw soil, furrows, planned strips, and fence for level 0/1/2.
3. Derive visual bounds from active nodes and visual margins.
4. Ensure all 30/42/54 crop visuals are inside the matching active plot.
5. Redraw immediately after purchase and load.
6. Use trained transporter parameters: capacity 6/8/10.
7. Check departure before attempting another load.
8. Add atomic batch load from field crate.
9. Add atomic batch unload to barn.
10. Recover legacy over-capacity cargo without dropping wheat.
11. Never require the player to empty the crate to unstick the worker.
12. Add fixed-step E2E for full crate, partial batch, Lv1/2/3, and legacy cargo.
13. Preserve resource totals.
14. Update public version to 0.9.8 while keeping schema 9.
15. Update package, lockfile, title, HUD, and README.
16. Preserve all previous E2E scenarios.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required result:
- no failures
- no retries
- no skipped tests
- no flaky tests
- no console errors

Create one focused PR titled similar to:

Complete v0.9.8 dynamic wheat field and transport recovery

Do not create a tag or GitHub Release.
Tag v0.9.8 only after merged Pages acceptance.
```
