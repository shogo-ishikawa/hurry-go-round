# v0.9.9 Codex Tasks

各Phaseは、直前Phaseをmainへmergeし、Pages確認後、**最新mainから新しいCodexタスク**として開始する。

同じCodexタスクで次Phaseへ進まない。

---

# Phase 1 Prompt

```text
Implement Hurry-Go-Round v0.9.9 Phase 1:
Recipe Book & Production Plan.

Repository:
shogo-ishikawa/hurry-go-round

Start a new Codex task from the latest main branch.
The latest main must already contain the merged v0.9.8 Phase 3 release.
Do not use an old worktree.
Do not implement Phase 2 or Phase 3.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

The local branch name may be work.
Confirm package/game version 0.9.8 and save schema 9.
If main does not contain v0.9.8, stop.

Read:

- AGENTS.md
- README.md
- every file under docs/v0.9.9/
- src/game/logic/processing.ts
- src/game/logic/processingViewModel.ts
- src/game/logic/processingWorkers.ts
- src/game/systems/ProcessingSystem.ts
- src/game/systems/ProcessingFacilityView.ts
- src/game/systems/ProcessingWorkerSystem.ts
- src/game/scenes/UIScene.ts
- src/game/scenes/ModalButton.ts
- src/game/logic/facilities.ts
- src/game/state/GameState.ts
- src/game/persistence/
- existing processing E2E tests

Requirements:

1. Use RECIPES as the only source for formula, output, and duration.

2. Preserve current recipes exactly:
   - wheat 2 -> flour 1, 3500 ms
   - corn 2 -> cornmeal 1, 4200 ms
   - flour 1 + egg 1 -> bread 1, 5500 ms
   - flour 1 + cornmeal 1 + egg 1 -> cornbread 1, 7500 ms

3. Add machine-local interactions:
   - open mill recipe/plan
   - open bakery recipe/plan
   These must not overlap build, input, output, or control-board interactions.

4. Reorganize processing UI into:
   - overview
   - recipe book
   - mill
   - bakery
   - finished goods
   - staff

5. Add recipe cards showing:
   - icons/names
   - exact inputs
   - exact output
   - base duration
   - current level duration
   - cargo quantity
   - barn quantity
   - machine input
   - craftable cycles
   - missing ingredients
   - use-this-recipe button

6. Add a reusable accessible discrete slider/stepper.
   It must support:
   - mouse drag
   - tap
   - +/- buttons
   - Left/Right
   - Home/End
   - at least 44 CSS pixel targets

7. The player selects target cycles 0..10 for each recipe.

8. Calculate target input resources from recipe cycles.

9. Reject a change if summed targets exceed machine input capacity.
   Do not silently lower another recipe.

10. Show:
    - target cycles
    - target inputs
    - target total / capacity
    - remaining configurable capacity

11. In auto mode, recipes with target 0 are not candidates.

12. Add a quick status at each input station:
    - plan
    - target
    - current
    - deficit

13. Keep public version 0.9.8 and save schema 9 in Phase 1.
    If plan state cannot yet be persisted without schema 10, keep it behind a
    deterministic runtime-compatible feature state and complete persistence in
    Phase 3. Do not corrupt existing saves.

14. Add pure functions:
    - calculateRecipePlanTargets
    - getMaximumCyclesForRecipe
    - setRecipeTargetCycles
    - getCraftableCycles
    - createProcessingPlanViewModel

15. Add unit tests and E2E for:
    - all formulas
    - plan calculations
    - capacity rejection
    - machine-local menu opening
    - slider mouse/touch/keyboard
    - all supported viewports

16. Preserve all existing E2E tests.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required:
- no skipped tests
- no flaky tests
- retry 0
- no console errors

Create one focused PR titled similar to:
Complete v0.9.9 Phase 1 recipe book and production plan

Do not bump to 0.9.9 yet.
```

---

# Phase 2 Prompt

```text
Implement Hurry-Go-Round v0.9.9 Phase 2:
Smart Input & Buffer Recovery.

Start a new Codex task from the latest main after Phase 1 is merged.
Do not use the Phase 1 worktree.
Do not implement the final version/schema migration yet.

Before editing, verify latest main, clean status, version 0.9.8, schema 9,
and presence of the Phase 1 recipe planner.

Read every file under docs/v0.9.9 and inspect all processing runtime, worker,
UI, save, and test files.

Requirements:

1. Connect Phase 1 recipe targets to real runtime.

2. On entering a machine input station, transfer the entire available deficit
   from cargo in one atomic transaction.

3. Never transfer above the plan target.

4. While the player remains in the input zone, re-fill once when a new
   production cycle consumes inputs and a new deficit appears.

5. Do not execute every frame. Use deterministic state signatures and armed
   semantics.

6. Add supply modes:
   - cargo-first
   - barn-first
   - cargo-only
   - barn-only

7. Add an explicit button to fill from barn to plan target.

8. Partial fill is allowed. Report exact moved resources and remaining deficit.

9. Add a pure buffer diagnosis with:
   - target
   - current
   - reserved
   - deficit
   - excess
   - capacity
   - free capacity
   - can-start
   - blocked reason

10. Distinguish:
    - missing input
    - wrong-mix full input
    - output full
    - stopped
    - not built
    - plan zero

11. Add:
    - align input to plan
    - return all waiting input to barn

12. Align-to-plan atomically:
    - returns excess to barn
    - fills deficits from allowed source
    - preserves every resource

13. Never alter active-cycle reserved inputs.

14. Update processing workers to use the same plan and diagnosis.

15. Worker priority:
    - unload output
    - return excess
    - fill plan deficit
    - wait

16. Use authoritative capacities:
    - mill worker 8 / 12 / 16
    - baker 6 / 9 / 12

17. Workers may carry multiple relevant resources in one batch.

18. Add atomic pure functions:
    - transferCargoToProcessingTargets
    - transferBarnToProcessingTargets
    - returnProcessingExcessToBarn
    - rebalanceProcessingInput
    - emptyProcessingInputToBarn
    - diagnoseProcessingBuffer
    - selectPlannedRecipe

19. Fix the confirmed deadlocks:

    Bakery case:
    input flour 18, egg 0, bread target 4, barn egg 4.
    Aligning must return flour 14, add egg 4, and start bread.

    Mill case:
    input corn 24, flour target 4 cycles, barn wheat 8.
    Aligning must return excess corn, add wheat 8, and start flour.

20. Every atomic action emits one state update and at most one priority save.

21. Preserve public version 0.9.8 and schema 9 in Phase 2.

22. Add deterministic browser E2E for cargo refill, re-fill after consumption,
    barn fill, wrong-mix recovery, output-full distinction, and worker batches.

Run all standard gates and repeat-each=2 with retry 0.

Create one focused PR titled similar to:
Complete v0.9.9 Phase 2 smart processing input and recovery
```

---

# Phase 3 Prompt

```text
Implement Hurry-Go-Round v0.9.9 Phase 3:
Production Ledger, Persistence & Final Release.

Start a new Codex task from latest main after Phase 2 is merged.
Do not use an older worktree.

Verify Phase 1 and 2 are present.

Requirements:

1. Add per-recipe completed counts.

2. Add current-plan completed counts.

3. Add last-completed record and bounded recent history (max 20).

4. Add finished-goods page showing:
   - current output buffer
   - current plan progress
   - per-recipe total
   - legacy unattributed cycles
   - last completion
   - recent history

5. Add clear world status for:
   - processing
   - missing input
   - wrong mix
   - output full
   - plan complete

6. Make output pickup atomic up to cargo capacity.

7. Add atomic move-all-output-to-barn.

8. Add completion modes:
   - repeat
   - stop-on-complete

9. In auto mode, planned recipes must progress fairly.

10. Bump save schema 9 -> 10.

11. Persist:
    - recipe target cycles
    - current-plan progress
    - completion mode
    - supply mode
    - auto balance
    - per-recipe stats
    - legacy unattributed cycles
    - last completion
    - recent history

12. Migrate schema 9 deterministically:
    - selected recipe => one target cycle
    - auto => one target cycle for each machine recipe
    - preserve input/output/active cycle/reserved/remaining time
    - do not modify or delete existing input
    - old completedCycles become legacyUnattributedCycles

13. Preserve save recovery, backup, and JSON import/export.

14. Update public version to 0.9.9:
    - package.json
    - package-lock.json
    - GAME_VERSION
    - title screen
    - HUD
    - README

15. Add E2E for:
    - per-recipe counts
    - mixed auto plan fairness
    - output atomic pickup
    - output to barn
    - repeat mode
    - stop-on-complete
    - schema 9 migration
    - save/reload mid-cycle
    - all supported viewports

16. Preserve all existing tests.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required:
- all pass first attempt
- skipped 0
- flaky 0
- console errors 0

Create one focused PR titled similar to:
Complete v0.9.9 processing planner and final release

Do not create a tag or GitHub Release. Those are created after merged Pages
acceptance.
```
