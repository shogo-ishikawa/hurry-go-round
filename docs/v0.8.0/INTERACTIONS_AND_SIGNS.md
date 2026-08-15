# v0.8.0 — Interactions, Signs, and Reachability

## 1. Confirmed implementation problems

The current runtime contains two distinct problems that must be treated as regressions, not optional polish.

### 1.1 Carry-capacity sign bypasses the sign-layout system

`src/game/systems/ExpansionSystem.ts` directly constructs the carry-capacity sign at a fixed world coordinate.

The runtime does not register that sign with `layoutWorldSigns` or any equivalent placement service.

Therefore, the existing pure sign-layout function cannot prevent the carry sign from overlapping:

- another sign;
- the barn area;
- delivery and upgrade interactions;
- the contract board or shipping dock;
- roads or routes;
- new v0.7.0 management UI anchors.

v0.8.0 must make the runtime consume centrally resolved sign placements.

### 1.2 Expanded-worker hiring uses hidden hard-coded circles

`src/game/systems/ExpandedAutomationSystem.ts` currently owns a private hard-coded `PADS` object.

The pads:

- are positioned with literal coordinates;
- use small circles without adequate labels;
- use a different visual radius from the logical 82-unit hire radius;
- do not expose progress, prerequisite, cost, or failure state clearly;
- are not registered with a shared interaction system;
- are not covered by actual-map reachability tests;
- combine hiring and runtime automation in one class.

The user can reach an apparently relevant area without understanding where to stand or why a hire did not occur.

v0.8.0 must remove this hidden interaction model.

## 2. Facility registry

Create one authoritative registry for every major facility and interaction.

A suitable model is:

```ts
interface FacilityDefinition {
  id: FacilityId;
  category: FacilityCategory;
  worldBounds: Rect;
  landmarkPoint: Point;
  signGroupId?: string;
  signPriority: number;
  preferredSignAnchors: readonly SignAnchor[];
  unlocked: (state: GameState) => boolean;
}
```

Every major facility must be registered, including:

```text
barn
delivery-zone
market
cash-pickup
contract-board
contract-dock
harvest-speed-upgrade
carry-capacity-upgrade
wheat-worker-board
wheat-harvest-hire
wheat-transport-hire
wheat-field-crate
east-land-gate
corn-field
corn-worker-board
corn-harvest-hire
corn-transport-hire
corn-field-crate
south-land-gate
chicken-coop
feed-trough
egg-storage
poultry-worker-board
poultry-caretaker-hire
operations-office
```

Coordinates, bounds, and sign groups must not be redefined separately in unrelated systems.

## 3. Interaction registry

Create one authoritative interaction registry.

Recommended model:

```ts
type InteractionKind =
  | "hold-purchase"
  | "hold-hire"
  | "hold-training"
  | "automatic-transfer"
  | "open-panel"
  | "collect"
  | "deliver";

interface InteractionDefinition {
  id: InteractionId;
  facilityId: FacilityId;
  kind: InteractionKind;

  center: Point;
  radius: number;
  visibleRadius: number;

  title: string;
  shortLabel: string;
  icon: FacilityIconId;

  prerequisite: (state: GameState) => InteractionAvailability;
  action: InteractionActionId;

  holdDurationMs?: number;
  priority: number;
}
```

`visibleRadius` and `radius` should normally be identical.

If they differ for art reasons, the visible floor graphic must fully contain the logical range and the difference must be documented.

No interactive circle may exist without a registry entry and visible representation.

## 4. Interaction availability

Use an explicit result rather than a boolean.

```ts
type InteractionAvailability =
  | { available: true }
  | { available: false; reason: AvailabilityReason };

type AvailabilityReason =
  | "land-locked"
  | "prerequisite-worker-missing"
  | "already-owned"
  | "insufficient-coins"
  | "maximum-level"
  | "save-loading"
  | "paused";
```

Public Japanese labels must be mapped centrally.

Examples:

```text
東農地を購入すると利用できます
先にとうもろこし収穫スタッフを雇ってください
雇用済みです
あと 45 コイン必要です
最大レベルです
```

Failed operations must never silently reset the hold timer without feedback.

## 5. Runtime sign-layout integration

The current pure `layoutWorldSigns` function may be extended or replaced, but its result must be used to position the actual `WorldSign` objects.

Required process:

1. Register all facility bounds and sign definitions.
2. Build obstacle rectangles from buildings, roads, routes, interaction zones, and reserved areas.
3. Resolve sign placement deterministically.
4. Instantiate or reposition runtime sign objects using the resolved result.
5. Recalculate only when relevant facilities unlock, disappear, resize, or change grouping.
6. Apply LOD without creating new signs every frame.

A unit-tested algorithm that is bypassed by hard-coded signs does not satisfy this milestone.

## 6. Sign groups

Nearby facilities must share management signs.

### 6.1 Original farm group

Use one main board:

```text
農場管理
強化・スタッフ
```

This group covers:

- harvest-speed upgrade;
- carry-capacity upgrade;
- wheat harvest worker;
- wheat transport worker.

The individual floor pads use icons and short state labels, not separate full-size boards.

The carry-capacity upgrade must no longer own an independent large sign at the old fixed coordinate.

### 6.2 East-field group

Use one main board:

```text
東農地管理
とうもろこし自動化
```

This group covers:

- corn harvest worker;
- corn transport worker;
- corn field crate status.

### 6.3 Poultry group

Use one main board:

```text
鶏小屋管理
餌・卵・スタッフ
```

This group covers:

- feed trough;
- egg storage;
- poultry caretaker.

The feed and egg facilities remain visually distinct and do not share one interaction circle.

## 7. Required sign spacing

Increase the required world-space gap to:

```ts
signMinimumGap: 40
```

The actual production-map test may require a greater gap for specific clusters.

Sign rectangles must not overlap after expansion by the configured gap.

Signs must also avoid:

- facility bounds;
- interaction circles converted to bounding boxes;
- the center line of a road;
- contract customer and worker routes;
- the contract board and dock;
- locked gates;
- the player spawn area;
- the chicken activity area;
- the customer queue.

## 8. Screen-space validation

World-space non-overlap alone is insufficient when full-detail signs appear at different camera zooms.

Add a deterministic projection helper that can test sign rectangles at representative camera zooms.

At minimum, validate:

```text
zoom 1.0
zoom 1.25
zoom 1.5
zoom 1.8
```

The carry-upgrade sign regression must be tested at the zoom used for:

```text
1440 × 900
844 × 390
390 × 844
```

## 9. Sign LOD

Retain or improve the v0.6.0 LOD policy.

Recommended states:

```ts
type SignLod =
  | "hidden"
  | "icon"
  | "compact"
  | "detail"
  | "operation";
```

Recommended behavior:

- far: landmark icon only or hidden;
- medium: icon and short title;
- near: title and short subtitle;
- interaction range: hide long details and emphasize the floor pad or progress;
- menu open: reduce opacity of signs behind camera-fixed panels.

Within one sign group, show at most one full-detail board at a time.

## 10. Carry-capacity upgrade regression fix

The carry-capacity upgrade must be defined as an interaction under the original farm management group.

Required visual elements:

- basket icon on the floor pad;
- next capacity;
- exact coin cost;
- hold-progress arc;
- insufficient-funds state;
- maximum state;
- success animation.

Required Japanese text:

```text
背負い籠を大きくする
12 → 18
60コイン
```

```text
18 → 24
140コイン
```

```text
最大容量
24個
```

The detailed text should appear in a contextual panel or management board rather than as a second full-size nearby sign.

## 11. Hiring-pad presentation

Every worker hire must use a visible pad with:

- a role-specific icon;
- a clear border;
- a logical and visual radius match;
- a locked state;
- an available state;
- an insufficient-funds state;
- a hold-progress state;
- a hired state.

Suggested role icons:

```text
wheat harvester: sickle + wheat
wheat transporter: cart + wheat
corn harvester: sickle + corn
corn transporter: cart + corn
poultry caretaker: person + chicken
```

Do not rely on color alone.

## 12. Hiring input behavior

Hiring must support:

- standing in the on-site circle for 900 ms;
- clicking/tapping the corresponding action in the operations panel while near the operations board;
- keyboard `E` or `Space` confirmation when the focused action is available;
- touch confirmation through the camera-fixed action button.

All routes must invoke the same pure hire transaction.

Holding on a locked or unaffordable action must not charge money.

After a failed attempt:

- keep the reason visible for at least 1.5 seconds;
- do not restart progress automatically every frame;
- require leaving/re-entering or an explicit retry after the message cooldown.

## 13. Reachability

Every interaction pad must be reachable by all movement systems:

- WASD;
- arrow keys;
- fixed joystick;
- drag-direction movement;
- click/tap point movement.

An interaction is invalid if it lies:

- inside a locked parcel before the prerequisite unlock;
- behind an impassable fence without a gate;
- under a building footprint;
- inside the pond;
- inside another mutually exclusive interaction;
- outside camera or movement bounds.

Create a pure reachability check for the authored map rectangles and gates.

General pathfinding is not required.

## 14. Facility locator

The operations panel must allow a player to select a facility or worker action.

Selection creates:

- a world marker at the facility;
- an off-screen directional arrow when appropriate;
- a short Japanese label;
- no teleportation.

The marker disappears when:

- the player reaches the facility;
- the player selects another facility;
- the panel is closed and the user cancels guidance;
- the target becomes irrelevant after purchase or hire.

## 15. Public UI language

All public interaction, sign, availability, and progress strings must be Japanese and centralized.

Internal IDs remain English.

Do not expose:

- enum values;
- coordinate values;
- internal action IDs;
- debug names.

## 16. Required pure logic

Implement or extend pure logic equivalent to:

```ts
resolveFacilitySigns(...)
projectSignRect(...)
validateNoSignOverlap(...)
validateInteractionReachability(...)
getInteractionAvailability(...)
advanceHoldInteraction(...)
completeInteractionTransaction(...)
selectFacilityLocatorTarget(...)
```

Required properties:

- deterministic;
- Phaser-independent;
- no negative timer values;
- no duplicate completion;
- no repeated charge;
- explicit failure reason;
- unrelated state preserved.

## 17. Required regression tests

Use the actual production facility and interaction definitions.

At minimum:

- carry-capacity upgrade sign does not overlap any other production sign;
- carry-capacity upgrade sign does not overlap the contract board or dock;
- carry-capacity interaction remains reachable;
- corn harvest hire pad is visible and reachable after east-field unlock;
- corn transport hire pad is visible and reachable after corn-harvester hire;
- caretaker hire pad is visible and reachable after coop unlock;
- logical and visual radii match;
- failed hire does not deduct coins;
- successful hire deducts exact cost once;
- hold completion cannot fire twice;
- on-site and operations-panel hires produce identical state;
- all production signs satisfy the configured gap;
- sign layout remains deterministic;
- no required sign is silently dropped;
- collapsed icon signs remain discoverable through contextual guidance.
