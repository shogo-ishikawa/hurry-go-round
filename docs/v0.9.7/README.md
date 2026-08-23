# Hurry-Go-Round v0.9.7

## Inventory Ledger, Instant Logistics & Unified Wheat Field

v0.9.7 is a focused usability and farm-layout release built on the merged v0.9.6 `main` branch.

It addresses four player-facing problems found during manual play:

1. The player cannot see carried items and warehouse stock together with complete confidence.
2. Processing-yard explanations may exist as text objects but are not reliably visible or readable on every viewport.
3. Contract delivery and till collection waste time by moving one item or one coin per interval.
4. Wheat production is split across two distant plots even though it is one production line.

The release does not add new crops, animals, recipes, traders, seasons, or currencies. It makes the existing game easier to understand and faster to operate.

## Release title

```text
Hurry-Go-Round v0.9.7
Inventory Ledger, Instant Logistics & Unified Wheat Field
在庫台帳・一括物流・統合麦畑
```

## Release phases

### Phase 1 — Inventory Ledger & Processing Guidance

- Add an authoritative per-resource inventory ledger.
- Make carried items and warehouse amounts available in one default view.
- Show all eleven resource types without silently omitting nonzero quantities.
- Add a responsive, scrollable inventory panel.
- Add a guaranteed-visible processing overview and readable machine cards.
- Verify actual rendered bounds, not only hidden text-object contents.

### Phase 2 — Instant Shipping & Till Collection

- Replace one-item contract delivery with one atomic batch-delivery transaction.
- Deliver from player cargo first, then warehouse fallback.
- Complete and reward a fully supplied contract in the same interaction.
- Replace one-coin till pickup with one atomic collect-all transaction.
- Use bounded visual effects and clear summary messages.
- Preserve exact resource and coin conservation.

### Phase 3 — Unified Wheat Field & Final Release

- Remove the remote west wheat plot.
- Place all 30 / 42 / 54 wheat nodes inside one contiguous field.
- Expand the same field outward in two visible stages.
- Replace west/central worker-cluster routing with one field entry and one nearest-ready-node route.
- Migrate old wheat-node IDs and crop timers deterministically.
- Bump save schema from 8 to 9.
- Finalize public version 0.9.7.

## Version and save policy

```text
Phase 1 package version: 0.9.6
Phase 2 package version: 0.9.6
Phase 3 final package version: 0.9.7

Phase 1 save schema: 8
Phase 2 save schema: 8
Phase 3 save schema: 9
```

The schema bump is required only for the unified wheat-node topology. UI state, scrolling state, guide markers, temporary result banners, and collection animations must not be persisted.

## Required preserved behavior

All working v0.9.6 systems must remain intact:

- schema-8 save recovery and migration
- worker training through Lv3
- corn temporary crate and player pickup
- chicken-coop progression
- processing production and machine persistence
- collection network and courier
- pasture, cows, dairy workshop, butter, and cheese
- truthful contract labels and contract IDs
- cargo-first contract semantics
- customer patience and market sales
- keyboard, pointer, drag, joystick, and touch movement
- GitHub Pages base path `/hurry-go-round/`

## Implementation workflow

Each phase is implemented in a separate new Codex task from the latest merged `main`.

```text
Specification PR
  ↓ merge
Phase 1 implementation PR
  ↓ CI + E2E + Pages acceptance + merge
Phase 2 implementation PR
  ↓ CI + E2E + Pages acceptance + merge
Phase 3 implementation PR
  ↓ CI + E2E + migration acceptance + merge
v0.9.7 tag and GitHub Release
```

Do not start a later phase before the preceding phase is merged and manually accepted on GitHub Pages.

## Mandatory validation for every phase

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2
```

Required outcome:

- TypeScript passes
- all unit tests pass
- production build passes
- all existing and new E2E tests pass on the first attempt
- repeat-each=2 passes every execution
- no skipped tests
- no flaky tests
- no expected-failure markers
- no direct state bypass for the player action being tested

## Files in this specification

```text
docs/v0.9.7/
├── README.md
├── ROOT_CAUSE.md
├── PHASE_1_INVENTORY_AND_PROCESSING_GUIDANCE.md
├── PHASE_2_BATCH_LOGISTICS.md
├── PHASE_3_UNIFIED_WHEAT_FIELD.md
├── PERSISTENCE_AND_MIGRATION.md
├── FINAL_ACCEPTANCE.md
└── CODEX_TASKS.md
```
