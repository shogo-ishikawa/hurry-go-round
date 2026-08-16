# Phase 3 — Collection Discoverability & Management UI

This phase makes every local collection box discoverable and makes the collection-hub panel reliably operable by mouse, touch, and keyboard.

## 1. Planned and built states for every collection facility

Every collection facility must have two visible world states:

```text
planned / unbuilt
built / operational
```

Required facilities:

```text
collection hub
wheat collection box
corn collection box
egg collection box
processing intake box
pasture collection box
dairy collection box
```

v0.9.5 must at minimum correct the wheat, corn, and egg boxes reported by the player. Existing dairy collection facilities must remain compatible.

## 2. Why boxes are currently hard to find

The current facility view hides local boxes until their `built` state is true.

The logical construction interaction can therefore exist at a coordinate with no visible planned object.

v0.9.5 must render unbuilt foundations whenever the corresponding land and prerequisite state makes the facility relevant.

## 3. Planned collection-box presentation

Each unbuilt box must show:

- low wooden foundation;
- resource icon;
- muted box silhouette;
- construction pad;
- exact cost;
- prerequisite state;
- short sign;
- route arrow toward the hub or farm road.

Suggested labels:

```text
麦畑集配ボックス
180コイン
```

```text
東農地集配ボックス
260コイン
```

```text
鶏小屋集配ボックス
280コイン
```

When locked:

```text
東農地を購入すると建設できます
```

or:

```text
先に集配所を建設してください
```

## 4. Construction visibility order

### Before processing yard

Show the planned collection-hub location in muted form.

Hint:

```text
加工場の解放後に集配所を建設できます
```

### After processing yard

Show the active collection-hub construction pad and exact 600-coin cost.

### After hub construction

Show planned local boxes for every unlocked production area:

- wheat box always;
- corn box after east field unlock;
- egg box after chicken coop unlock;
- pasture/dairy boxes according to existing dairy prerequisites.

Do not require the player to discover an invisible circle.

## 5. Wheat collection-box relocation

Use the shared v0.9.5 farm layout.

The wheat collection box must move with the relocated wheat area.

It must be placed:

- beside a farm road;
- outside the wheat-worker crate radius;
- outside wheat-node bounds;
- outside the training-lodge entrance;
- reachable from both wheat fields;
- clearly distinct from the worker crate.

Use different names and visual forms:

```text
麦の集荷箱
worker production buffer

麦畑集配ボックス
player/courier logistics facility
```

Do not use identical crate art for both.

## 6. Corn collection-box discoverability

The corn box must remain near the corn road and outside crop rows.

Before construction:

- show planned foundation;
- show corn icon;
- show exact cost;
- show build pad;
- show `集配所が必要` if hub is missing.

After construction:

- show live corn count;
- show deposit side;
- show withdraw side;
- show courier pickup side.

## 7. Egg collection-box discoverability

The egg box must remain visually separate from the egg-storage collection point.

Use distinct labels:

```text
卵置き場
chicken production output

鶏小屋集配ボックス
logistics storage
```

Interaction zones must not overlap substantially.

## 8. Collection facility registry

Create one authoritative collection-facility definition source.

Conceptual structure:

```ts
interface CollectionFacilityDefinition {
  id: CollectionFacilityId;
  source?: CollectionSourceId;
  facilityId: FacilityId;
  buildInteractionId?: InteractionId;
  depositInteractionId?: InteractionId;
  withdrawInteractionId?: InteractionId;
  cost: number;
  capacity: number;
  prerequisites: CollectionPrerequisite[];
  plannedVisual: PlannedFacilityStyle;
  builtVisual: BuiltFacilityStyle;
}
```

The following must consume the same definition:

- world view;
- build transaction;
- contextual hint;
- collection management panel;
- facility guide;
- E2E selectors;
- tests.

Do not keep costs or capacities separately hard-coded in UI strings.

## 9. Reusable modal panel

Replace ad hoc collection-panel controls with a reusable modal component.

Recommended structure:

```text
ModalPanel
UiButton
UiToggleGroup
UiStatusBanner
UiScrollableContent
```

### Modal requirements

- fixed to camera;
- explicit high depth;
- backdrop below all panel controls;
- panel and controls remain active while the game scene is paused;
- correct resize and orientation handling;
- scroll or pagination on short portrait screens;
- no clipping;
- closing returns focus to the game.

### Button requirements

- rectangle hit area at least 44 CSS pixels high;
- label centered inside;
- pointer over/down/up feedback;
- touch feedback;
- disabled appearance;
- disabled reason text;
- keyboard focus;
- Enter/Space activation;
- explicit depth above backdrop;
- stable test ID or accessible name.

Do not use text glyph bounds alone as the hit area.

## 10. Command result contract

The collection panel must not emit a command and immediately close.

Introduce a command result model equivalent to:

```ts
interface CollectionCommandResult {
  changed: boolean;
  command: CollectionCommand;
  reason?: CollectionCommandFailure;
  message: string;
}
```

Possible commands:

```text
build hub
build local box
hire courier
train courier
change routing mode
flush one source
locate facility
```

Possible failure reasons:

```text
prerequisite missing
insufficient coins
already built
already hired
maximum level
source empty
facility unavailable
```

The authoritative system executes the command and emits the result.

The panel remains open and displays the result.

Examples:

```text
集配スタッフを雇用しました
480コインを使用しました
```

```text
配送モードを「加工場優先」に変更しました
```

```text
あと120コイン必要です
```

## 11. Live collection panel

The panel must refresh from authoritative `GameState` after every action.

Display:

```text
wallet coins
hub state
routing mode
courier level and status
courier load
all collection-box build states
all collection-box quantities
processing intake quantity
current source
current destination
last action result
```

The panel must include separate sections:

```text
施設
集配スタッフ
配送設定
緊急操作
```

## 12. Facility construction from panel

Allow two paths:

### On-site construction

Stand on the visible planned pad and hold to build.

### Management-panel construction

For an unlocked and reachable facility, the panel may offer a `建設` button using the exact same pure transaction.

This prevents a player from being blocked by a hard-to-find location while preserving on-site world interaction.

After remote construction, offer:

```text
現地へ案内
```

Do not maintain separate price or prerequisite logic for panel and on-site construction.

## 13. Routing-mode controls

Replace one cycling button with three explicit options:

```text
自動
加工場優先
倉庫優先
```

Show the selected state visually.

Pressing the already selected option must not create a save or misleading success message.

Mode change must remain visible without closing the panel.

## 14. Courier controls

Courier section must show:

```text
未雇用 / Lv1 / Lv2 / Lv3
hire or training cost
capacity
move speed
load/unload interval
current stage
current load by resource
```

Buttons:

```text
雇用
研修
最大レベル
現地へ案内
```

The selected action must show success/failure inline.

## 15. Emergency transfer controls

Do not provide only one wheat-specific emergency button.

Show one button per available source:

```text
麦を倉庫へ移す
とうもろこしを倉庫へ移す
たまごを倉庫へ移す
```

Dairy sources may be included when built.

Each button must show:

- current source amount;
- destination;
- disabled state when empty;
- confirmation for large transfers if appropriate;
- exact transferred count after completion.

Use atomic pure logic and preserve resource totals.

## 16. World guidance

The collection panel must provide `現地へ案内` for:

```text
collection hub
wheat collection box
corn collection box
egg collection box
processing intake
courier current target
```

Guide behavior:

- close/minimize the panel;
- set a destination marker;
- label the destination;
- clear on arrival;
- never guide into a locked region.

## 17. Collection-box transfer feedback

When the player deposits into a local box:

- highlight deposit side;
- animate the source icon into the box;
- decrease cargo visibly;
- increase box fill visibly;
- show a short amount label.

When withdrawing:

- use the opposite side or distinct arrow;
- animate the item to the player;
- respect shared cargo capacity;
- show full/empty reason.

## 18. UI event lifecycle

Ensure listeners are registered and removed exactly once.

Do not create duplicate collection-action listeners after scene restart or continue-from-save.

Add tests or instrumentation for:

- one command produces one state transition;
- one command deducts coins once;
- one button click emits one command;
- reopening the panel does not duplicate listeners;
- pause/resume does not disable buttons.

## 19. Pointer and touch acceptance

The collection panel must work with:

- desktop mouse;
- trackpad;
- mobile tap;
- keyboard navigation;
- Enter and Space activation.

Touch targets must remain separated on 390×844 and 320×568.

If content is taller than the panel, provide scrolling or tabs rather than placing buttons outside the viewport.

## 20. Pure logic

Add or consolidate pure functions equivalent to:

```ts
getCollectionFacilityAvailability(...)
buildCollectionFacility(...)
executeCollectionCommand(...)
flushCollectionSourceToBarn(...)
getCollectionPanelViewModel(...)
getCollectionGuideTarget(...)
```

The view model must provide already localized or localization-key-based labels and disabled reasons.

## 21. Tests

Add deterministic tests for:

- planned state visibility according to prerequisites;
- exact construction costs;
- panel and on-site construction using the same transaction;
- no double purchase;
- exact one-time coin deduction;
- routing-mode selection;
- no-op when selecting existing mode;
- courier hire/train result;
- emergency transfer for each source;
- resource invariant;
- guide target resolution;
- event listener count after reopen/restart;
- modal button hit areas above backdrop;
- responsive panel layout.

## 22. Browser E2E

Add E2E tests that interact with visible buttons rather than calling collection logic directly.

### Mouse scenario

1. Open the collection panel.
2. Click each routing-mode option.
3. Confirm selected state changes and panel stays open.
4. Hire courier.
5. Confirm wallet and courier state update.
6. Train courier.
7. Confirm level update.
8. Trigger an emergency resource transfer.
9. Confirm quantity changes and result message.

### Touch scenario

Use a mobile viewport and tap the same controls.

Confirm:

- no backdrop interception;
- no missed action;
- no off-screen buttons;
- no immediate unexplained panel closure.

### Construction discovery scenario

1. Begin with hub unbuilt.
2. Confirm planned hub is visible.
3. Build hub.
4. Confirm planned wheat box is visible.
5. Unlock corn and confirm planned corn box is visible.
6. Unlock poultry and confirm planned egg box is visible.
7. Build all three.
8. Save and reload.
9. Confirm all three remain built and visible.
