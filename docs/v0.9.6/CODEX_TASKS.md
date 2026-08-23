# v0.9.6 Codex Task Prompts

Use one new Codex task per phase. Merge the specification PR first. Do not paste the full specification into Codex; use the short phase prompt below so Codex reads the repository documents.

## Common operating rules

For every phase:

1. start from repository `shogo-ishikawa/hurry-go-round`, branch `main`;
2. use a new Codex task, not a previous task or worktree;
3. confirm all previous phase PRs are merged;
4. confirm the checked-out HEAD is the true latest `main`;
5. allow the local Codex branch name `work`;
6. do not edit before the HEAD check;
7. keep `main` frozen during implementation;
8. create one focused PR;
9. if CI/E2E fails, continue in the same task and update the same PR;
10. never create a replacement PR solely because a test failed;
11. do not merge with failing, skipped, flaky, retried, or missing required E2E;
12. verify the deployed Pages build before beginning the next phase.

Required commands for every phase:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2
```

## Phase 1 prompt

Start only after the v0.9.6 specification PR is merged.

```text
Implement Hurry-Go-Round v0.9.6 Phase 1:
Progression Transactions & Farm Buffers.

Repository:

shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main branch.
Do not continue a v0.9.5 task or use an old worktree.
The local branch name may be "work" and is acceptable.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm the latest main contains all files under docs/v0.9.6/.
If it does not, stop without modifying files.

Read:

- AGENTS.md
- README.md
- docs/v0.9.6/README.md
- docs/v0.9.6/ROOT_CAUSE.md
- docs/v0.9.6/PHASE_1_PROGRESSION_AND_FARM_BUFFERS.md
- docs/v0.9.6/PERSISTENCE_AND_MIGRATION.md
- docs/v0.9.6/FINAL_ACCEPTANCE.md

Inspect the current implementation and tests, especially:

- src/game/logic/workforce.ts
- src/game/scenes/GameScene.ts
- src/game/scenes/UIScene.ts
- src/game/systems/ExpandedAutomationSystem.ts
- src/game/systems/WorkerSystem.ts
- src/game/systems/ExpansionSystem.ts
- src/game/logic/livestock.ts
- src/game/logic/wheatFieldExpansion.ts
- src/game/logic/cornFieldExpansion.ts
- src/game/logic/saveSnapshot.ts
- src/game/persistence/saveSchema.ts
- src/game/persistence/migrations.ts
- src/game/persistence/saveValidation.ts
- src/game/config/gameConfig.ts
- src/game/config/farmLayout.ts
- src/game/logic/facilities.ts
- tests/e2e/

Implement every Phase 1 requirement.

Release-blocking requirements:

1. Fix worker training so the current worker level is preserved before calling
   training logic.

2. All five farm workers must correctly progress:

   unhired -> Lv1
   Lv1 -> Lv2
   Lv2 -> Lv3
   Lv3 -> maximum no-op

3. Preserve exact hire/training costs and charge once only.

4. Keep the training panel open after hire/training, refresh wallet, level,
   capacity, next price, and inline result.

5. Confirm real runtime consumes the trained parameters.

6. Implement a visible, player-accessible corn field crate distinct from the
   east-field collection box.

7. Make the corn harvester deposit its carried corn as one logical batch with
   full, partial, and crate-full outcomes.

8. Let the player collect corn from the same crate without hiring the corn
   transporter.

9. Let the corn transporter load the same remaining authoritative crate state.

10. Remove hard-coded corn-crate coordinates from runtime systems in favor of
    the facility/interaction registry.

11. Add persistent chicken-coop progression:

    Lv1: 3 chickens, egg batch 1, capacities 12/12
    Lv2: 5 chickens, egg batch 2, capacities 18/18, cost 420
    Lv3: 7 chickens, egg batch 3, capacities 24/24, cost 900

12. Keep the base egg interval 4500 ms. Consume one feed for each egg actually
    produced. Partial feed/storage must produce a safe partial batch.

13. Add a visible `鶏を増やす` upgrade interaction with standing hold, E,
    Space, click, and tap.

14. Scale poultry-caretaker feed targets and retain batch transport.

15. Make wheat-field expansion operable by standing hold, E, Space, click, and
    tap. Remove Space-only behavior.

16. Preserve exact wheat progression:

    30 -> 42 -> 54 nodes
    crate 16 -> 24 -> 32
    costs 220 and 520

17. Add schema-8 persistence and schema-7 migration for coop level and the
    actual remaining egg-production timer.

18. Preserve all v0.9.5 state, worker levels, contracts, processing,
    collection, dairy, and resources.

19. Add deterministic unit tests and browser E2E for every reported Phase 1
    failure.

Do not implement Phase 2 HUD redesign or Phase 3 contract redesign except for
shared APIs strictly required for schema migration and transaction correctness.

Do not update package/public version to 0.9.6 in Phase 1.
The final version update belongs to Phase 3.

Preserve:

- all existing v0.9.5 E2E scenarios
- Pages base /hurry-go-round/
- JSON export/import
- save recovery
- processing
- collection
- dairy
- contracts

Before finishing, run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required result:

- all checks pass
- every E2E passes on first attempt
- repeat-each=2 passes every execution
- no skipped or flaky tests
- Playwright retries remain 0

Review the complete diff and create one focused PR titled similar to:

Complete v0.9.6 Phase 1 progression and farm buffers

In the final report include:

- starting main SHA
- exact worker-level root cause and fix
- every before/after level and price
- corn crate design and batch results
- player corn pickup result
- chicken progression values
- wheat expansion input methods and values
- schema-8 migration
- unit and E2E tests
- every command and result
- manual Pages checks still required
```

### Phase 1 PR gate

Do not merge until:

```text
CI: success
E2E Chromium: success
retries: 0
skipped/flaky: 0
```

Manually verify on Pages:

- one worker reaches Lv3 and maximum no-op;
- corn harvester, crate, player pickup, and transporter;
- chicken upgrades and egg batches;
- both wheat expansions on desktop and smartphone;
- save/reload.

## Phase 2 prompt

Start only after Phase 1 is merged and verified on Pages.

```text
Implement Hurry-Go-Round v0.9.6 Phase 2:
Inventory Truth & Processing Information.

Repository:

shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main branch after Phase 1.
Do not continue the Phase 1 task.
The local branch name may be "work" and is acceptable.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm HEAD contains the merged v0.9.6 Phase 1 implementation and schema 8.
If not, stop without modifying files.

Read:

- AGENTS.md
- README.md
- docs/v0.9.6/README.md
- docs/v0.9.6/ROOT_CAUSE.md
- docs/v0.9.6/PHASE_2_INVENTORY_AND_PROCESSING_UI.md
- docs/v0.9.6/PERSISTENCE_AND_MIGRATION.md
- docs/v0.9.6/FINAL_ACCEPTANCE.md

Inspect especially:

- src/game/config/resourceDefinitions.ts
- src/game/scenes/UIScene.ts
- src/game/scenes/ModalButton.ts
- src/game/entities/Farmer.ts
- src/game/input/inputLayout.ts
- src/game/logic/resources.ts
- src/game/systems/ProcessingSystem.ts
- src/game/systems/ProcessingFacilityView.ts
- src/game/logic/processing.ts
- src/game/state/GameState.ts
- tests/e2e/

Implement every Phase 2 requirement.

Critical requirements:

1. Make RESOURCE_IDS and RESOURCE_DEFINITIONS the canonical source for every
   player-facing resource name, icon/category, color, order, price, and
   capacity.

2. The carried HUD must truthfully display every nonzero resource among all
   eleven supported resources.

3. The displayed carried sum must equal getCarriedTotal(cargo).

4. Use compact overflow such as `ほか N種類`; do not silently omit resources.

5. Add a full inventory panel with separate sections:

   持ち物
   倉庫
   売り場
   生産設備内
   集荷・集配

6. Update Farmer cargo art so processed and dairy products do not render as
   wheat.

7. Relabel and separate:

   持ち物（プレイヤー）
   倉庫（納品済み）
   売り場（お客さん向け）
   未回収売上
   所持コイン

8. The upper-right card must be explicitly shop/economy, not warehouse.

9. Use state.marketCapacity rather than hard-coded shelf capacities.

10. Include processed and dairy stock whenever nonzero or unlocked.

11. Build a pure inventory view model consumed by compact HUD and full panel.

12. Reorganize processing into clear sections/tabs:

    建設
    製粉機
    ベーカリー
    スタッフ

13. Use localized recipe cards and never show raw resource/recipe/facility IDs.

14. Separate machine input buffer, active-cycle reserved inputs, progress, and
    output buffer.

15. Show one primary next action for each machine.

16. Keep world machine status compact and move detail into the panel.

17. Audit every cargo/warehouse-changing path so GameState, Farmer art, HUD,
    state event, and save dirty state remain synchronized.

18. Provide responsive mouse/touch/keyboard UI at all specified viewports.

19. Add unit and browser tests for all eleven resources, location totals,
    market capacities, processing stages, mobile layouts, and save/reload.

Do not redesign contract behavior in Phase 2.
Do not update package/public version to 0.9.6 in Phase 2.

Preserve Phase 1, schema 8, contracts, processing transactions, collection,
dairy, save recovery, and Pages base /hurry-go-round/.

Before finishing, run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

All checks must pass with no skipped or flaky tests.

Create one focused PR titled similar to:

Complete v0.9.6 Phase 2 inventory and processing clarity

In the final report include:

- starting main SHA
- canonical resource presentation design
- carried/warehouse/shop totals
- character cargo categories
- inventory panel architecture
- processing tabs and recipe cards
- state synchronization audit
- responsive results
- tests and E2E scenarios
- every command and result
- manual Pages checks still required
```

### Phase 2 PR gate

Manually verify on Pages:

- mixed cargo containing processed/dairy goods;
- full inventory panel;
- clear warehouse versus shop versus wallet;
- authoritative shelf capacities;
- processing input/reserved/output explanation;
- desktop and smartphone layouts;
- save/reload.

## Phase 3 prompt

Start only after Phases 1 and 2 are merged and verified on Pages.

```text
Implement Hurry-Go-Round v0.9.6 Phase 3:
Contract Truthfulness & Final Release.

Repository:

shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main branch after Phases 1 and 2.
Do not continue an older task.
The local branch name may be "work" and is acceptable.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm HEAD contains merged Phase 1 and Phase 2 and save schema 8.
If not, stop without modifying files.

Read:

- AGENTS.md
- README.md
- every file under docs/v0.9.6/

Inspect especially:

- src/game/logic/contracts.ts
- src/game/contracts/contractTypes.ts
- src/game/scenes/GameScene.ts
- src/game/scenes/UIScene.ts
- src/game/config/resourceDefinitions.ts
- src/game/logic/unlockedResources.ts
- src/game/persistence/*
- src/main.ts
- package.json
- package-lock.json
- tests/e2e/

Implement every Phase 3 requirement and finalize v0.9.6.

Critical requirements:

1. Render every contract resource with RESOURCE_DEFINITIONS[resource].publicName.

2. Never display flour, bread, milk, butter, cheese, or any other resource as
   `たまご` by fallback.

3. Display stable offer identity such as `依頼 #000123`.

4. Fix decline behavior:

   - selected ID disappears immediately
   - one new different ID is generated
   - offer count remains three
   - statistics increment once
   - repeated declines work with no active contract
   - result is shown inline
   - failure never closes silently

5. Remove the stuck 30-second business cooldown or replace it with a transient
   short UI debounce. Normalize obsolete saved cooldown values safely.

6. Use structured contract command results for accept, decline, cancel,
   deliver, and complete.

7. Active-contract rows must show for each resource:

   required
   delivered
   player cargo
   warehouse
   missing

8. Replace warehouse-only delivery with deterministic cargo-first, then
   warehouse delivery.

9. Do not implicitly consume shop stock, machine buffers/output, field crates,
   collection boxes, egg storage, milk tank, or dairy workshop output.

10. Delivery feedback must identify the true resource and whether it came from
    cargo or warehouse.

11. No deliverable stock must show an exact missing-resource message.

12. Complete immediately and exactly once on the final item; apply reward,
    bonus, reputation, and statistics once.

13. Preserve cancellation conservation and report returned quantities.

14. Generate offers only for truly unlocked and contract-eligible resources.

15. Preserve existing offers, active progress, IDs, generator state, and
    statistics through schema-8 load/save.

16. Add unit and E2E scenarios for repeated decline, true egg, processed,
    dairy, mixed, cargo-first, warehouse fallback, cancellation, completion,
    and save/reload.

17. Run the cross-system and long-run acceptance suite.

18. After every test passes, update public version strings to 0.9.6:

    package.json
    package-lock.json
    GAME_VERSION
    title screen
    HUD
    README

19. Keep save schema at 8.

20. Do not create a Git tag or GitHub Release in this task.

Preserve all Phase 1 and Phase 2 behavior, Pages base /hurry-go-round/, JSON
export/import, save recovery, processing, collection, dairy, and controls.

Before finishing, run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required result:

- all checks green
- all old and new E2E pass first attempt
- repeat-each=2 passes every execution
- 0 skipped
- 0 flaky
- 0 expected failures

Create one focused PR titled similar to:

Complete v0.9.6 contract reliability and final release

In the final report include:

- starting main SHA
- contract label root cause and correction
- decline cooldown root cause and correction
- offer replacement IDs
- cargo-first/barn-fallback delivery
- egg, processed, dairy, and mixed contract results
- cancellation and completion invariants
- migration behavior
- final version changes
- long-run result
- every command and result
- complete manual Pages checklist
```

## Final release gate

After Phase 3 merges:

1. confirm CI and E2E on push to `main` succeed;
2. confirm Pages deployment succeeds;
3. complete every manual check in `FINAL_ACCEPTANCE.md`;
4. confirm desktop and smartphone behavior;
5. confirm a v0.9.5/schema-7 save migrates successfully;
6. create tag `v0.9.6` targeting the accepted `main` commit;
7. create GitHub Release `Hurry-Go-Round v0.9.6`.

## Scope discipline

Do not add in any v0.9.6 phase:

```text
new crops
new animal species
new recipes
traders
trade-only fruit or meat
decorations
time of day
seasons
weather
offline progression
cloud accounts
multiplayer
```

Those features belong after the reported progression, inventory, and contract failures are resolved.