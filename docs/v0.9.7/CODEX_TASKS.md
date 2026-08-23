# v0.9.7 Codex Tasks

Use one new Codex task per phase. Never continue a prior phase task after its PR has been merged.

Before every phase:

1. Merge the preceding phase.
2. Confirm GitHub Pages acceptance.
3. Start a new Codex task from the true latest `main`.
4. Keep `main` otherwise frozen until the phase PR is complete.

---

# Phase 1 Prompt — Inventory Ledger & Processing Guidance

```text
Implement Hurry-Go-Round v0.9.7 Phase 1:
Inventory Ledger & Processing Guidance.

Repository:
shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main branch after the v0.9.7
specification PR has been merged.

The local Codex branch may be named "work". That is acceptable.
Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm HEAD is the true latest main containing all files under docs/v0.9.7/.
If not, stop without modifying files.

Read:

- AGENTS.md
- README.md
- every file under docs/v0.9.7/
- src/game/config/resourceDefinitions.ts
- src/game/logic/inventoryViewModel.ts
- src/game/logic/processingViewModel.ts
- src/game/scenes/UIScene.ts
- src/game/scenes/ModalButton.ts
- src/game/entities/Farmer.ts
- src/game/systems/ProcessingFacilityView.ts
- src/game/systems/ProcessingSystem.ts
- src/game/state/GameState.ts
- src/main.ts
- all current unit and E2E tests

Implement every requirement in:

docs/v0.9.7/PHASE_1_INVENTORY_AND_PROCESSING_GUIDANCE.md

Required outcomes:

1. Create one authoritative per-resource inventory ledger.
2. Default full-panel view shows carried and warehouse amounts together.
3. All eleven resources are available as exact rows.
4. The all-location view includes field buffers, collection boxes, courier
   cargo, processing input/reserved/output, and dairy input/reserved/output.
5. No location is double-counted.
6. Compact hidden-row text includes hidden type count and hidden unit count.
7. Clicking carried or warehouse HUD opens the ledger.
8. Add a truly scrollable or deterministic paginated modal content region.
9. Add a guaranteed-visible processing overview page.
10. Split processing details into structured cards/pages.
11. Explanations must be visibly inside the panel, not merely present as hidden
    Phaser text objects.
12. Add mouse, touch, wheel/drag, keyboard, responsive, save/reload, and
    visibility E2E.

Preserve:

- package version 0.9.6
- save schema 8
- all v0.9.6 resource quantities and systems
- current recipes and timings
- current contract semantics
- current wheat layout
- Pages base /hurry-go-round/
- all existing E2E scenarios
- Playwright retries 0 and CI workers 1

Do not implement Phase 2 or Phase 3.
Do not add new resources, recipes, crops, animals, traders, time, or seasons.

Do not solve visibility tests by reading only the text property. Expose and
assert actual serializable visible bounds.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required result:

- all type/unit checks pass
- build passes
- all existing and new E2E pass first attempt
- repeat-each=2 passes every execution
- no skipped, flaky, or expected-failure test
- no page error or uncaught console error

Create one focused PR titled similar to:

Complete v0.9.7 Phase 1 inventory ledger and processing guidance

If CI or E2E fails, update the same PR from the same Codex task. Do not create
another PR and do not merge while red.

Final report:

- starting main SHA
- files changed
- ledger architecture and location rules
- invariant results
- compact HUD behavior
- scroll/pagination behavior
- processing overview and pages
- viewport results
- E2E scenarios and exact results
- manual Pages checks still required
```

---

# Phase 2 Prompt — Instant Shipping & Till Collection

```text
Implement Hurry-Go-Round v0.9.7 Phase 2:
Instant Shipping & Till Collection.

Repository:
shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main after Phase 1 is merged and
accepted on GitHub Pages.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm Phase 1 inventory ledger and processing guidance are present.
If not, stop without modifying files.

Read:

- AGENTS.md
- every file under docs/v0.9.7/
- src/game/logic/contracts.ts
- src/game/contracts/contractTypes.ts
- src/game/logic/economy.ts
- src/game/systems/MarketSystem.ts
- src/game/scenes/GameScene.ts
- src/game/scenes/UIScene.ts
- src/game/state/GameState.ts
- existing contract, economy, inventory, save, and E2E tests

Implement every requirement in:

docs/v0.9.7/PHASE_2_BATCH_LOGISTICS.md

Required outcomes:

1. Add one pure atomic contract batch-delivery transaction.
2. For each required resource, consume cargo first and warehouse second.
3. Deliver all currently available required quantities in one action.
4. Report exact per-resource and per-source breakdown.
5. If fully supplied, complete and reward the contract in the same action.
6. Prevent repeated delivery while the player remains on the dock.
7. Use bounded animation independent of quantity.
8. Replace one-coin pickup with collect-all till transaction.
9. Touching/entering the cash zone transfers the complete till balance once.
10. Add exact resource and coin conservation tests.
11. Add real dock and cash-zone browser E2E.

Preserve:

- package version 0.9.6
- save schema 8
- Phase 1 UI
- contract IDs and truthful labels
- contract cancellation return behavior
- customer sales and market restocking
- Pages base /hurry-go-round/
- all existing E2E tests
- retries 0

Do not implement the unified wheat field or schema 9.
Do not consume resources from market, machine buffers, field crates,
collection boxes, coop storage, dairy tanks, or courier cargo during a contract
batch.

Do not implement quantity-proportional loops or tweens for item/coin pickup.
The number of state transitions must be independent of batch size.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Create one focused PR titled similar to:

Complete v0.9.7 Phase 2 instant shipping and till collection

Final report:

- starting main SHA
- batch transaction design
- cargo/barn source ordering
- full and partial delivery results
- exact-once reward behavior
- collect-all till behavior
- conservation tests
- browser E2E results
- manual Pages checks still required
```

---

# Phase 3 Prompt — Unified Wheat Field & Final Release

```text
Implement Hurry-Go-Round v0.9.7 Phase 3:
Unified Wheat Field & Final Release.

Repository:
shogo-ishikawa/hurry-go-round

Start a new Codex task from the true latest main after Phase 2 is merged and
accepted on GitHub Pages.

Before editing, run:

git rev-parse HEAD
git log -5 --oneline
git branch --show-current
git status --short

Confirm Phase 1 and Phase 2 are present.
If not, stop without modifying files.

Read:

- AGENTS.md
- every file under docs/v0.9.7/
- src/game/config/farmLayout.ts
- src/game/art/terrain.ts
- src/game/routes/workerRoutes.ts
- src/game/logic/workers.ts
- src/game/systems/WorkerSystem.ts
- src/game/entities/CropNode.ts
- src/game/scenes/GameScene.ts
- src/game/persistence/saveSchema.ts
- src/game/persistence/migrations.ts
- src/game/persistence/saveValidation.ts
- src/game/logic/saveSnapshot.ts
- all wheat, migration, save, and E2E tests

Implement every requirement in:

- docs/v0.9.7/PHASE_3_UNIFIED_WHEAT_FIELD.md
- docs/v0.9.7/PERSISTENCE_AND_MIGRATION.md
- docs/v0.9.7/FINAL_ACCEPTANCE.md

Required outcomes:

1. Replace two wheat fields with one authoritative contiguous field.
2. Use one 9-column x 6-row potential grid.
3. Level 0 activates 30 nodes in the base area.
4. Level 1 adds an adjacent 12-node strip.
5. Level 2 adds the final adjacent 12-node strip.
6. Remove old west plot soil, fence, nodes, and waypoint.
7. Use one field entry and remove worker cluster switching.
8. Preserve Lv1/Lv2/Lv3 batches of 4/7/10.
9. Preserve expansion costs 220/520 and crate capacities 16/24/32.
10. Introduce wheat-main stable node IDs.
11. Migrate every schema-8 west/central ID one-to-one.
12. Preserve crop state, timer, crate, worker, and all other systems.
13. Bump schema to 9 and public version to 0.9.7.
14. Add actual expansion, migration, map topology, and worker browser E2E.

Use the recommended placement as a starting point, then validate all facility
and path overlaps. A small coordinate adjustment is allowed, but the final
field must be one contiguous region near the existing main wheat crate.

Preserve:

- Phase 1 inventory and processing UI
- Phase 2 batch logistics
- all v0.9.6 gameplay and schema-8 migration chain
- Pages base /hurry-go-round/
- all existing E2E tests
- retries 0

Do not create the Git tag or GitHub Release.
Do not add a new gameplay system to the vacated west area.

Run:

npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2

Required result:

- all current and new tests pass
- all 54 old IDs map exactly once
- schema-8 browser migration passes
- one field only
- no obsolete west/central runtime domain state
- no skipped/flaky test

Create one focused PR titled similar to:

Complete v0.9.7 Phase 3 unified wheat field and final release

Final report:

- starting main SHA
- final field coordinates and overlap proof
- 30/42/54 layout
- worker route simplification
- old-to-new ID mapping
- schema migration results
- final version metadata
- all validation results
- manual Pages checks still required
```
