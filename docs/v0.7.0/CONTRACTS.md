# v0.7.0 Contract Board Specification

## 1. Purpose

The farm now produces and automates three resources, but the player has no structured long-term objective beyond ordinary customer sales. v0.7.0 adds delivery contracts that:

- create clear medium-term goals
- use existing wheat, corn, and egg production
- reward planning and automation
- avoid adding another crop or animal type
- remain deterministic and saveable
- do not punish the player with hard failure

All public contract UI must be Japanese.

---

## 2. Contract board

Add one physical contract board near the barn/market management area.

Recommended visual design:

- wooden notice board
- small roof or awning
- pinned order papers
- resource icons
- wax seal or farm-cooperative emblem
- soft shadow
- no large naked map text

Short board title:

```text
出荷契約
```

Do not place separate large signs for each contract offer.

The board is a landmark. Detailed contract text appears in a camera-fixed panel.

---

## 3. Explicit context action

Opening the contract panel must require an explicit context action rather than automatically interrupting the player.

When near the board, show one context action:

```text
契約を見る
```

Input:

- PC: `E`, `Space`, or click the context action button
- mobile/tablet: tap the context action button
- clicking/tapping the board itself may also open the panel if it does not conflict with movement input

The action button must:

- appear only when relevant
- be camera-fixed
- be reserved from movement input
- not overlap the joystick
- disappear when leaving the board range
- use Japanese text

Introduce a reusable context-action mechanism that may support future facilities, but do not convert every current automatic interaction into button input in this milestone.

---

## 4. Contract panel

Opening the board pauses world simulation.

Show:

- three offer cards
- one active-contract section
- current reputation
- completed-contract count
- each offer's required resources
- coin reward
- reputation reward
- optional speed-bonus target
- accept/decline actions

Public labels:

```text
出荷契約
契約候補
進行中の契約
必要な品
基本報酬
早期達成ボーナス
評判
受注する
見送る
契約を中止
閉じる
```

Do not render internal IDs, seeds, timestamps, or enum names.

---

## 5. Contract resource availability

Generate requirements only from currently unlocked production chains.

Unlocked resource set:

```text
initial farm: wheat
corn field unlocked: wheat + corn
chicken coop unlocked: wheat + corn + egg
```

A contract must never require:

- corn before the east field is unlocked
- eggs before the chicken coop is unlocked
- a resource with no valid production path

Existing offers generated before a new unlock may remain valid. Newly generated offers use the expanded unlocked set.

---

## 6. Contract types

Implement these contract types:

```ts
type ContractType =
  | "single"
  | "mixed"
  | "priority";
```

### Single-resource contract

One required resource.

Examples:

```text
麦 24
とうもろこし 18
たまご 10
```

### Mixed-resource contract

Two or three unlocked resources.

Examples:

```text
麦 18
とうもろこし 12
```

```text
麦 12
とうもろこし 10
たまご 6
```

### Priority contract

A smaller order with a shorter speed-bonus target and a higher bonus multiplier.

It does not hard-fail after the target time. The player loses only the optional speed bonus.

Suggested public badge:

```text
優先依頼
```

Do not implement a contract that permanently expires after acceptance.

---

## 7. Offer count and active limit

Always maintain:

```text
3 visible offers
```

Allow:

```text
1 active contract
```

If a contract is active:

- the player may inspect other offers
- the player may not accept another offer
- accept buttons are disabled with a short reason

Suggested message:

```text
進行中の契約を完了または中止してください
```

Do not implement multiple active contracts in v0.7.0.

---

## 8. Contract model

Use an explicit model equivalent to:

```ts
interface DeliveryContract {
  id: string;
  sequence: number;
  type: ContractType;
  titleKey: string;
  requirements: ResourceAmounts;
  delivered: ResourceAmounts;
  baseRewardCoins: number;
  reputationReward: number;
  targetBonusMs: number | null;
  bonusMultiplier: number;
  elapsedActiveMs: number;
  status: "offered" | "active" | "completed" | "cancelled";
}
```

Offer contracts may omit or zero `delivered`/elapsed values until accepted.

Use immutable or clearly controlled state transitions.

---

## 9. Deterministic generation

Contract generation must be deterministic and pure.

Persist:

- generator seed/state
- next sequence number

Recommended API:

```ts
generateContractOffers(input: ContractGenerationInput): ContractGenerationResult;
```

Do not use `Math.random()` directly inside contract generation.

Use a small deterministic seeded PRNG implemented and tested in pure TypeScript.

The same:

- seed
- sequence
- unlocked resources
- reputation tier

must produce the same offers.

Generated contract IDs must remain stable across save/load.

Example ID:

```text
contract-000042
```

---

## 10. Requirement ranges

Use progression-aware ranges.

Suggested base ranges:

### Wheat

```text
single: 18–42
mixed component: 10–28
priority: 10–22
```

### Corn

```text
single: 14–34
mixed component: 8–24
priority: 8–18
```

### Egg

```text
single: 6–18
mixed component: 4–12
priority: 4–10
```

Round quantities to practical integers.

Do not generate zero requirements.

Do not exceed documented maximums without a reputation-tier rule.

---

## 11. Reputation

Add farm reputation:

```ts
interface ReputationState {
  points: number;
  level: number;
}
```

Suggested levels:

```text
Level 0: 0–4
Level 1: 5–14
Level 2: 15–29
Level 3: 30+
```

Public names may be:

```text
見習い農場
地域の農場
評判の農場
人気の農場
```

Reputation affects only contract generation and presentation in v0.7.0.

It may:

- slightly increase requirement ranges
- increase coin multipliers
- increase chance of mixed contracts
- increase chance of priority contracts

Do not use reputation to lock existing production or remove purchased features.

Reputation never decreases in v0.7.0.

---

## 12. Reward formula

Use resource unit prices as the base value.

Current unit values:

```text
wheat: 2
corn: 3
egg: 5
```

Calculate raw order value:

```ts
rawValue =
  wheatRequired * wheatPrice
  + cornRequired * cornPrice
  + eggRequired * eggPrice;
```

Suggested base multipliers:

```text
single: 1.35
mixed: 1.50
priority: 1.45
```

Suggested reputation multiplier:

```text
Level 0: 1.00
Level 1: 1.05
Level 2: 1.10
Level 3: 1.15
```

Recommended formula:

```ts
baseReward = roundToNearestInteger(
  rawValue * typeMultiplier * reputationMultiplier
);
```

Do not create fractional coins.

Document the exact final formula if adjusted.

---

## 13. Reputation rewards

Suggested reputation rewards:

```text
single: 1
mixed: 2
priority: 2
```

A larger generated order may grant one additional point under a deterministic documented threshold.

Do not award reputation on cancellation.

Do not award reputation twice for the same contract.

---

## 14. Speed bonus

Contracts never hard-fail because of time.

Accepted contracts have an optional active-play target.

Suggested target ranges:

```text
single: 180–300 seconds
mixed: 240–420 seconds
priority: 90–180 seconds
```

Timer rules:

- starts on acceptance
- advances only during active unpaused gameplay
- does not advance while the contract panel is open
- does not advance while the game is paused
- does not advance while the tab is closed
- persists in the save snapshot

Suggested bonus multipliers:

```text
single: +15%
mixed: +20%
priority: +30%
```

At completion:

```ts
bonusCoins =
  elapsedActiveMs <= targetBonusMs
    ? floor(baseRewardCoins * bonusRate)
    : 0;
```

Public UI shows:

```text
早期達成ボーナス +24
残り 02:18
```

After the target passes:

```text
基本報酬は受け取れます
```

Do not show a negative timer.

---

## 15. Contract acceptance

Acceptance is a pure state transition.

Requirements:

- one offer exists
- no active contract exists
- offer status is `offered`
- requirements are valid for the current save

On acceptance:

- remove the offer from the offer list
- create the active contract
- reset delivered amounts to zero
- reset elapsed active time to zero
- preserve ID and generation metadata
- immediately generate one replacement offer so the board still has three offers
- mark game state dirty
- trigger an important-event save request

Show a short Japanese confirmation:

```text
契約を受注しました
```

---

## 16. Offer decline

The player may decline an unaccepted offer.

On decline:

- remove that offer
- do not change barn inventory
- do not change coins
- do not change reputation
- increment `offersDeclined` statistics
- generate one replacement offer

Suggested replacement cooldown:

```text
30 seconds of active play
```

Two acceptable implementations:

1. replacement appears immediately but the decline button for that slot is disabled for 30 seconds, or
2. show a temporary empty/replacement-soon slot for 30 seconds

Prefer implementation 1 for simpler UI.

Do not allow rapid unlimited rerolling in one frame.

---

## 17. Contract cancellation

Allow cancellation from the active-contract panel.

Use a confirmation step.

Public text:

```text
契約を中止しますか？
納品済みの商品は倉庫へ戻ります
```

On cancellation:

- return every delivered resource to barn inventory
- do not refund resources that were never delivered
- clear active contract
- increment `contractsCancelled`
- award no coins
- award no reputation
- mark state dirty
- request an important-event save

The return must be atomic and pure.

No resource may be lost or duplicated.

Do not create a cancellation fee in v0.7.0.

---

## 18. Contract shipping dock

Add one physical shipping dock near the barn.

Visual design:

- raised wooden platform
- several empty crate positions
- delivery cart or wagon silhouette
- contract seal icon
- resource icon markers
- no large naked floor text
- one short nearby sign or board connection

Short facility name:

```text
契約出荷場
```

Interaction zone must match the logical delivery radius.

Use floor icons/markings rather than a sentence on the ground.

---

## 19. Contract delivery source

Contract shipping consumes only from barn storage.

It must not take directly from:

- player cargo
- market stock
- field crates
- worker cargo
- feed trough
- egg storage

This makes the barn the canonical dispatch point and allows all automation systems to contribute indirectly.

---

## 20. One-unit round-robin contract delivery

When the player stands in the contract shipping zone and an active contract exists:

- transfer one needed unit at a time
- transfer only if barn has that resource
- skip completed or unavailable resources
- use round-robin order: wheat → corn → egg → wheat...
- update delivered progress
- update barn stock
- create one bounded transfer animation
- stop when the player leaves
- stop when the contract is complete
- stop if no required item is currently available

Suggested interval:

```text
contractDeliveryIntervalMs: 180
```

Do not deliver the entire order instantly.

Pure function equivalent:

```ts
deliverNextContractResourceOne(...)
```

---

## 21. Shipping dock progress visuals

The dock must visually show progress without rendering every required unit.

Recommended:

- up to three resource-specific crate groups
- crate fill or stacked icon count
- small `delivered / required` labels only in the nearby contextual panel or HUD
- platform becomes more filled as progress increases

Inside the shipping zone:

- hide long instructions
- show current transfer resource
- show a compact progress line

Example:

```text
麦 12 / 18
とうもろこし 8 / 12
```

---

## 22. Insufficient barn inventory

If the active contract still needs resources but none of the needed resources are currently available in the barn:

- do not mutate contract progress
- do not create transfer effects
- show one cooldown-controlled hint

Suggested text:

```text
必要な商品が倉庫にありません
```

Do not display it every frame.

---

## 23. Contract completion

A contract completes when every delivered amount meets its requirement.

On completion, atomically:

- set status to completed
- calculate base reward
- calculate optional speed bonus
- add total reward to wallet coins
- add reputation points
- increment `contractsCompleted`
- add to `contractCoinsEarned`
- update best/fastest contract statistics if tracked
- clear active contract after completion presentation is acknowledged or after a short bounded delay
- generate/maintain three offers
- mark state dirty
- request an important-event save

Do not add reward coins to the till. Contract reward goes directly to the wallet because it represents a cooperative settlement rather than market cash.

Show a completion panel:

```text
契約達成
基本報酬 120コイン
早期達成ボーナス 24コイン
評判 +2
```

The panel pauses gameplay until closed.

Do not reward the same contract twice.

---

## 24. Contract statistics

Persist at least:

```ts
interface ContractStatistics {
  contractsCompleted: number;
  contractsCancelled: number;
  offersDeclined: number;
  contractCoinsEarned: number;
  speedBonusesEarned: number;
  bestCompletionMs: number | null;
}
```

All values are non-negative.

Cancellation and decline are separate statistics.

A contract cannot be both completed and cancelled.

---

## 25. Contract titles

Use short generated Japanese titles based on type and resources.

Examples:

```text
地域市場への麦出荷
食堂向け混合便
朝市のたまご優先便
共同倉庫への定期便
```

Generate titles from centralized localization keys.

Do not embed long arbitrary generated prose.

Do not expose the random seed.

---

## 26. Contract board visual states

The physical board may indicate:

- offers available
- active contract
- completed contract awaiting acknowledgement

Use icons, paper count, seals, or a subtle highlight.

Do not place full contract requirements directly on the world map.

No large permanent floating text should obscure nearby facilities.

---

## 27. Contract panel responsive layout

Desktop:

- three offer cards in one row or balanced grid
- active contract clearly separated
- visible requirements and rewards

Mobile landscape:

- horizontally scrollable or two-row cards
- large touch targets
- no joystick because gameplay is paused

Mobile portrait:

- vertically stacked cards
- sticky close action
- no clipped Japanese text
- scrolling within the panel
- confirmation buttons remain reachable

All contract panel interactions are excluded from world movement input.

---

## 28. Contract and save integration

After acceptance, cancellation, or completion:

- request a priority save
- do not write directly from UI
- persist offers, active contract, generator state, reputation, statistics, and timer

On load:

- restore the same offers and active contract
- do not regenerate offers unless validation/migration requires it
- preserve delivered progress
- preserve elapsed active time
- preserve speed-bonus eligibility

No timer advances while closed.

---

## 29. Pure logic requirements

Implement pure functions equivalent to:

```ts
generateContractOffers(...)
acceptContract(...)
declineContractOffer(...)
cancelActiveContract(...)
getRemainingContractRequirements(...)
deliverNextContractResourceOne(...)
isContractComplete(...)
calculateContractReward(...)
calculateReputationLevel(...)
advanceContractActiveTime(...)
completeContract(...)
```

Requirements:

- no Phaser dependency
- no direct `Math.random()`
- deterministic seeded generation
- no wall-clock access
- no negative inventory/progress/currency
- no progress above requirement
- no double reward
- cancellation conserves resources
- failed transitions return explicit reasons
- unrelated state remains unchanged

---

## 30. Recommended configuration

```ts
contractOfferCount: 3
maxActiveContracts: 1
contractDeliveryIntervalMs: 180
contractDeclineCooldownMs: 30000

contractTypeMultipliers: {
  single: 1.35,
  mixed: 1.50,
  priority: 1.45
}

contractBonusRates: {
  single: 0.15,
  mixed: 0.20,
  priority: 0.30
}

reputationThresholds: [0, 5, 15, 30]
reputationMultipliers: [1.00, 1.05, 1.10, 1.15]
```

Document any tuned final values.
