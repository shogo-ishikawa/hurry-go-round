# v0.9.7 Final Acceptance

v0.9.7 is not complete merely because TypeScript, unit tests, or the production build pass. The player-facing flows must work in a real browser and on GitHub Pages.

## 1. Automated gate

For each implementation phase:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
npx playwright test --workers=1 --retries=0 --repeat-each=2
```

Required:

```text
CI                     success
E2E Chromium           success
retries                0
skipped tests          0
flaky tests            0
expected failures      0
page errors            0
uncaught console errors 0
```

A local Playwright browser-download failure is not a passing result. The PR remains unmerged until GitHub Actions is green.

## 2. Existing regression coverage

Preserve every existing scenario for:

- primary save, backup rotation, continue;
- corrupt-primary recovery;
- IndexedDB fallback;
- Lv2 and Lv3 wheat batching;
- processing construction and material flow;
- collection construction, panel input, courier runtime, and persistence;
- inventory display and responsive panels;
- contract IDs and repeated decline.

No previous scenario may be removed to reduce runtime.

## 3. Phase 1 browser acceptance

### Inventory ledger

Verify with mixed quantities for all eleven resources:

```text
麦
とうもろこし
たまご
小麦粉
コーンミール
パン
コーンブレッド
干し草
牛乳
バター
チーズ
```

The player must be able to identify:

- exact carried amount;
- exact warehouse amount;
- exact usable total;
- exact other storage locations;
- exact farm-wide total.

The default full-panel view must show carried and warehouse values together.

No nonzero resource may be represented only by `ほか N種類` in the full panel.

### Processing guidance

At every required viewport:

- open processing panel;
- `概要` is reachable and initially visible;
- explanation text is inside visible bounds;
- all recipes are reachable by scrolling or pagination;
- construction, input, reserved, progress, output, and next action are distinguishable;
- no required text sits behind buttons or outside the panel.

## 4. Phase 2 browser acceptance

### Contract delivery

A contract containing a large mixed quantity must be processed in one intentional dock action.

Verify:

- cargo-first source order;
- warehouse fallback;
- all available goods delivered atomically;
- exact partial-delivery remainder;
- immediate completion when fully supplied;
- one reward;
- no repeat delivery while standing on the dock;
- no market or machine stock consumed implicitly.

### Till collection

With a large till balance:

- enter or touch the cash area;
- till becomes zero in one state transition;
- wallet rises by the complete amount;
- one summary appears;
- no quantity-proportional waiting occurs;
- save and reload preserves the result.

## 5. Phase 3 browser acceptance

### Unified wheat field

Verify:

- exactly one wheat-field region exists;
- old west soil and wheat nodes are absent;
- base field contains 30 nodes;
- first expansion creates 42 nodes in the adjacent strip;
- second expansion creates 54 nodes in the adjacent strip;
- field remains visually contiguous;
- production crate, collection box, and expansion pad remain distinct;
- player can reach all interactions;
- wheat workers use one field entry.

### Save migration

Load schema-8 saves with crop states in both old clusters.

Verify:

- schema-9 load succeeds;
- every old crop maps once;
- timers and states survive;
- field level survives;
- crate and worker state survive;
- new save reports schema 9 and v0.9.7;
- second reload is identical.

## 6. Required responsive viewports

```text
1920 x 1080
1440 x 900
844 x 390
390 x 844
320 x 568
```

At every viewport:

- no modal button is outside the screen;
- touch targets are at least 44 CSS pixels high;
- ledger rows can be reached;
- processing explanations can be reached;
- fixed HUD does not block field interaction;
- pointer/tap does not move the farmer through a modal;
- Escape closes modal on keyboard-capable devices.

## 7. Input methods

Verify:

```text
mouse click
trackpad / wheel
keyboard
mobile tap
mobile touch drag
virtual joystick
world tap navigation
```

Modal scrolling and farm movement must not conflict.

## 8. State and transaction invariants

Run deterministic long simulations and validate:

- no negative resource;
- no negative coin value;
- no duplicated resource;
- no duplicated reward;
- no repeated till collection;
- no repeated dock transaction without rearm;
- no duplicate modal listener;
- no worker permanently stuck due to removed field cluster;
- save succeeds after simulation.

## 9. GitHub Pages manual checklist

After each phase merge, open:

```text
https://shogo-ishikawa.github.io/hurry-go-round/
```

### Phase 1

1. Put several different items in carried inventory.
2. Put several different items in the warehouse.
3. Open inventory through carried HUD.
4. Confirm carried and warehouse columns are exact.
5. Open processing overview on desktop.
6. Open processing overview on a phone-size viewport.
7. Scroll through all explanations and recipes.

### Phase 2

1. Accept a mixed contract.
2. Split requirements between carried inventory and warehouse.
3. Enter the contract dock once.
4. Confirm immediate batch delivery and completion.
5. Accumulate a large till balance.
6. Touch the cash area once.
7. Confirm full collection.

### Phase 3

1. Confirm one wheat field.
2. Buy both expansions.
3. Confirm visible contiguous growth.
4. Watch Lv2 and Lv3 wheat workers.
5. Load an older v0.9.6 save.
6. Confirm crop, crate, worker, processing, collection, dairy, and contracts remain intact.

## 10. Final metadata gate

Before tag creation:

```text
package.json version      0.9.7
package-lock version      0.9.7
GAME_VERSION              0.9.7
SAVE_SCHEMA_VERSION       9
title screen              v0.9.7
HUD version               v0.9.7
Pages base                /hurry-go-round/
```

## 11. Tag and release

Only after all automated and Pages gates pass:

```text
Tag: v0.9.7
Target: main
Release title: Hurry-Go-Round v0.9.7
```

Recommended release highlights:

- complete inventory ledger;
- readable processing guidance;
- instant contract batch delivery;
- instant till collection;
- one contiguous expandable wheat field;
- schema-9 migration from v0.9.6.

## 12. Definition of done

A player can, without waiting or guessing:

```text
see what they carry;
see exactly what is in the warehouse;
understand processing;
deliver an available contract batch at once;
collect all sales revenue at once;
manage wheat in one coherent field.
```
