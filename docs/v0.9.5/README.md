# Hurry-Go-Round v0.9.5
## Farm Flow, Wheat Expansion & Transparent Processing

This directory defines the complete implementation contract for v0.9.5.

v0.9.5 is not a new-resource milestone. It is a gameplay-flow and interaction-reliability release built on the completed v0.9.4 runtime.

The release must fix the following player-observed problems:

1. The wheat harvest worker does not become meaningfully more efficient after training.
2. The worker appears to return toward the wheat crate after very small harvests, sometimes without depositing, and only deposits a larger amount after several trips.
3. The training lodge and wheat-field arrangement wastes the upper-left farm area and leaves two wheat fields awkwardly separated.
4. Wheat production cannot be expanded in the same understandable way as corn production.
5. Processing-yard construction and operation zones are difficult to discover.
6. Players cannot tell when carried ingredients are being transferred into a machine.
7. Mill and bakery products do not have sufficiently clear physical collection points.
8. Bakery and other construction prerequisites, costs, and build locations are unclear.
9. Only the poultry collection box is readily discoverable in ordinary play.
10. The collection-hub management panel opens, but its buttons do not provide reliable visible or functional feedback.

## Required base

Implementation must begin from the true latest `main` after v0.9.4. At the time this specification was written, the latest main commit was:

```text
71aded016edf70a6444b5123564ee205e804ccc5
```

Before every Codex phase, run:

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

If HEAD is not the true latest `main`, stop without editing.

Do not continue an old Codex task or old worktree.

## Release title

```text
Hurry-Go-Round v0.9.5
Farm Flow, Wheat Expansion & Transparent Processing
```

Japanese release description:

```text
農場動線・麦畑拡張・加工物流の明確化
```

## Primary design rule

A feature is complete only when every required layer exists:

```text
State
Logic
Runtime
Interaction
Presentation
Persistence
Browser E2E
```

Pure functions, types, and passing unit tests are not sufficient if the feature cannot be found and used on the map.

## Implementation phases

v0.9.5 must be implemented as three separate Codex tasks and three focused pull requests.

### Phase 1 — Wheat Workforce & Farm Layout

Read:

```text
docs/v0.9.5/ROOT_CAUSE.md
docs/v0.9.5/WHEAT_AND_LAYOUT.md
docs/v0.9.5/PERSISTENCE_AND_MIGRATION.md
docs/v0.9.5/FINAL_ACCEPTANCE.md
```

Deliver:

- level-aware wheat harvest-worker behavior
- deterministic batch harvesting
- one-stop batch deposit
- training lodge / upper-left wheat-field relocation
- wheat-field expansion levels
- schema-7 migration foundations
- wheat worker and layout regression tests

Merge Phase 1 only after all Phase 1 unit, build, E2E, and Pages checks pass.

### Phase 2 — Processing Construction & Material Flow

Read:

```text
docs/v0.9.5/PROCESSING_INTERACTIONS.md
docs/v0.9.5/FINAL_ACCEPTANCE.md
```

Deliver:

- visible processing-yard purchase zone
- visible mill and bakery construction foundations
- exact costs and prerequisite checklists
- distinct machine input and output stations
- visible one-unit-at-a-time material transfer
- physical output storage and collection
- robust processing management panel
- browser E2E for construction, input, production, and output collection

Merge Phase 2 only after the processing loop is playable on Pages.

### Phase 3 — Collection Discoverability & Management UI

Read:

```text
docs/v0.9.5/COLLECTION_AND_UI.md
docs/v0.9.5/FINAL_ACCEPTANCE.md
```

Deliver:

- discoverable planned collection boxes for wheat, corn, and eggs
- consistent build interactions and map guidance
- reliable pointer/touch/keyboard collection management UI
- action acknowledgements without immediately closing the panel
- live panel refresh
- resource-specific emergency transfer controls
- final v0.9.5 documentation and release version
- full cross-system E2E and Pages acceptance

## No new resource chain

Do not add new crops, animals, recipes, seasons, time-of-day systems, traders, decorations, or external goods in this release.

The release should make the existing v0.9.4 farm understandable and efficient before further expansion.

## Existing behavior to preserve

Preserve all working v0.9.4 behavior:

- keyboard, joystick, click/tap, and continuous drag movement
- mixed cargo
- wheat, corn, eggs, hay, milk, butter, cheese
- market and customers
- customer patience and abandonment
- contracts and reputation
- wheat, corn, poultry, processing, collection, and dairy state
- IndexedDB saves, backup recovery, localStorage fallback, JSON import/export
- GitHub Pages base `/hurry-go-round/`
- Japanese public UI

## Versioning

Use save schema version 7 for the new wheat-field layout and expansion state.

The final Phase 3 PR must update:

```text
package.json
package-lock.json
src/game/persistence/saveSchema.ts
README.md
game title/version UI
```

to public game version `0.9.5`.

Development phases may display:

```text
v0.9.5 開発版 — Phase 1
v0.9.5 開発版 — Phase 2
```

Do not create a Git tag or GitHub Release until Phase 3 and final acceptance are complete.

## Required validation commands

Every phase must run:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
```

Do not skip E2E because a browser is inconvenient. The established GitHub Actions E2E workflow is a release gate.

## Pull-request safety

Each phase must be an incremental diff from the latest main.

If the following appear as newly added files, stop without creating the PR:

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
previous version specifications
most of the existing source tree
```

## Definition of done

v0.9.5 is complete only when a player can perform all of the following without reading source code:

1. Train the wheat harvest worker and observe larger, faster harvest batches.
2. Watch the worker harvest several nearby wheat nodes before returning.
3. Watch one clear batch deposit into the wheat crate.
4. Find the relocated training lodge and expanded wheat area.
5. Purchase two wheat-field expansions.
6. Find the processing-yard purchase zone and understand unmet conditions.
7. Build the mill and bakery from visible foundations.
8. See ingredients leave player cargo and enter machine input storage.
9. See finished products appear at a physical output point and collect them.
10. Find all local collection-box construction points.
11. Open the collection panel and operate every enabled button using mouse, touch, and keyboard.
12. Save, reload, and continue with all new layout, construction, worker, and inventory state preserved.
