# Hurry-Go-Round v0.9.6

## Progression Integrity, Clear Inventory & Reliable Contracts

v0.9.6 is a stabilization release based on manual play of v0.9.5. It fixes progression transactions that charge coins without advancing, makes farm buffers and upgrades playable, makes inventory and processing information truthful, and makes delivery contracts display and consume the correct resources.

This release must be implemented before adding time, seasons, traders, new crops, or additional recipes.

## Reported release blockers

1. Worker training after Lv2 deducts coins but does not reach Lv3.
2. Corn harvested by the automation worker is not available from a clear player-accessible temporary store.
3. Chicken and egg production cannot be upgraded.
4. Wheat-field expansion is not practically operable.
5. Processing information is dense and does not clearly show requirements, work in progress, and finished goods.
6. The carried-item list does not match the actual cargo state once processed and dairy products exist.
7. The upper-right stock display does not clearly distinguish shop shelves, uncollected sales, wallet coins, and warehouse inventory.
8. Declining a contract can leave the same offer visible and future declines can become permanently blocked.
9. Some contracts, often displayed as egg contracts, cannot be completed at the delivery dock.

## Release strategy

Implement v0.9.6 in three separately merged phases.

```text
Phase 1 — Progression Transactions & Farm Buffers
Phase 2 — Inventory HUD & Processing Information
Phase 3 — Contract Truthfulness & Final Release
```

Each phase must:

1. start from the latest `main` after the previous phase;
2. use a new Codex task and branch;
3. produce one focused pull request;
4. pass typecheck, unit tests, build, and browser E2E;
5. be manually verified on GitHub Pages before the next phase begins.

## Version and persistence

- Public release version: `0.9.6`
- Save schema: `7 -> 8`
- Schema 8 is required for chicken-coop progression and the persistent egg-production timer.
- Existing v0.9.5 saves must retain all currency, resources, facilities, workers, contracts, processing, collection, and dairy state.
- Package and public version strings are updated only in Phase 3.

## Non-goals

Do not add in v0.9.6:

```text
new crops
new animals other than additional visible chickens
new recipes
traders
trade-only fruit or meat
decorations
time of day
seasons
weather
multiplayer
cloud accounts
offline progression
```

## Definition of complete

A pure function, state field, or green build is not sufficient. Every reported flow must work through the visible game UI on desktop and mobile. The final browser suite must cover all nine reported failures and preserve every existing v0.9.5 E2E scenario.