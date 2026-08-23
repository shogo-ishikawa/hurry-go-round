# v0.9.6 Root-Cause Analysis

This document records the code-level causes found in the accepted v0.9.5 `main` branch at commit:

```text
a2d323b6e96a678f022dfe1beb3957b2c0fd5abd
```

PR #35 added collection-browser acceptance instrumentation and tests. It did not change the product behavior responsible for the manual-play failures analyzed below.

## 1. Worker training repeatedly behaves as Lv1 -> Lv2

`GameScene.handleOperationsAction(...)` converts the current runtime worker into the generic training model using:

```ts
createWorkerProgress(current.hired, resource, current.carried)
```

`createWorkerProgress(true, ...)` always returns `level: 1`. The actual `current.level` is discarded before calling `trainWorker(...)`.

Consequences:

```text
actual worker Lv1 -> generic Lv1 -> training result Lv2
actual worker Lv2 -> generic Lv1 -> training result Lv2
actual worker Lv3 -> generic Lv1 -> training result Lv2
```

The wallet is charged for the Lv1-to-Lv2 cost, while an existing Lv2 worker remains Lv2. The transaction appears successful because `changed` is true.

Required correction:

- create one adapter that preserves `hired`, `level`, carried resource, and carried amount;
- apply the result back through one role-safe adapter;
- assert exact before/after level and exact charge;
- do not charge on maximum level or no-op;
- show the result in the training panel without closing it immediately.

## 2. Corn has a logical crate but no equivalent player-facing crate flow

The corn harvester moves to a hard-coded `CORN_CRATE` coordinate and increments:

```ts
state.automation.cornFieldCrate
```

The corn transporter later reads the same number. However, there is no complete equivalent of wheat's:

```text
FieldCrate entity
live fill display
player pickup runtime
pickup effect
empty/full feedback
```

An interaction ID for corn-crate collection exists, but the player-facing runtime does not consume it. The harvester also deposits one unit at a time, so the result resembles items being left on the ground rather than a batch entering a store.

Required correction:

- create a visible corn temporary store using the registered facility and interaction;
- display logical amount and capacity;
- let the player collect corn from it;
- let the transporter load from the same authoritative store;
- make the harvester's arrival a logical batch transfer, with partial/full outcomes;
- remove hard-coded crate coordinates from worker logic.

## 3. Chicken production has no progression state

The current chicken implementation has:

```text
fixed visible chicken count: 3
fixed feed capacity: 12
fixed egg capacity: 12
fixed egg interval: 4500 ms
fixed output: one egg per cycle
```

`LivestockInventory` contains only feed and egg quantities/capacities. There is no coop level or flock-size field.

The runtime timer is also held inside `ExpansionSystem` and the normal snapshot path does not pass its live value, so saves use the fallback egg timer rather than the actual remaining time.

Required correction:

- add persistent chicken-coop level;
- derive visible flock size, batch output, feed target, and capacities from level;
- persist the actual egg-production progress;
- produce only as many eggs as feed and storage permit;
- add a visible upgrade interaction with exact cost and result.

## 4. Wheat expansion is keyboard-hidden and unavailable on mobile

The wheat expansion system runs only when the player is in range and:

```ts
this.cursors.space.isDown
```

Standing on the pad does nothing. Pressing `E` does nothing. There is no camera-fixed action button for touch devices. The world label does not clearly explain that Space must be held.

Corn expansion, by contrast, uses a visible hold progression while standing in its interaction area.

Required correction:

- use one registered interaction and one purchase command;
- support standing hold, `E`, `Space`, click, and tap consistently;
- show progress, next node count, next crate capacity, exact cost, and failure reason;
- prevent double purchase and repeated charge while the player remains on the pad.

## 5. Processing status is a dense raw text dump

The processing panel concatenates construction, machine state, mode, recipe, raw resource IDs, input, output, workers, and result text into one block.

Problems include:

- raw IDs such as `wheat`, `mill-flour`, and `processing-yard` can appear;
- requirements, production state, and finished output are not separated;
- empty and blocked states are visually similar;
- the player cannot quickly answer:
  - what is required;
  - what is being made;
  - what has finished;
  - where to deliver input;
  - where to collect output.

Required correction:

- use localized resource metadata;
- split the panel into `建設`, `製粉機`, `ベーカリー`, and `スタッフ` sections or tabs;
- show recipe input -> output cards;
- show separate input, active-cycle reserved inputs, progress, and output;
- show one next action and guide button at a time;
- keep compact world status panels.

## 6. Carried-item HUD lists only three resources

The cargo state supports eleven resources:

```text
wheat, corn, egg, flour, cornmeal, bread, cornbread,
hay, milk, butter, cheese
```

The HUD text displays only:

```text
麦
とうもろこし
卵
```

The meter also distinguishes wheat and corn, then renders all remaining items as the same generic color. The character stack draws every non-corn/non-egg product as wheat.

Consequences:

- total cargo can be correct while the visible item breakdown is wrong;
- processed and dairy products appear missing or appear as wheat;
- contract and processing actions are hard to reason about.

Required correction:

- build all inventory displays from `RESOURCE_IDS` and `RESOURCE_DEFINITIONS`;
- list every nonzero carried resource;
- guarantee displayed sum equals `getCarriedTotal(cargo)`;
- provide compact overflow handling rather than dropping resource types;
- use resource-specific or category-specific stack art.

## 7. Warehouse, shop, till, and wallet are not clearly separated

The inventory HUD combines carried items and warehouse rows in one card. The upper-right economy card combines shop shelf quantities, uncollected sales, and wallet coins.

The shop display also uses hard-coded capacities instead of the authoritative `state.marketCapacity` values, and dairy resources are omitted.

Required correction:

- label the four concepts explicitly:
  - `持ち物（プレイヤー）`
  - `倉庫（保管済み）`
  - `売り場（お客さん向け）`
  - `未回収売上 / 所持コイン`
- use authoritative capacities and resource metadata;
- show totals and nonzero details;
- allow opening a complete inventory panel from the compact HUD.

## 8. Contract decline can become permanently blocked and fails silently

Declining an offer sets:

```ts
declineCooldownMs = 30000
```

The cooldown is decremented only inside `advanceContractActiveTime(...)`, and that function returns the state unchanged when there is no active contract.

Therefore, after declining while no contract is active, the cooldown may never decrease. A later decline returns an error, but `GameScene.handleContractAction(...)` ignores the error reason and the UI closes. The unchanged card appears to have ignored the click.

A replacement offer can also look similar to the declined offer, while the UI gives no replacement confirmation or contract ID distinction.

Required correction:

- decrement offer cooldown independently of active-contract time, or replace the business cooldown with a short action debounce;
- remove the selected offer immediately;
- generate a distinct replacement ID;
- show `新しい依頼に入れ替えました`;
- show failures inline instead of closing silently;
- test repeated declines with no active contract.

## 9. Contract resource labels and delivery sources are incorrect

The contract generator can request all unlocked resources, including:

```text
flour, cornmeal, bread, cornbread, milk, butter, cheese
```

The contract UI maps only wheat and corn explicitly. Every other key is displayed as `たまご`.

Therefore a flour, bread, milk, butter, or cheese contract may appear to be an egg contract. The delivery logic correctly looks for the actual hidden resource key, so visible eggs are not consumed.

Additionally, `deliverNextContractResourceOne(...)` reads only from the warehouse. Products carried by the player are not deliverable at the dock, even though the player physically brought them there.

Required correction:

- render every resource through `RESOURCE_DEFINITIONS[resource].publicName`;
- show requirement, delivered amount, carried amount, and warehouse amount per resource;
- deliver from player cargo first, then warehouse, using one deterministic round-robin transaction;
- never consume market stock, machine output, coop output, or collection boxes implicitly;
- explain where undeliverable stock is located;
- complete the contract immediately and exactly once when all requirements are met.

## 10. Testing gap

The current browser suite now covers save recovery, wheat batching, processing, and v0.9.5 collection acceptance. It still does not cover the nine manual-play failures above, especially farm-worker Lv3 training, player corn-crate pickup, poultry progression, truthful eleven-resource HUD output, repeated contract decline, and non-egg contract delivery.

v0.9.6 must add browser tests for these visible player flows, not only pure logic.