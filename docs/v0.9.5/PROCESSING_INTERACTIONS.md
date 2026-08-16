# Phase 2 — Processing Construction & Material Flow

This phase makes the processing yard, grain mill, bakery, material input, and finished-product collection understandable without source-code knowledge.

## 1. Shared interaction-station presentation

Create a reusable world interaction presentation, for example:

```text
InteractionStationView
FacilityActionPad
WorldInteractionMarker
```

It must support:

- planned construction;
- active input;
- active output;
- management panel;
- purchase progress;
- disabled/prerequisite state;
- full/empty state;
- live quantity label;
- matching logical and visible radii.

The visual radius must come from the same interaction definition as runtime collision detection.

Do not create a visible circle with coordinates different from the logical interaction.

## 2. Processing master plan

The processing yard must show all three progression steps from the beginning:

```text
1. 加工場用地
2. 製粉機
3. ベーカリー
```

The unbuilt state must remain visible as a planned foundation.

### Processing-yard purchase

Current target balance remains:

```text
processing yard: 800 coins
prerequisites:
- east corn field unlocked
- chicken coop unlocked
```

World presentation must include:

- gate;
- planned-yard footprint;
- construction pad;
- wood sign;
- exact cost;
- prerequisite checklist;
- progress ring;
- path arrow.

Medium-distance hint:

```text
加工場を建てる
必要条件
✓ 東農地
✓ 鶏小屋
800コイン
```

When one prerequisite is missing, show it explicitly.

When coins are missing, show:

```text
あと 240 コイン必要です
```

Inside the operation radius, hide the long explanation and show only progress and status.

## 3. Grain-mill foundation

After the yard is purchased, show a planned grain-mill foundation even before construction.

Required information:

```text
製粉機
350コイン
麦 → 小麦粉
とうもろこし → コーンミール
```

The foundation must contain:

- machine silhouette;
- build pad;
- cost marker;
- input-side marker;
- output-side marker;
- disabled output point until built.

The build radius must match the logical interaction.

## 4. Bakery foundation

Show the bakery foundation from the time the processing-yard plan is visible.

Before the mill is built:

```text
ベーカリー
製粉機の建設後に利用できます
850コイン
```

After the mill is built:

```text
ベーカリー
850コイン
小麦粉とたまごからパンを作ります
```

The bakery must not appear only after a player accidentally stands on its logical build coordinate.

The bakery foundation must have:

- planned building outline;
- oven icon;
- build pad;
- exact cost;
- prerequisite state;
- input and output station locations;
- path connection to the yard entrance.

## 5. Distinct interaction colors and shapes

Use consistent semantics across mill and bakery.

### Construction pad

```text
color: warm ochre
icon: hammer / building
shape: square or octagonal pad
```

### Input station

```text
color: blue-teal
icon: downward arrow into crate
shape: inbound pallet
```

### Output station

```text
color: green
icon: upward arrow from crate
shape: outbound shelf/pallet
```

### Management panel

```text
color: cream + dark outline
icon: gear / clipboard
shape: signboard
```

Do not use the same circle and color for all interactions.

## 6. Physical input storage

Add visible input storage for each machine.

### Mill input storage

Allowed resources:

```text
wheat
corn
```

Physical presentation:

- two labeled bins or sacks;
- wheat icon and count;
- corn icon and count;
- total capacity meter;
- visible empty/full states.

### Bakery input storage

Allowed resources:

```text
flour
cornmeal
egg
```

Physical presentation:

- flour sack;
- cornmeal sack;
- egg crate;
- live counts;
- total capacity meter.

## 7. Visible manual input transfer

When the player enters an input station with allowed resources:

1. highlight the input station;
2. show a short label such as `搬入中`;
3. choose an allowed carried resource deterministically;
4. remove exactly one from player cargo;
5. add exactly one to machine input;
6. animate the matching resource icon from player to storage;
7. update player cargo art and HUD;
8. update physical input storage;
9. repeat at the configured interval while the player remains inside.

Recommended interval:

```text
140–180 ms per item
```

If multiple allowed resources are carried, use round-robin transfer so one type does not starve another.

Display a bounded transfer message:

```text
麦を製粉機へ搬入　5 → 4
```

or:

```text
たまごをベーカリーへ搬入　3 → 2
```

Do not create a new permanent text object per item.

## 8. Input-stop reasons

When transfer stops, show one concise reason:

```text
対応する原料を持っていません
製粉機の原料置き場が満杯です
ベーカリーの原料置き場が満杯です
先に設備を建設してください
```

Apply message cooldowns.

Do not silently do nothing.

## 9. Physical output storage

Add explicit output storage beside each machine.

### Mill output

Show separate positions for:

```text
flour
cornmeal
```

### Bakery output

Show separate positions for:

```text
bread
cornbread
```

The number of visible sacks/crates/trays must track logical output.

Large counts may use a multiplier label.

Output storage must remain visible even when empty so players know where collection occurs.

## 10. Visible output collection

When the player enters an output station:

1. highlight the output pallet;
2. choose a finished resource deterministically;
3. remove exactly one from machine output;
4. add exactly one to player cargo if capacity allows;
5. animate the item from output storage to the player;
6. update cargo art, HUD, and output display;
7. continue while the player remains inside.

If multiple products exist, use round-robin collection.

When player cargo is full:

```text
持ち物がいっぱいです
```

When output is empty:

```text
完成品はまだありません
```

Do not hide the collection point when empty.

## 11. Live machine status

Display one small physical status panel on each machine.

Possible states:

```text
未建設
停止中
原料待ち
加工中 3.2秒
完成品置き場が満杯
稼働中
```

For an active recipe, display resource icons and a progress bar.

Avoid long naked text over the machine.

## 12. Processing management panel

Replace ad hoc panel controls with a reusable modal and UI button component.

The processing panel must show:

- wallet coins;
- yard construction state;
- mill construction state;
- bakery construction state;
- exact unmet prerequisites;
- exact next construction cost;
- machine level;
- selected mode;
- active recipe;
- remaining time;
- input counts;
- output counts;
- input/output capacity;
- worker status;
- buttons to change mode;
- button `建設場所へ案内` for unbuilt facilities;
- button `搬入口へ案内`;
- button `受取口へ案内`.

The panel must not close immediately after a mode button is pressed.

Show the result inline:

```text
製粉機を「小麦粉優先」に変更しました
```

If a button is disabled, show why.

## 13. UI button contract

Use a reusable button composed of:

- rectangle background;
- explicit hit area;
- text child;
- pointer over/down/up states;
- disabled state;
- keyboard focus and activation;
- touch target at least 44 CSS pixels high;
- explicit depth above modal backdrop.

Do not rely on text glyph bounds as the only hit area.

## 14. Guidance and destination marker

When the player selects an `案内` action:

- close or minimize the panel;
- set a visible world destination marker;
- optionally set click-to-move destination if safe;
- display the facility name;
- clear the marker when the player reaches the target or selects another destination.

Guide targets:

```text
processing yard gate
mill construction pad
bakery construction pad
mill input
mill output
bakery input
bakery output
processing management board
```

## 15. Pure logic requirements

Maintain or add pure functions for:

```ts
getProcessingConstructionAvailability(...)
getProcessingNextObjective(...)
selectNextManualInputResource(...)
selectNextManualOutputResource(...)
transferManualInputOne(...)
collectManualOutputOne(...)
getMachinePublicStatus(...)
```

The runtime may not infer prerequisites separately from the panel.

The panel, signs, construction pads, and transaction logic must consume one authoritative availability result.

## 16. Tests

Add deterministic tests for:

- yard prerequisite checklist;
- exact yard cost;
- mill availability after yard purchase;
- bakery locked before mill;
- bakery available after mill and enough coins;
- exact construction deductions;
- no double purchase;
- input allowlists;
- round-robin input transfer;
- input capacity stop;
- output round-robin collection;
- cargo capacity stop;
- resource invariants;
- physical interaction bounds equal logical bounds;
- destination guide resolves to registered facility;
- mode actions update state without closing panel state unexpectedly.

## 17. Browser E2E

Add Playwright scenarios using actual UI interactions.

### Construction scenario

1. Seed/unlock east field and chicken coop in E2E mode.
2. Give sufficient coins.
3. Confirm processing-yard planned site is visible.
4. Move to or activate the purchase pad.
5. Build the yard.
6. Confirm mill foundation is visible.
7. Build the mill.
8. Confirm bakery remains visibly planned and its prerequisite is satisfied.
9. Build the bakery.

### Material-flow scenario

1. Put wheat and corn into player cargo.
2. Enter mill input.
3. Confirm cargo decreases and mill input increases.
4. Wait for flour/cornmeal output.
5. Confirm output appears physically.
6. Enter mill output and collect product.
7. Deliver flour and eggs to bakery input.
8. Produce bread.
9. Collect bread from the bakery output point.

### Save scenario

Save during:

- active mill cycle;
- non-empty mill output;
- active bakery cycle;
- non-empty bakery output.

Reload and confirm all states are restored exactly once.
