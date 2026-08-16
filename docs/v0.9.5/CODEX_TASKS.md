# v0.9.5 Codex Task Prompts

Use one new Codex task per phase.

Do not paste the entire specification into Codex. Merge this specification branch into `main`, then use the short prompts below so Codex reads the repository documents.

## Common operating rules

For every phase:

1. Confirm all prior phase PRs are merged.
2. Confirm there are no unrelated open PRs targeting the same files.
3. Start a new Codex task with repository `shogo-ishikawa/hurry-go-round` and branch `main`.
4. Do not continue a prior Codex task.
5. Do not modify files before confirming HEAD.
6. Keep `main` frozen while the task is running.
7. Do not merge if CI or E2E fails.
8. Verify the deployed Pages build before starting the next phase.

## Phase 1 prompt

```text
Implement Hurry-Go-Round v0.9.5 Phase 1: Wheat Workforce & Farm Layout.

This is an incremental update from the true latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read:
   - docs/v0.9.5/README.md
   - docs/v0.9.5/ROOT_CAUSE.md
   - docs/v0.9.5/WHEAT_AND_LAYOUT.md
   - docs/v0.9.5/PERSISTENCE_AND_MIGRATION.md
   - docs/v0.9.5/FINAL_ACCEPTANCE.md
3. Inspect the current implementation and tests, especially:
   - src/game/systems/WorkerSystem.ts
   - src/game/logic/workers.ts
   - src/game/logic/workforce.ts
   - src/game/config/gameConfig.ts
   - src/game/art/terrain.ts
   - src/game/scenes/GameScene.ts
   - src/game/routes/workerRoutes.ts
   - src/game/logic/facilities.ts
   - src/game/persistence/*
4. Run:
   git rev-parse HEAD
   git log -1 --oneline
   git branch --show-current
   git status --short
5. Confirm HEAD is the true latest main. If not, stop without modifying files.

Implement every required Phase 1 item.

Critical requirements:
- make wheat harvest-worker runtime consume trained level parameters;
- Lv1/Lv2/Lv3 harvest capacities must be 4/7/10;
- use field-affinity batch harvesting;
- never start an empty crate trip;
- deposit the available wheat as one logical batch;
- show the deposited batch clearly;
- create one authoritative farm-layout definition;
- move the training lodge into the former upper-left wheat field;
- move the west wheat field into the former lodge/west open area;
- keep the central wheat field;
- implement wheat-field levels 0/1/2 with 30/42/54 nodes;
- implement wheat crate capacities 16/24/32;
- implement expansion costs 220/520;
- use stable wheat-node IDs;
- add schema-7 migration foundations and preserve schema-6 saves;
- add all required deterministic tests and actual browser E2E.

Do not change processing or collection behavior except for coordinate consumers that must follow the shared farm layout.

Preserve save recovery, dairy, contracts, controls, and Pages base /hurry-go-round/.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

All checks must pass. Do not skip or weaken E2E.

Review the complete diff and create a focused PR titled similar to:

Complete v0.9.5 Phase 1 wheat batching and farm layout

In the final report include:
- base main SHA
- layout changes
- exact level parameters
- batch-deposit behavior
- wheat expansion values
- schema migration
- tests and E2E scenarios
- commands and results
- manual Pages checks still required
```

### Phase 1 PR gate

Do not merge until:

```text
CI: success
E2E Chromium: success
Pages deployment after merge: success
```

Manually verify on Pages:

- Lv2/Lv3 worker batch behavior;
- zero empty crate trips;
- lodge/field relocation;
- both expansions;
- save/reload.

## Phase 2 prompt

Start only after Phase 1 is merged and verified.

```text
Implement Hurry-Go-Round v0.9.5 Phase 2: Processing Construction & Material Flow.

This is an incremental update from the true latest main branch after Phase 1.

Before editing:
1. Read AGENTS.md.
2. Read:
   - docs/v0.9.5/README.md
   - docs/v0.9.5/ROOT_CAUSE.md
   - docs/v0.9.5/PROCESSING_INTERACTIONS.md
   - docs/v0.9.5/PERSISTENCE_AND_MIGRATION.md
   - docs/v0.9.5/FINAL_ACCEPTANCE.md
3. Inspect the current implementation and tests, especially:
   - src/game/systems/ProcessingSystem.ts
   - src/game/systems/ProcessingFacilityView.ts
   - src/game/systems/ProcessingWorkerSystem.ts
   - src/game/logic/processing.ts
   - src/game/logic/processingRouting.ts
   - src/game/logic/facilities.ts
   - src/game/scenes/UIScene.ts
   - src/game/scenes/GameScene.ts
   - src/game/persistence/*
4. Run:
   git rev-parse HEAD
   git log -1 --oneline
   git branch --show-current
   git status --short
5. Confirm HEAD is the true latest main including Phase 1. If not, stop without modifying files.

Implement every required Phase 2 item.

Critical requirements:
- show visible planned states for processing yard, mill, and bakery;
- show exact construction costs and prerequisite checklists;
- use visible construction pads whose bounds match logical interactions;
- make input and output stations physically distinct;
- show input and output inventory in the world;
- show exactly when an item leaves player cargo and enters a machine;
- show exactly when a finished item becomes available and is collected;
- keep output stations visible even when empty;
- implement explicit stop/failure reasons rather than silent no-op;
- replace text-only modal controls with reusable real buttons;
- keep the processing panel open after commands and refresh it live;
- add guide buttons for every construction, input, output, and management point;
- preserve active-cycle and buffer persistence;
- add all required pure tests and browser E2E using visible UI interactions.

Do not add new recipes or resources in this phase.

Preserve all Phase 1 behavior, v0.9.4 systems, saves, and Pages base /hurry-go-round/.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

All checks must pass. Do not skip or weaken E2E.

Review the complete diff and create a focused PR titled similar to:

Complete v0.9.5 Phase 2 processing construction and material flow

In the final report include:
- base main SHA
- planned/build interaction design
- exact construction rules
- input/output transfer feedback
- modal/button architecture
- persistence behavior
- tests and E2E scenarios
- commands and results
- manual Pages checks still required
```

### Phase 2 PR gate

Manually verify on Pages:

- yard conditions and cost;
- mill foundation/build;
- bakery foundation/prerequisite/build;
- manual input with visible cargo change;
- visible finished output and collection;
- processing panel buttons on PC and smartphone;
- save/reload during active production.

## Phase 3 prompt

Start only after Phase 2 is merged and verified.

```text
Implement Hurry-Go-Round v0.9.5 Phase 3: Collection Discoverability & Management UI, and finalize the v0.9.5 release.

This is an incremental update from the true latest main branch after Phases 1 and 2.

Before editing:
1. Read AGENTS.md.
2. Read every file under docs/v0.9.5/.
3. Inspect the current implementation and tests, especially:
   - src/game/systems/CollectionNetworkSystem.ts
   - src/game/systems/CollectionFacilityView.ts
   - src/game/logic/collectionNetwork.ts
   - src/game/logic/facilities.ts
   - src/game/scenes/UIScene.ts
   - src/game/state/GameState.ts
   - src/game/persistence/*
   - tests/e2e/*
4. Run:
   git rev-parse HEAD
   git log -1 --oneline
   git branch --show-current
   git status --short
5. Confirm HEAD is the true latest main including Phases 1 and 2. If not, stop without modifying files.

Implement every required Phase 3 item and final release task.

Critical requirements:
- render planned/unbuilt and built states for the hub and every relevant local collection box;
- make wheat, corn, and egg collection-box construction points discoverable;
- keep worker crate and collection box visually distinct;
- use one authoritative collection facility registry for costs, capacities, prerequisites, visuals, panel, and guide targets;
- replace the collection modal with reusable rectangle-backed buttons;
- support mouse, touch, keyboard focus, Enter, and Space;
- keep the panel open after actions;
- refresh state and show inline success/failure messages;
- provide explicit routing options instead of one cycle-only button;
- provide source-specific emergency transfer controls;
- provide facility guide buttons;
- prevent duplicate event listeners and double charges;
- add all required deterministic tests and browser E2E using visible buttons;
- run the cross-system and long-run acceptance tests;
- update package and public version to 0.9.5;
- update save schema to 7 if Phase 1 has not already done so;
- update README and in-game version text to match actual behavior.

Preserve all Phase 1 and Phase 2 behavior, v0.9.4 systems, persistence, and Pages base /hurry-go-round/.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e

All checks must pass. Do not skip, weaken, or mark required E2E as expected failures.

Review the complete diff and create a focused PR titled similar to:

Complete v0.9.5 collection UX and final release

In the final report include:
- base main SHA
- planned collection facility design
- modal/button architecture
- every supported command and result
- responsive mouse/touch/keyboard verification
- cross-system invariants
- save schema and migration
- final version updates
- commands and results
- complete Pages manual checklist
```

## Final release gate

After Phase 3 merges:

1. confirm E2E on push to main succeeds;
2. confirm Pages deployment succeeds;
3. complete all checks in `FINAL_ACCEPTANCE.md`;
4. confirm desktop and smartphone behavior;
5. create the `v0.9.5` tag and GitHub Release only after acceptance is complete.

## Scope discipline

Do not add the following to any v0.9.5 phase:

```text
new crops
new animals
new recipes
time of day
seasons
traders
external food
meat systems
decorations
cloud accounts
multiplayer
```

Any unrelated idea belongs in a future milestone after v0.9.5 stabilizes the existing game.
