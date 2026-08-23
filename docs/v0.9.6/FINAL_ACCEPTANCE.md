# v0.9.6 Final Acceptance and Release Gates

This document is the authoritative completion gate for Hurry-Go-Round v0.9.6.

A phase is not complete because a state field exists, a unit test passes, or TypeScript compiles. The reported player flow must work through the visible game on Chromium and GitHub Pages.

## 1. Required command gate

Every phase must run:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2
```

Required result:

```text
all TypeScript checks pass
all unit tests pass
production build passes
all existing and new E2E tests pass on the first attempt
repeat-each=2 passes every execution
0 skipped
0 flaky
0 expected failures
```

The E2E workflow must continue to run on:

```text
pull_request
push to main
workflow_dispatch
```

A local inability to download Chromium is not a passing E2E result.

## 2. Phase order

Implement and merge in this exact order:

```text
Phase 1 — Progression Transactions & Farm Buffers
Phase 2 — Inventory Truth & Processing Information
Phase 3 — Contract Truthfulness & Final Release
```

For every phase:

1. start a new Codex task from the latest `main` after the previous phase;
2. keep `main` frozen while Codex works;
3. create one focused PR;
4. keep Playwright retries at zero;
5. correct failed CI/E2E in the same task and same PR;
6. merge only after CI and E2E are green;
7. wait for the Pages deployment;
8. complete the phase-specific manual Pages checks before starting the next phase.

## 3. Existing regression suite

Preserve every E2E scenario already merged for:

```text
save and continue
backup recovery
localStorage fallback
wheat Lv2 batch
wheat Lv3 batch
processing construction
processing material flow
processing persistence
collection acceptance, if added before implementation starts
```

Do not remove or weaken an existing assertion to make v0.9.6 pass.

## 4. Phase 1 acceptance — worker transactions

For each role:

```text
wheat harvester
wheat transporter
corn harvester
corn transporter
poultry caretaker
```

verify through the visible training UI:

```text
unhired -> Lv1
Lv1 -> Lv2
Lv2 -> Lv3
Lv3 -> maximum no-op
```

For every transition:

- display the current level before purchase;
- display the exact price;
- deduct the exact price once;
- advance exactly one level;
- refresh the panel without requiring it to be reopened;
- display the new capacity and next cost;
- priority-save the changed state;
- maximum/no-op actions do not deduct coins;
- closing and reopening the panel shows the same level.

Runtime verification:

| Role | Lv1 | Lv2 | Lv3 |
|---|---:|---:|---:|
| Wheat harvester capacity | 4 | 7 | 10 |
| Wheat transporter capacity | 6 | 8 | 10 |
| Corn harvester capacity | 5 | 6 | 8 |
| Corn transporter capacity | 8 | 10 | 12 |
| Poultry caretaker capacity | 6 | 8 | 10 |

A trained worker must consume its configured speed and operation multipliers in the actual runtime.

## 5. Phase 1 acceptance — corn field crate

Verify the world contains two visibly distinct facilities:

```text
とうもろこしの集荷箱
東農地集配ボックス
```

The field crate must:

- be visible whether empty, partial, or full;
- display amount and authoritative capacity;
- receive one logical batch from the corn harvester;
- support full, partial, and crate-full outcomes;
- never accept an empty harvester trip;
- allow player pickup without hiring a transporter;
- allow the transporter to load the same remaining stock;
- update player cargo art and HUD immediately;
- preserve corn across every transfer.

Required capacities by corn-field level:

```text
20 / 28 / 36
```

## 6. Phase 1 acceptance — poultry progression

Verify:

| Coop level | Visible chickens | Egg batch | Feed cap | Egg cap |
|---|---:|---:|---:|---:|
| 1 | 3 | 1 | 12 | 12 |
| 2 | 5 | 2 | 18 | 18 |
| 3 | 7 | 3 | 24 | 24 |

Exact upgrade costs:

```text
Lv1 -> Lv2: 420 coins
Lv2 -> Lv3: 900 coins
Lv3: maximum, no charge
```

Acceptance:

- the upgrade location is visible and named `鶏を増やす`;
- current and next values are shown;
- standing hold, `E`, `Space`, click, and tap work;
- one completed input triggers one transaction;
- visible chicken count updates immediately;
- egg cycles consume one feed per egg actually produced;
- partial feed or storage produces a partial batch without loss;
- caretaker feed targets scale with coop level;
- save/reload preserves level, capacities, feed, eggs, and actual remaining egg time.

## 7. Phase 1 acceptance — wheat expansion

Verify the visible expansion interaction supports:

```text
standing hold
E
Space
mouse click
mobile tap
```

Exact progression:

| Level | Nodes | Crate capacity | Cost |
|---|---:|---:|---:|
| 0 | 30 | 16 | 220 to Lv1 |
| 1 | 42 | 24 | 520 to Lv2 |
| 2 | 54 | 32 | maximum |

After each purchase:

- coins decrease once;
- new wheat nodes appear in both fields;
- the logical crop list contains the exact count;
- workers can reach all active nodes;
- crate capacity updates;
- no duplicate crop ID appears;
- state survives save/reload;
- maximum action is a no-op.

## 8. Phase 1 migration acceptance

Load representative schema-7 saves with:

- coop locked and unlocked;
- workers at Lv1, Lv2, and Lv3;
- partial worker cargo;
- partial feed and eggs;
- wheat/corn field expansions;
- non-empty field crates;
- active contracts and processing.

Verify:

- unlocked coop migrates to level 1;
- locked coop migrates to level 0;
- every worker level remains unchanged;
- quantities remain valid;
- actual/default egg timer is valid;
- obsolete positive decline cooldown cannot block the player;
- no unrelated state is regenerated or lost.

## 9. Phase 2 acceptance — carried inventory

For every resource:

```text
wheat
corn
egg
flour
cornmeal
bread
cornbread
hay
milk
butter
cheese
```

place a nonzero amount in player cargo and verify:

- correct Japanese name;
- correct count;
- carried total equals the sum of displayed rows;
- capacity is correct;
- no item is displayed as wheat or egg by fallback;
- character cargo art uses the correct category;
- compact overflow uses `ほか N種類` rather than omitting the existence of stock;
- the full inventory panel shows every nonzero item.

## 10. Phase 2 acceptance — location clarity

The UI must distinguish:

```text
持ち物（プレイヤーが運搬中）
倉庫（納品済み）
売り場（お客さん向け）
未回収売上
所持コイン
生産設備内
集荷・集配
```

Verify:

- the upper-right card is explicitly a shop/economy card, not a warehouse;
- warehouse total and rows use authoritative barn state;
- shop total and capacities use `state.marketCapacity`;
- till and wallet have separate labels;
- processed and dairy stock appears when nonzero;
- clicking/tapping compact HUD opens the full inventory panel;
- no HUD region causes world movement.

## 11. Phase 2 acceptance — processing information

The processing panel must contain clear sections or tabs for:

```text
建設
製粉機
ベーカリー
スタッフ
```

For mill and bakery verify:

- localized recipe names;
- input requirements;
- input-buffer quantities;
- reserved/active-cycle ingredients;
- progress and remaining time;
- output-buffer quantities;
- selected mode;
- one primary next action;
- input and output guide buttons;
- correct empty/full/blocking messages.

The panel must explain the transition:

```text
input buffer -> reserved for active cycle -> output buffer
```

Raw IDs such as `mill-flour`, `wheat`, or `processing-yard` must not appear in player-facing text.

## 12. Phase 2 responsive acceptance

Required viewports:

```text
1920 x 1080
1440 x 900
844 x 390
390 x 844
320 x 568
```

Verify:

- compact cards fit;
- detail panels scroll or paginate;
- buttons remain at least 44 CSS pixels high;
- no critical row is clipped;
- processing tabs and inventory tabs remain operable by mouse, touch, and keyboard.

## 13. Phase 3 acceptance — decline replacement

With no active contract:

1. record all three offer IDs;
2. decline one through the visible `見送る` button;
3. confirm that exact ID disappears immediately;
4. confirm one new, different ID appears;
5. confirm offer count remains three;
6. confirm `offersDeclined` increases once;
7. decline another offer immediately after the UI debounce;
8. confirm it also works;
9. save/reload and verify the replaced set remains.

The panel must show an inline success or failure result and must not silently close on failure.

## 14. Phase 3 acceptance — truthful resource names

Generate or seed contracts for every eligible resource.

Verify every requirement uses its true name. In particular:

```text
小麦粉 is not たまご
パン is not たまご
牛乳 is not たまご
バター is not たまご
チーズ is not たまご
```

Offer and active-contract cards show:

- ID;
- required amount;
- delivered amount;
- carried amount;
- warehouse amount;
- missing amount.

## 15. Phase 3 acceptance — delivery

Verify true contracts for:

```text
egg only
processed product
Dairy product
mixed up to three resources
```

Delivery rules:

- consume player cargo first;
- then consume warehouse stock;
- never consume shop, machine, field crate, collection box, egg storage, milk tank, or workshop output implicitly;
- update cargo art/HUD when cargo is used;
- show resource and source in the feedback;
- no stock produces a clear missing-resource message;
- final delivery completes once;
- reward, bonus, reputation, and statistics are applied once;
- save/reload mid-contract preserves cursor and delivered progress.

## 16. Contract cancellation acceptance

Cancel a partially delivered mixed contract.

Verify:

- every delivered resource is returned to warehouse;
- exact returned amounts are shown;
- no duplication or loss occurs;
- statistics increase once;
- active contract clears.

## 17. Cross-system resource invariants

Run deterministic transfer accounting for all resources.

For a resource such as wheat, total accounting must include where applicable:

```text
player cargo
worker cargo
field crate
transport cargo
collection box
courier cargo
processing intake
machine input
active-cycle reserved input
machine output
warehouse
shop
contract delivered
```

Allowed total changes are only:

- harvest/production creation;
- customer sale consumption;
- contract completion consumption already represented by delivered stock;
- recipe conversion according to defined inputs and outputs.

Transfers must conserve resource totals.

No quantity may become negative.

## 18. Long-run acceptance

Run at least a 30-minute-equivalent deterministic simulation with:

- all farm workers at Lv3;
- maximum wheat and corn fields;
- coop level 3;
- processing active;
- collection courier active;
- contracts active;
- dairy active;
- customers active where practical.

Verify:

- no negative inventory;
- no duplicate paid transaction;
- no permanently stuck worker or courier;
- no runaway event listeners;
- no unbounded temporary objects;
- no repeated console error;
- no silent processing/contract deadlock;
- save/reload remains valid afterward.

## 19. GitHub Pages manual gate

After each phase merge, require:

```text
CI success
E2E Chromium success
Deploy GitHub Pages success
```

Then repeat the reported scenario on the deployed Pages site using desktop and at least one smartphone viewport.

Do not begin the next phase until the previous phase is usable on Pages.

## 20. Final release checklist

Before tagging v0.9.6:

- all three implementation PRs are merged;
- `package.json` and lockfile show `0.9.6`;
- title screen and HUD show `v0.9.6`;
- save schema is `8`;
- schema-7 save migration is verified;
- JSON export/import is verified;
- all required checks are green on `main`;
- Pages manual acceptance is complete;
- no known release blocker remains;
- Pages base remains `/hurry-go-round/`.

Only then create:

```text
tag: v0.9.6
release title: Hurry-Go-Round v0.9.6
```