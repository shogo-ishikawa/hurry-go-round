# v0.6.0 — Expanded Automation and Customer Patience

## 1. Corn field crate

Add a dedicated corn collection crate.

```ts
cornFieldCrateCapacity: 20
cornFieldCratePickupIntervalMs: 160
```

Placement requirements:

- outside crop rows
- beside the farm road
- connected to the transport route
- does not hide corn plants
- does not overlap signs or hiring boards

Short public label:

```text
とうもろこし集荷箱
```

The player may collect corn into mixed cargo one unit at a time until cargo is full or the crate is empty.

## 2. Corn harvest worker

Hiring cost:

```ts
cornHarvestWorkerHireCost: 160
```

Prerequisite: east corn field unlocked.

Recommended parameters:

```ts
cornHarvestWorkerCarryCapacity: 5
cornHarvestWorkerMoveSpeed: 160
cornHarvestWorkerHarvestDurationMs: 1050
cornHarvestWorkerDepositIntervalMs: 170
```

Lifecycle:

```text
find ready corn
→ follow fixed waypoints
→ harvest
→ carry up to five
→ return to corn crate
→ deposit one at a time
→ repeat
```

Public statuses:

```text
未雇用
畑へ移動中
収穫中
集荷箱へ運搬中
格納中
成長待ち
集荷箱が満杯
```

Requirements:

- no operation before hiring
- corn only
- no wheat or egg handling
- no capacity overflow
- no double harvest
- release stale target if player harvests first
- resume after regrowth
- visible wait when crate is full
- fixed safe waypoints; no buildings or coop traversal

## 3. Corn transport worker

Hiring cost:

```ts
cornTransportWorkerHireCost: 240
```

Prerequisites:

```text
east corn field unlocked
corn harvest worker hired
```

Recommended parameters:

```ts
cornTransportWorkerCarryCapacity: 8
cornTransportWorkerMoveSpeed: 195
cornTransportWorkerLoadIntervalMs: 150
cornTransportWorkerUnloadIntervalMs: 150
```

Lifecycle:

```text
wait at corn crate
→ load up to eight
→ follow road waypoints
→ unload at barn one at a time
→ return
→ repeat
```

Requirements:

- corn only
- visible empty/partial/full cart
- no negative crate or cargo
- preserve corn total during transfers
- no pond, crop-row, coop, or building traversal

## 4. Poultry caretaker

Hiring cost:

```ts
poultryCaretakerHireCost: 300
```

Prerequisite: chicken coop unlocked.

Recommended parameters:

```ts
poultryCaretakerCarryCapacity: 6
poultryCaretakerMoveSpeed: 175
poultryCaretakerLoadIntervalMs: 160
poultryCaretakerUnloadIntervalMs: 160
poultryFeedEmergencyThreshold: 3
poultryFeedTarget: 10
```

The caretaker handles two loops:

1. barn corn → feed trough
2. egg storage → barn

The caretaker carries one resource type per trip and never mixes corn and eggs.

Task priority:

```text
1. Feed at/below emergency threshold and barn has corn
2. Egg storage has eggs
3. Feed below target and barn has corn
4. Wait
```

Feed loop:

```text
barn
→ load up to six corn
→ coop
→ deposit one at a time
→ reevaluate
```

Egg loop:

```text
egg storage
→ collect up to six eggs
→ barn
→ unload one at a time
→ reevaluate
```

Public statuses:

```text
未雇用
作業確認中
倉庫へ移動中
餌を積込中
餌箱へ運搬中
給餌中
卵を回収中
卵を倉庫へ運搬中
卵を納品中
餌不足
待機中
```

Requirements:

- no operation before hiring
- no mixed caretaker cargo
- no negative feed, eggs, barn, or cargo
- respect feed and egg capacities
- resume after inventory conditions change
- fixed safe waypoints
- no permanent stuck state

## 5. Hiring presentation

Do not use a large independent sign for every job.

East-field board:

```text
東農地スタッフ
```

Floor pads:

- sickle icon: corn harvest worker
- cart icon: corn transport worker

Context hints:

```text
とうもろこし収穫スタッフ
160コイン
```

```text
とうもろこし運搬スタッフ
240コイン
```

Coop board:

```text
鶏小屋スタッフ
```

Context hint:

```text
飼育スタッフ
餌補充と卵回収
300コイン
```

Hiring interaction:

- remain inside radius for 900 ms
- visible progress
- reset on exit
- exact cost only on success
- no duplicate hire
- no deduction on failure
- hired state shown
- insufficient-funds message obeys notification cooldown
- visual and logical radii match

## 6. Expanded automation HUD

Show sections only after relevant land unlock.

Wheat:

```text
麦の自動化
集荷箱  8 / 16
収穫  稼働中
運搬  倉庫へ移動中
```

Corn:

```text
とうもろこし自動化
集荷箱  6 / 20
収穫  収穫中
運搬  未雇用
```

Poultry:

```text
鶏小屋
餌  8 / 12
卵  4 / 12
飼育  卵を回収中
```

On mobile, compact to statuses such as:

```text
麦　正常
とう　集荷満杯
鶏　餌不足
```

Emphasize problem states. Reserve all automation HUD regions from world input.

## 7. Customer stock-out patience

Customers must not wait forever when the requested product is unavailable.

Recommended configuration:

```ts
customerStockoutPatienceMs: 12000
customerPatienceWarningRatio: 0.5
customerPatienceCriticalRatio: 0.2
customerAbandonNotificationCooldownMs: 2500
```

Patience advances only when all are true:

- customer is first in queue
- customer has reached purchase position
- customer has not purchased
- requested resource stock is zero

Do not advance patience for customers behind the front, while stock exists, or during a normal purchase.

If stock returns before expiration:

- reset/clear stock-out wait
- hide patience display
- resume normal purchase timer
- complete sale normally

If patience expires:

1. remove no stock
2. create no sale coins
3. do not increment served or sold counts
4. mark customer as leaving without purchase
5. remove customer from queue exactly once
6. move remaining customers forward
7. make next customer the front
8. send abandoned customer to exit
9. destroy/recycle after exit
10. increment separate abandonment statistic

Add:

```ts
customersLeftWithoutPurchase: number
```

A customer may increment either successful service or abandonment, never both.

Suggested phase extension:

```ts
type CustomerPhase =
  | "entering"
  | "queueing"
  | "buying"
  | "waiting-stock"
  | "leaving"
  | "leaving-disappointed";
```

Stock availability takes priority before committing abandonment. Once abandonment is committed, that customer cannot buy later.

## 8. Customer patience visuals

Show patience only for the front customer waiting on empty requested stock.

Use:

- small bar or circular arc
- requested-resource icon
- crossed-out stock symbol
- compact background bubble

Visual progression:

```text
> 50% remaining: cream/yellow
20–50%: orange
< 20%: red with subtle pulse
```

When stock returns, remove the warning cleanly.

When abandoning:

- short disappointed animation
- subtle head shake or lowered posture
- begin exit immediately
- optional centralized notification:

```text
お客さんが購入をあきらめました
```

Do not render naked map text or repeat the same notification for one customer.

## 9. Customer patience pure logic

Create pure functions equivalent to:

```ts
startOrAdvanceStockoutWait(...)
resetStockoutWait(...)
hasCustomerPatienceExpired(...)
abandonFrontCustomer(...)
advanceQueueAfterDeparture(...)
```

Possible state:

```ts
interface CustomerPatienceState {
  stockoutWaitMs: number;
  stockoutPatienceMs: number;
}
```

Requirements:

- no Phaser or wall-clock access
- use supplied delta
- no negative timers
- no wait increase while stock exists
- no wait increase for non-front customer
- no wait before purchase position
- timeout exactly once
- queue remains FIFO
- no stock or coin changes on abandonment
- abandonment count increments once
- commit queue/statistics transition before exit animation

## 10. Resource invariants

Wheat total before sale:

```text
player wheat
+ wheat field crate
+ wheat harvester cargo
+ wheat transporter cargo
+ barn wheat
+ market wheat
```

Corn total before sale or egg production:

```text
player corn
+ corn field crate
+ corn harvester cargo
+ corn transporter cargo
+ caretaker corn cargo
+ barn corn
+ market corn
+ feed trough corn
```

Egg total:

```text
player eggs
+ egg storage
+ caretaker egg cargo
+ barn eggs
+ market eggs
```

Changes:

- harvest adds one corresponding resource
- sale removes one requested resource
- egg production consumes one feed corn and creates one egg
- all other transfers conserve the resource
- customer abandonment changes no resource or currency

## 11. Recommended architecture

```text
src/game/entities/
  CornFieldCrate.ts
  CornHarvestWorker.ts
  CornTransportWorker.ts
  PoultryCaretaker.ts

src/game/logic/
  customerPatience.ts
  cornAutomation.ts
  poultryAutomation.ts
  workerHiring.ts

src/game/routes/
  cornRoutes.ts
  poultryRoutes.ts

src/game/systems/
  CornAutomationSystem.ts
  PoultryAutomationSystem.ts
  HiringSystem.ts
  MarketSystem.ts
```

Customer patience rules must be separate from rendering. Worker state transitions must not exist only inside graphics entities. Route coordinates must be centralized.
