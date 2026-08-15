# v0.6.0 — Mixed Cargo, UI, Signs, and Art

## 1. Mixed player cargo

Replace the single-resource carried model with:

```ts
interface CarriedCargo {
  amounts: ResourceAmounts;
  capacity: number;
}
```

Resources remain:

```ts
type ResourceId = "wheat" | "corn" | "egg";
```

The player may carry all three at once. Capacity applies to the sum:

```text
wheat 5 + corn 4 + egg 3 = 12 / 12
```

Retain carry levels:

```text
Level 0: 12
Level 1: 18
Level 2: 24
```

Create pure functions equivalent to:

```ts
getCarriedTotal(...)
getRemainingCargoCapacity(...)
canAddCargo(...)
addCargoOne(...)
removeCargoOne(...)
transferCargoOne(...)
unloadNextCargoOne(...)
getAvailableCargoResources(...)
```

Rules:

- no Phaser dependency
- no negative quantities
- never exceed shared capacity
- resource operations preserve unrelated resources
- failed operations return explicit reasons
- no independently mutable total count

## 2. Remove duplicated mutable inventory

The current code retains older single-resource fields alongside resource-keyed state. Refactor so each value has one authoritative owner.

Do not retain independent mutable duplicates such as:

```text
inventory.carried and cargo.amounts.wheat
inventory.barn and barn.wheat
inventory.market and market.wheat
inventory.capacity and cargo.capacity
```

Recommended conceptual state:

```ts
interface GameState {
  cargo: CarriedCargo;

  storage: {
    barn: ResourceAmounts;
    market: ResourceAmounts;
    marketCapacity: ResourceAmounts;
  };

  livestock: LivestockState;
  automation: AutomationState;
  workers: WorkerHiringState;
  landExpansion: LandExpansionState;
  upgrades: UpgradeState;
  economy: EconomyState;
}
```

Compatibility adapters may exist temporarily, but duplicated values must not remain independently mutable.

## 3. Mixed collection and feeding

Wheat harvesting, corn harvesting, egg collection, wheat-crate pickup, and corn-crate pickup all add to the shared cargo if space remains.

Chicken feeding removes **corn only** and preserves wheat and eggs.

Examples:

```text
cargo before: wheat 5, corn 4, egg 2
feed one corn
cargo after:  wheat 5, corn 3, egg 2
```

## 4. Round-robin barn unloading

Unload mixed cargo one unit at a time in this repeating order:

```text
wheat → corn → egg → wheat → ...
```

Skip zero resources.

Each transfer:

- subtracts exactly one selected cargo item
- adds exactly one corresponding barn item
- preserves all other resources
- preserves total quantity across cargo and barn
- updates farmer art and HUD
- produces one bounded transfer effect
- stops if the player leaves the area
- stops when cargo is empty

Do not unload all cargo instantaneously.

## 5. Farmer mixed-cargo art

Replace `setCarried(count, resource)` with an API such as:

```ts
setCargo(amounts: ResourceAmounts, capacity: number): void;
```

Visual composition should show:

- wheat bundles on one side
- corn grouped in a central or upper section
- egg crates on the other side

Adapt positions for front, back, left, and right facing.

Required visual states:

- empty basket
- low load
- half load
- nearly full
- full
- mixed-resource load
- maximum-capacity load

At full capacity, show a clear full marker such as a red strap or small flag.

Do not build a tall unstable tower at capacity 24. Aggregation is acceptable, but each carried resource type must remain visible.

## 6. Mixed-cargo HUD

Desktop example:

```text
背負い籠　15 / 18
麦　　　　　 7
とうもろこし　5
たまご　　　 3
```

Include original resource icons and one shared capacity meter. Use resource-specific segment colors or grouped icon counts.

Empty state:

```text
背負い籠
空　0 / 18
```

Mobile landscape may use:

```text
麦7　とう5　卵3
```

Mobile portrait may use two or three compact lines.

Requirements:

- no clipping
- no off-screen content
- no joystick overlap
- no world movement initiated from HUD gestures
- capacity 12, 18, and 24 render correctly

## 7. Central sign-placement system

Stop allowing independent systems to place fixed-position signs without coordination.

Create a central mechanism such as:

```text
SignLayoutSystem
WorldSignRegistry
FacilitySignManager
```

Suggested definition:

```ts
interface WorldSignDefinition {
  id: string;
  facilityId: string;
  priority: number;
  preferredAnchors: SignAnchor[];
  facilityBounds: Rect;
  interactionBounds?: Circle | Rect;
  icon: SignIconId;
  title: string;
  subtitle?: string;
  persistent: boolean;
}
```

Candidate anchors:

```text
north, north-east, east, south-east,
south, south-west, west, north-west
```

A valid sign must not overlap:

- another sign
- buildings
- interaction zones
- locked gates
- the center of roads
- customer queues
- worker routes
- the main chicken activity area
- feed or egg interaction zones

Minimum sign gap:

```ts
signMinimumGap: 24
```

If no full sign placement exists:

1. collapse a lower-priority sign to icon-only mode
2. combine signs in the same facility group
3. move detail into contextual guidance
4. never leave overlapping signs

Recalculate placement only at initialization or structural changes such as land unlock or facility creation.

## 8. Facility-group boards

Use shared management boards for nearby interactions.

Existing farm:

```text
農場管理
強化・スタッフ
```

East field:

```text
東農地管理
とうもろこし自動化
```

Chicken coop:

```text
鶏小屋管理
餌・卵・スタッフ
```

Use icon floor pads for individual interactions. Put costs and details in contextual hints rather than separate large signs.

## 9. Sign LOD

Recommended thresholds:

```ts
signFullDetailDistance: 400
signCompactDistance: 850
```

Far distance (`> 850`):

- hide ordinary signs
- major gates may retain small icons
- no detailed text

Medium distance (`400–850`):

- show sign structure
- facility icon
- short title
- hide or abbreviate subtitle

Near distance (`< 400`):

- title
- short subtitle
- contextual hint panel

Inside interaction range:

- hide long explanatory text
- show progress, quantity changes, transfers, or short status
- sign may become slightly transparent if it obstructs the player

## 10. Sign visual categories

Land purchase:

- larger agricultural sign
- lock and coin icons
- strong support posts
- unlocked state or removal after purchase

Production:

- crop or animal icon
- medium wooden board integrated with fence or building

Upgrade:

- small plate with upward-arrow icon
- details in contextual hint

Hiring:

- notice-board design
- worker silhouette
- small employment papers
- related jobs may share one board

Use wood grain, brackets, posts, soft shadow, upper-left highlight, rounded corners, and slight material variation. It must look like a farm sign, not a generic text rectangle.

## 11. Central guidance system

Create one central system such as:

```text
GuidanceSystem
NotificationQueue
ContextHintSystem
```

Priority:

1. purchase/prerequisite failure
2. full inventory or critical production problem
3. interaction problem
4. first-use tutorial
5. normal contextual guidance
6. background status

Only one major message may be visible at a time.

Duplicate cooldown:

```ts
notificationCooldownMs: 2500
```

At medium distance, show one or two lines in a background panel. Inside operation range, fade out long instructions and rely on progress rings, item transfers, quantity changes, and short state labels.

After first successful use, suppress the same long explanation for the remainder of the session.

All public Japanese strings must be centralized in the localization module.

## 12. Feed trough redesign

Make the feed trough visually unmistakable:

- long wooden or metal trough
- visible corn content
- empty, low, half, and full states
- corn icon
- distinct chicken side and player-refill side
- clear depth and soft shadow

Interaction-floor color: yellow-green or corn-yellow.

Floor graphics: corn icon, downward arrow, trough symbol. No naked floor text.

Medium hint:

```text
餌箱
とうもろこしを入れられます
```

Near status:

```text
餌　4 / 12
```

During transfer, hide the long hint, animate corn into the trough, update physical fill, and add a short reaction.

## 13. Egg storage redesign

Make egg storage clearly different from the feed trough:

- nest shelf or low egg rack
- straw
- twelve individual egg positions
- small roof
- wooden boxes
- white and light-brown eggs
- clear empty, low, half, and full states
- clearly defined collection side

Interaction-floor color: cream or pale blue.

Floor graphics: egg icon, upward arrow, basket icon, footprints.

Medium hint:

```text
卵置き場
たまごを回収できます
```

Near status:

```text
たまご　7 / 12
```

During collection, hide the long hint, animate an egg to the player, clear one physical egg slot, and update cargo/HUD.

## 14. Coop spatial layout

Recommended layout:

```text
left: feed trough
center: chicken activity
right: egg storage
rear: chicken house
```

Maintain at least one player-width of space between feed and egg interaction areas.

Prevent sign overlap, chicken movement over large text, unclear active zones, and substantially overlapping feed/egg interaction circles.

## 15. General visual polish

Keep the bright casual 2.5D style.

Shared rules:

- warm dark-brown outlines
- outline width based on object size
- upper-left lighting
- lower-right shadows
- small surface highlights
- consistent material treatment
- clear distinction between decoration and interaction
- no debug rings around ordinary scenery
- no oversized tree outlines

Improve:

- grass variation and small blades
- soil grains and crop furrows
- road ruts
- coop straw and mud variation
- reeds and fence weeds
- barn, market, coop, tool shed, and hiring boards
- roof planes, wood joints, windows, hinges, handles, awnings, shadows, and props
- main farmer face, hair, clothing, limbs, direction, and cargo integration
- worker silhouettes, tools, carts, and posture
- corn leaves, ears, stems, and harvest states
- chicken comb, beak, wings, tail, feet, pecking, walking, resting, and drinking

Use local SVG, Phaser Graphics, or Phaser-generated local textures only. No remote assets, CDN, copied game graphics, or copyrighted characters.

## 16. Recommended config

```ts
signMinimumGap: 24
signFullDetailDistance: 400
signCompactDistance: 850
signFadeDurationMs: 220
signCandidateOffset: 110
notificationCooldownMs: 2500
statusBubbleDurationMs: 1800
```
