# v0.9.7 Root-Cause Analysis

This document records the code-level causes found in v0.9.6 `main` at:

```text
fec6099ebe698857d0b43be7100256bd03641871
```

## 1. Carried items and warehouse stock are not presented as one ledger

The current inventory view model correctly derives several location-specific lists:

```text
carried
barn
market
production
farmBuffers
```

However, the full inventory panel is organized as five separate pages:

```text
持ち物
倉庫
売り場
生産設備内
集荷・集配
```

A player who asks, “How many units of this item do I have, and where are they?” must switch pages and mentally combine values.

The compact HUD also intentionally truncates rows:

```text
formatCompactRows(vm.carried, 2 or 3)
formatCompactRows(vm.barn, 1 or 2)
```

The overflow message shows only:

```text
ほか N種類
```

It does not show the hidden quantities.

Consequences:

- the total may be correct while the visible breakdown is incomplete;
- the player cannot compare carried and warehouse quantities in one glance;
- processed and dairy resources may be hidden behind an overflow count;
- a player must remember which page contains a resource;
- exact location accounting is difficult during contracts and processing.

Required correction:

- create a per-resource ledger with one row per resource;
- show carried and warehouse columns together in the default view;
- provide a complete all-location view;
- list all eleven resources in the full panel, including zero where useful;
- derive every total from authoritative state;
- verify row sums against location totals.

## 2. The current inventory panel is text-only and not truly scrollable

The current modal creates one large Phaser text object with word wrapping. It does not provide a content viewport, clipping mask, wheel scrolling, touch dragging, or deterministic pagination.

On a small viewport, text can exist in the scene but extend below the visible panel. Existing E2E diagnostics read `overlayText`, so a test may pass even when the player cannot see the line.

Required correction:

- add a reusable scrollable or paginated modal content region;
- expose visible bounds in E2E diagnostics;
- assert every required row is reachable and readable;
- do not treat a hidden Phaser text object as visible acceptance.

## 3. Processing explanations are assembled into one long body

The processing panel currently builds a large body string for each page. Machine pages combine:

```text
mode
selected recipe
next action
input buffer
reserved input
progress
remaining time
output buffer
recipe cards
```

The text is placed at a fixed top position and wrapped. There is no scroll container. On short or landscape mobile screens, lower explanatory lines can leave the visible panel.

The current processing panel also lacks a dedicated overview page that immediately explains:

- what the processing yard does;
- where raw materials go;
- where finished products are collected;
- which recipes are available;
- which facility must be built first.

Consequences:

- explanation text may technically exist but be off-screen;
- the first visible page may not answer the player's basic question;
- the player may see controls without understanding the production flow;
- E2E may validate text presence without validating visibility.

Required correction:

- open on a guaranteed-visible overview;
- use discrete cards rather than one text dump;
- add responsive scrolling or pagination;
- show one clear material-flow diagram;
- verify actual screen bounds at every required viewport.

## 4. Contract delivery is deliberately one item per interval

`GameScene.updateContracts(...)` currently calls:

```ts
deliverNextContractResourceOne(...)
```

while the player is in the contract dock. The call is rate-limited by:

```text
contractDeliveryIntervalMs = 180
```

Therefore a contract requiring 30 units takes at least several seconds of passive waiting, even when every required item is already in player cargo or the warehouse.

The one-item function was useful for animation and early debugging, but it no longer matches the scale of mixed-resource contracts.

Required correction:

- add one atomic batch-delivery transaction;
- consume all currently deliverable required quantities;
- preserve cargo-first, warehouse-second ordering;
- finish and reward a fully supplied contract in the same interaction;
- show one bounded batch animation and one exact summary;
- prevent repeated delivery while the player remains on the dock.

## 5. Till collection is deliberately one coin per interval

`MarketSystem.updateCash(...)` calls:

```ts
collectTillCoin(...)
```

once per:

```text
55 ms
```

For a large accumulated till balance, the player must remain inside the collection area while the wallet increases one coin at a time.

Required correction:

- replace the one-coin transaction with `collectAllTillCoins(...)`;
- move the full till balance in one state transition;
- show `+Nコイン` and a bounded particle effect;
- request one save, not one save per coin;
- remain safe when the till is zero.

## 6. The wheat production line is physically split into two fields

The authoritative farm layout currently defines:

```text
west field
central field
```

with independent bounds, entries, node groups, and worker-cluster routing.

The 30 base nodes are split into 15 west and 15 central nodes. Each expansion adds 6 west and 6 central nodes.

The worker runtime therefore tracks:

```text
activeCluster = west | central
needsFieldEntry
clusterEmptyElapsed
```

and may switch between field entries.

Consequences:

- one production line occupies two distant areas;
- the player must travel to two places to inspect wheat;
- the remote plot consumes useful map area;
- worker routing is more complex than the gameplay requires;
- expansion does not look like one field growing outward.

Required correction:

- define one `wheatField` rather than `wheatFields`;
- place all 30 / 42 / 54 nodes in one contiguous rectangle;
- make expansion add adjacent strips to the same field;
- use one field entry;
- remove cluster switching from the worker runtime;
- migrate old west/central IDs deterministically.

## 7. Existing wheat save IDs encode the old topology

Current crop IDs include the physical cluster:

```text
wheat-west-base-00
wheat-central-base-00
wheat-west-exp1-00
wheat-central-exp1-00
...
```

Simply changing coordinates while keeping the old names would preserve saves, but would leave obsolete topology embedded in the domain model and tests.

Creating new unified IDs requires a schema migration.

Required correction:

```text
schema 8 -> schema 9
```

Map every old ID to exactly one new ID while preserving:

- crop state
- remaining growth time
- field expansion level
- crate amount and capacity
- worker level and carried wheat

## 8. Existing browser coverage does not test the requested time-saving flows

The current E2E suite verifies save recovery, wheat worker batches, processing, inventory presentation, collection, and contract decline behavior.

It does not directly verify:

- a matrix-style carried/warehouse ledger;
- processing explanation visibility rather than text existence;
- one-interaction full contract delivery;
- one-interaction full till collection;
- actual migration from two wheat plots to one contiguous field.

v0.9.7 must add player-flow E2E for these behaviors.
