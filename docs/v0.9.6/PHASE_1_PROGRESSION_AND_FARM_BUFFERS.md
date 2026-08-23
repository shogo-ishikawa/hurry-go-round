# Phase 1 — Progression Transactions & Farm Buffers

Phase 1 fixes coin-consuming progression defects and makes wheat, corn, and poultry progression visibly playable.

## 1. Transaction rule

Every paid progression action must use one transaction result:

```ts
interface ProgressionTransaction<T> {
  changed: boolean;
  previous: T;
  next: T;
  previousWallet: number;
  nextWallet: number;
  cost: number;
  reason?: string;
  prioritySaveRequested: boolean;
}
```

Required invariants:

- `changed === false` implies wallet and state are unchanged;
- `changed === true` implies `previousWallet - nextWallet === cost`;
- the action advances exactly one level or constructs exactly one facility;
- a repeated action at maximum level is a no-op;
- one pointer, key, or hold completion triggers one transaction;
- UI text uses the returned result rather than inferring success.

## 2. Preserve worker level during adaptation

Replace the current `createWorkerProgress(...)` use in training with an adapter equivalent to:

```ts
function toWorkerProgress(
  role: WorkerRoleId,
  current: GameState["workers"][WorkerKey],
): WorkerProgress
```

It must preserve:

- `hired`;
- `level`;
- carried resource;
- carried amount.

Use a second role-safe adapter to apply the result back to `GameState`.

Do not reconstruct a hired worker at level 1 before training.

## 3. Worker training behavior

All five farm roles must support:

```text
unhired -> Lv1 by hire
Lv1 -> Lv2 by first training cost
Lv2 -> Lv3 by second training cost
Lv3 -> no-op, maximum level
```

Exact costs remain:

| Role | Hire | Lv1 -> Lv2 | Lv2 -> Lv3 |
|---|---:|---:|---:|
| Wheat harvester | 40 | 80 | 180 |
| Wheat transporter | 75 | 110 | 240 |
| Corn harvester | 160 | 220 | 450 |
| Corn transporter | 240 | 280 | 560 |
| Poultry caretaker | 300 | 320 | 640 |

After training:

- the panel stays open;
- wallet, level, capacity, speed, and next price refresh immediately;
- show a result such as `麦の収穫スタッフをLv3へ研修しました`;
- show the exact cost used;
- maximum-level buttons are disabled and never charge.

Audit courier and processing-worker training for the same transaction invariants, even if their UI remains in another panel.

## 4. Worker-level runtime verification

Training must change real runtime behavior, not only state text.

Verify at minimum:

- wheat harvester capacities: `4 / 7 / 10`;
- wheat transporter capacities: `6 / 8 / 10`;
- corn harvester capacities: `5 / 6 / 8`;
- corn transporter capacities: `8 / 10 / 12`;
- poultry caretaker capacities: `6 / 8 / 10`;
- configured movement and operation multipliers are consumed by runtime systems.

## 5. Visible corn temporary store

Create a physical corn field crate using the authoritative `corn-field-crate` facility and `collect-corn-crate` interaction.

It must display:

- title: `とうもろこしの集荷箱`;
- amount and capacity;
- visible empty, partial, full states;
- harvester deposit side;
- player pickup side;
- transporter loading side;
- corn-specific art;
- a full-state warning.

This crate is distinct from:

```text
東農地集配ボックス
```

The field crate is a production buffer. The collection box is a logistics facility.

## 6. Corn harvester batch deposit

On reaching the field crate, the corn harvester must transfer its carried batch as one logical transaction.

Possible outcomes:

```text
full batch deposited
partial batch deposited because the crate has limited space
crate full; worker retains all remaining cargo
empty cargo; no crate trip may begin
```

The visual animation may show several corn icons, but the logical state changes once.

Show:

```text
とうもろこしを8個格納しました
```

or the partial/full reason.

Do not continue the current one-unit-at-a-time deposit model.

## 7. Player corn pickup

When the player enters the registered pickup side:

- move corn from `automation.cornFieldCrate` to player cargo;
- update the crate display, cargo HUD, character cargo art, and save dirty state;
- respect shared cargo capacity;
- show `集荷箱が空です` or `持ち物がいっぱいです` when blocked;
- use a station-specific cooldown that resets after leaving or changing stations.

Recommended pickup interval:

```text
160 ms per item
```

The player must be able to use corn automation without hiring the corn transporter.

## 8. Corn transporter compatibility

The transporter must load from the same crate state and same registered point.

Do not maintain separate crate coordinates or duplicate inventories.

Transfers among:

```text
corn harvester cargo
corn field crate
player cargo
corn transporter cargo
warehouse
```

must conserve corn.

## 9. Chicken-coop progression

Add persistent coop progression:

```ts
coopLevel: 0 | 1 | 2 | 3
```

Meaning:

```text
0: chicken coop locked
1: 3 chickens
2: 5 chickens
3: 7 chickens
```

Existing unlocked v0.9.5 coops migrate to level 1.

### Upgrade values

| Coop level | Chickens | Egg batch | Feed capacity | Egg capacity | Upgrade cost |
|---|---:|---:|---:|---:|---:|
| 1 | 3 | 1 | 12 | 12 | 420 to Lv2 |
| 2 | 5 | 2 | 18 | 18 | 900 to Lv3 |
| 3 | 7 | 3 | 24 | 24 | maximum |

Keep the base production interval at 4500 ms for v0.9.6. A cycle consumes one feed per egg produced.

The actual batch is:

```ts
min(configuredBatch, availableFeed, remainingEggStorage)
```

No feed or eggs may be lost when supply or storage is partial.

## 10. Chicken upgrade interaction

Add a clearly separate coop-upgrade board or pad.

Public name:

```text
鶏を増やす
```

Show:

- current and next chicken count;
- current and next egg batch;
- current and next capacities;
- exact cost;
- progress;
- maximum state.

Support:

- standing hold;
- `E`;
- `Space`;
- click/tap action button.

One completed input must produce one purchase.

The visible number of chickens must match the level.

## 11. Poultry caretaker adaptation

Derive caretaker targets from coop level.

Recommended feed targets:

```text
Lv1: 10
Lv2: 15
Lv3: 20
```

Recommended emergency thresholds:

```text
Lv1: 3
Lv2: 5
Lv3: 7
```

The caretaker must continue batch loading and must not revert to one-corn trips.

## 12. Operable wheat expansion

Use the existing values:

| Level | Wheat nodes | Wheat crate capacity | Cost to next |
|---|---:|---:|---:|
| 0 | 30 | 16 | 220 |
| 1 | 42 | 24 | 520 |
| 2 | 54 | 32 | maximum |

Remove Space-only purchase behavior.

The registered expansion interaction must support:

- stand-and-hold purchase;
- `E` and `Space` while in range;
- a camera-fixed click/tap button while in range;
- visible progress ring;
- exact next values and cost;
- insufficient-coin and maximum messages.

The input may arm only once while the player remains inside. Leaving and returning rearms it.

After purchase:

- new nodes appear in both west and central fields;
- crate capacity updates immediately;
- workers can target all new nodes;
- the state is priority-saved;
- no duplicate nodes are created.

## 13. Persistence

Phase 1 introduces schema 8.

Persist:

- `coopLevel`;
- actual egg-production remaining time;
- feed and egg capacities derived from the saved level;
- existing wheat and corn expansion levels;
- worker levels and carried quantities;
- corn field crate amount/capacity.

Do not persist transient progress rings or interaction armed flags.

## 14. Unit tests

Add tests for:

- adapter preserves worker level;
- every role advances Lv1 -> Lv2 -> Lv3;
- repeated Lv2 training does not stay at Lv2;
- maximum training does not charge;
- exact costs;
- corn batch deposit full/partial/full-crate outcomes;
- player corn pickup;
- corn resource conservation;
- coop upgrade exact costs and values;
- partial egg batch with limited feed/storage;
- caretaker targets by coop level;
- wheat expansion through one authoritative transaction;
- schema 7 -> 8 migration.

## 15. Browser E2E

Add scenarios for:

### Training

- hire or seed each worker at Lv1;
- train to Lv2;
- train to Lv3;
- verify exact wallet deductions;
- attempt another training and verify no charge;
- verify panel remains truthful.

### Corn crate

- hire corn harvester;
- run real batch harvesting;
- confirm one batch appears in the visible crate;
- pick up corn with the player;
- verify crate and cargo changes;
- verify transporter can use the same remaining stock.

### Chicken progression

- upgrade to five and seven chickens;
- verify visuals, capacities, feed consumption, and egg batches;
- save/reload at each level.

### Wheat expansion

- buy both levels with mouse/keyboard and touch;
- verify exact nodes/capacities/costs;
- verify maximum no-op;
- save/reload.

Use fixed-step advancement over real production state machines where wall-clock rendering is unstable. Do not directly set transaction results.