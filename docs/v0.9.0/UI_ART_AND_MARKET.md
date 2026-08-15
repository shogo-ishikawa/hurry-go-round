# v0.9.0 UI, Art, Market, and Contract Presentation

## 1. Processing-yard visual identity

The processing yard must look like a coherent extension of the existing farm.

Use the established visual direction:

```text
bright
warm
rounded
vector-like
soft 2.5D
warm brown outlines
upper-left lighting
lower-right shadows
```

The area should be visually distinct from:

- raw crop fields
- the barn
- the roadside market
- the chicken coop
- the contract dock

Suggested processing-yard palette accents:

```text
mill:
weathered warm wood
stone-grey base
cream sacks
muted teal machinery

bakery:
terracotta roof
warm brick oven
cream plaster
amber oven glow

processing warehouse:
wood siding
canvas awning
neutral crate colors
```

Do not use remote assets, stock icons, or copied game art.

## 2. Processing-yard entrance

Before purchase:

- closed gate
- muted ground treatment
- processing-yard land sign
- lock icon
- one clear purchase interaction area
- no large naked text on the ground

Purchase sign:

```text
加工場用地
800コイン
```

Medium-distance hint:

```text
加工場を開放すると
小麦粉・パンなどを生産できます
```

Inside purchase range:

- hide long explanatory text
- show purchase progress
- show exact cost
- show missing coins when applicable

After purchase:

- open the gate
- remove or transform the purchase sign
- reveal road, mill construction site, bakery construction site, and management board

## 3. Construction sites

The grain mill and bakery must exist as recognizable construction sites before they are built.

### Mill construction site

Use:

- stone foundation
- stacked timber
- folded mill-wheel parts
- blueprint icon
- construction interaction floor

On-site compact sign:

```text
製粉機
350コイン
```

### Bakery construction site

Use:

- brick foundation
- oven arch under construction
- timber roof frame
- flour-sack motif
- construction interaction floor

On-site compact sign:

```text
ベーカリー
850コイン
```

Do not display bakery construction until the processing yard is unlocked.

Before the mill is built, the bakery site may remain visible but locked with a clear prerequisite hint:

```text
先に製粉機を建ててください
```

## 4. Grain mill art

The built grain mill should include:

- main mill building
- visible wheel or rotating milling component
- input loading bay
- output sack area
- small office or operator waiting point
- connected road
- warm shadow
- subtle material detail

### Mill input bay

Physical representation:

- wheat sacks
- corn crates
- shared capacity slots
- distinct wheat and corn icons

Floor interaction icon:

```text
downward arrow
wheat sheaf
corn cob
```

### Mill output bay

Physical representation:

- cream flour sacks
- yellow cornmeal sacks
- distinct labeled icon plaques
- shared capacity slots

Floor interaction icon:

```text
upward arrow
flour sack
cornmeal sack
```

The input and output zones must use different colors and must not overlap.

## 5. Bakery art

The bakery should include:

- compact bakery building
- oven
- chimney
- ingredient loading table
- finished-goods cooling table
- baker waiting point
- bread display props
- warm amber processing glow

### Bakery input bay

Physical representation:

- flour sacks
- cornmeal sacks
- egg trays
- visible shared-capacity storage

Floor icon:

```text
downward arrow
ingredient basket
```

### Bakery output bay

Physical representation:

- bread loaves
- square cornbread loaves
- cooling racks
- visible shared-capacity slots

Floor icon:

```text
upward arrow
bread basket
```

The bakery input and output zones must remain clearly separate on desktop and mobile.

## 6. Machine status indicators

Do not rely only on text.

Use small physical status indicators.

Recommended states:

```text
Green lamp:
processing normally

Amber lamp:
waiting for ingredients

Blue lamp:
output available

Red lamp:
output full or blocking problem

Grey lamp:
disabled or not built
```

Add a short icon-based indicator above or beside the machine.

Long explanations belong in the contextual UI, not permanently on the map.

## 7. Machine progress visuals

While processing:

- show a compact progress arc or bar near the machine
- do not cover the worker or main moving components
- show recipe icon
- show remaining time only in detailed near-range mode or management panel

Reduced-motion setting:

- replace rotation and smoke with state changes and progress bar
- preserve all functional feedback

## 8. Processing management board

Add one physical board for the entire processing yard.

Public title:

```text
加工場管理
製粉・製パン
```

The board must not duplicate large signs for every individual machine action.

The board opens the processing-management panel when the player is near.

PC:

```text
E
Space
on-screen action button
```

Mobile:

```text
action button tap
```

The interaction must not conflict with contract-board or operations-center controls.

If multiple context actions are nearby, select the closest valid action and show its name.

## 9. Processing-management panel

The panel should use tabs or compact sections.

Recommended sections:

```text
概要
製粉機
ベーカリー
スタッフ
生産方針
```

### Overview

Show:

- mill built / not built
- bakery built / not built
- mill active recipe and state
- bakery active recipe and state
- routing policy
- mill-operator status
- baker status
- current warnings

### Mill section

Show:

- enabled toggle
- recipe selection: auto / flour / cornmeal
- machine level
- next upgrade cost
- current input amounts
- current output amounts
- active cycle
- remaining time
- ingredient-shortage warning
- output-full warning

### Bakery section

Show:

- enabled toggle
- recipe selection: auto / bread / cornbread
- machine level
- next upgrade cost
- current input amounts
- current output amounts
- active cycle
- remaining time
- ingredient-shortage warning
- output-full warning

### Staff section

Show:

- mill operator hiring and training
- baker hiring and training
- current level
- current carried resource and amount
- current public status
- exact cost
- prerequisite explanation

### Routing section

Show four policy cards:

```text
バランス
市場優先
契約優先
加工優先
```

Each card needs a one-sentence Japanese explanation.

Example:

```text
バランス
市場・契約・加工へ均等に資源を残します
```

## 10. Responsive management UI

Target viewports:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Desktop:

- centered modal or side panel
- clear tabs
- two-column machine details where space allows
- no map interaction through the panel

Mobile landscape:

- compact tab row
- one machine section at a time
- large touch targets
- no joystick overlap

Mobile portrait:

- vertical card layout
- sticky close button
- compact resource rows
- no horizontal overflow
- no clipped recipe names

Opening the processing panel must pause gameplay simulation.

## 11. Processing HUD

Do not permanently add another large panel to an already crowded HUD.

Use a compact processing status strip after the yard is unlocked.

Desktop example:

```text
加工
製粉  小麦粉  62%
製パン  パン  材料待ち
```

Mobile compact example:

```text
製粉 62%
製パン 材料待ち
```

Problem states should be emphasized:

- ingredient shortage
- output full
- machine disabled
- worker not hired
- route blocked

The processing HUD region must be reserved from click/tap navigation.

## 12. Resource presentation in existing HUD

Extend resource rows in:

- player cargo
- barn
- market
- contract panel

New compact labels:

```text
小麦粉
コーン粉
パン
コーンパン
```

Use full names in detailed panels:

```text
小麦粉
コーンミール
パン
コーンブレッド
```

The same item must use the same icon and primary color everywhere.

## 13. Market stall expansion

Extend the market stall to visibly support processed goods.

Do not draw seven identical shelves in one crowded line.

Recommended grouping:

```text
Raw shelf:
wheat, corn, eggs

Ingredient shelf:
flour, cornmeal

Bakery shelf:
bread, cornbread
```

Use three physical shelf zones.

The market capacity remains separately tracked per resource.

Processed-goods shelves become visible only when unlocked.

## 14. Customer request visuals

Customer request bubbles must support all seven resources.

Requirements:

- icon remains readable at current camera zoom
- flour and cornmeal sacks are visually distinct
- bread and cornbread are visually distinct
- patience meter does not cover the request icon
- unavailable processed goods are not requested before unlock
- no internal resource ID text

Customer abandonment behavior remains unchanged.

## 15. Market capacity recommendations

Recommended capacities:

```text
wheat       8
corn        8
egg         8
flour       6
cornmeal    6
bread       6
cornbread   4
```

Market display visuals must never show more physical items than logical stock.

For large counts, visual grouping is allowed, but empty, low, half, and full states must remain distinguishable.

## 16. Contract panel integration

Contract cards must support processed goods.

Unlock rules:

```text
flour / cornmeal:
mill built

bread / cornbread:
bakery built
```

Contract cards should group requirements by:

```text
raw goods
ingredients
finished goods
```

Do not generate contracts that are impossible under the current unlocked facilities.

Example mixed contract:

```text
パン 6
コーンブレッド 4
たまご 8
```

The contract dock remains barn-based.

Processed goods produced by workers and returned to the barn can therefore be delivered automatically through the existing player dock interaction.

## 17. Contract reward presentation

Processed-goods contracts should visibly communicate higher value.

Display:

- base reward
- early-completion bonus
- reputation reward
- requested processed goods
- facility prerequisite if viewing a future locked template in documentation only

Do not expose internal formula variables in the public UI.

## 18. On-map signs and overlap prevention

All processing-yard signs must register through the v0.8 facility/sign system.

Include actual obstacles:

- mill building
- bakery building
- road
- worker routes
- interaction zones
- processing board
- input bays
- output bays
- construction sites
- locked gate

Minimum sign gap should remain at least the current configured value.

If a detailed sign cannot fit:

1. collapse subtitle
2. use icon-only mode
3. move detail to contextual prompt

Do not overlap signs.

## 19. Worker visuals

### Mill operator

Suggested design:

- dust cap or tied head covering
- apron
- grain scoop
- flour-dusted clothing details
- hand cart or sack carrier

Cargo visuals:

- wheat sack
- corn crate
- flour sack
- cornmeal sack

### Baker

Suggested design:

- baker cap or head scarf
- warm apron
- oven mitt or bread paddle
- tray or basket

Cargo visuals:

- flour sack
- cornmeal sack
- egg tray
- bread basket
- cornbread crate

Do not differentiate roles only through color.

## 20. Completion effects

Mill completion:

- short wheel accent
- bounded dust puff
- output sack bounce
- subtle completion sound hook may be prepared but no audio is required

Bakery completion:

- oven glow pulse
- short steam puff
- loaf appearance and bounce

Reduced-motion mode:

- no rapid rotation
- no repeated smoke motion
- use color pulse and progress completion instead

## 21. Tutorial progression

Add compact event-driven guidance.

Suggested sequence:

```text
加工場用地を購入できます
→ 製粉機を建てましょう
→ 麦やとうもろこしを製粉機へ入れられます
→ 小麦粉またはコーンミールが完成しました
→ ベーカリーを建てましょう
→ 小麦粉とたまごからパンを作れます
→ 加工スタッフを雇うと搬入と回収を自動化できます
→ 生産方針を選ぶと資源の使い道を調整できます
```

Long guidance should not repeat after successful use in the same session.

Persist tutorial completion through the existing operations/persistence framework.

## 22. Accessibility

Respect persisted settings:

- text scale
- reduced motion
- joystick scale
- joystick opacity
- contextual hints

Text scaling must not cause:

- clipped machine cards
- inaccessible close buttons
- horizontal overflow
- overlapping resource rows

Critical error and purchase feedback remains visible even when ordinary contextual hints are disabled.

## 23. UI and visual tests

Add pure or layout tests for:

- processing panel fits target viewport widths
- all tabs remain accessible
- machine card sizes remain non-negative
- resource rows support seven resources
- compact labels remain unique
- processing HUD reserved region
- input and output interaction zones do not overlap
- processing board does not overlap construction sites
- signs avoid registered obstacles
- market shelf unlock rules
- customer icon mapping covers all resources
- contract UI supports processed goods
- reduced-motion state selection
- text-scale layout at 100%, 115%, and 130%

Manual review is still required for final art quality.
