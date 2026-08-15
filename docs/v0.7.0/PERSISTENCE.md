# v0.7.0 Persistence Specification

## 1. Purpose

The player currently loses all farm progress when the page reloads. v0.7.0 must add robust local persistence without introducing a backend or cloud account.

Use the browser's native IndexedDB API. Do not use remote storage.

The persistence layer must survive:

- page reload
- browser restart
- ordinary tab closure
- device orientation changes
- temporary runtime exceptions after the last successful save
- one corrupt primary record when a valid backup exists

It does not need to survive:

- manual browser-site-data deletion
- private-browsing cleanup
- device loss
- cross-device use without manual JSON export/import

---

## 2. Canonical-save rule

Do not serialize the live Phaser scene or arbitrary `GameState` blindly.

Create an explicit persisted snapshot containing only canonical durable data.

Do not save:

- Phaser `Scene`, `GameObject`, `Tween`, `TimerEvent`, or `Vector2` instances
- DOM nodes
- event listeners
- current pointer state
- current joystick state
- destination markers
- transient customer entities or queue positions
- temporary effects
- open UI panel instances
- runtime-only status bubbles
- raw system references

Create pure conversion functions equivalent to:

```ts
createPersistedSnapshot(runtimeState, runtimeSnapshot): PersistedGameSnapshot
restoreRuntimeState(snapshot): RestoreResult
```

The serializer must be deterministic for the same canonical state.

---

## 3. Remove or isolate duplicated mutable state

The current v0.6.0 state still contains older compatibility inventory fields together with newer canonical resource-keyed values.

Before persistence is enabled, audit fields equivalent to:

```text
inventory.carried
inventory.barn
inventory.market
inventory.capacity
cargo.amounts
cargo.capacity
barn
market
```

Required outcome:

- `cargo` is the authoritative player-carried inventory
- resource-keyed barn storage is authoritative
- resource-keyed market storage is authoritative
- wheat automation has explicit wheat-only crate and worker cargo
- corn automation has explicit corn-only crate and worker cargo
- poultry inventory has explicit feed and egg storage
- compatibility fields, if temporarily retained, are derived and are not persisted

Do not save two independently mutable representations of the same value.

Add tests proving that snapshot creation does not include duplicate legacy inventory values.

---

## 4. IndexedDB database

Use a stable database name:

```text
hurry-go-round-db
```

Initial IndexedDB version:

```text
1
```

Recommended object stores:

```text
saves
settings
metadata
```

The exact structure may differ, but support these logical keys:

```text
primary
backup
settings
```

Recommended repository interface:

```ts
interface SaveRepository {
  loadPrimary(): Promise<SaveEnvelope | null>;
  loadBackup(): Promise<SaveEnvelope | null>;
  savePrimary(envelope: SaveEnvelope): Promise<void>;
  saveBackup(envelope: SaveEnvelope): Promise<void>;
  deleteAll(): Promise<void>;
  loadSettings(): Promise<PersistedSettings | null>;
  saveSettings(settings: PersistedSettings): Promise<void>;
}
```

Provide an in-memory repository for deterministic tests.

Do not access IndexedDB directly from scenes or UI controls.

---

## 5. Save envelope

Use a versioned envelope equivalent to:

```ts
interface SaveEnvelope {
  format: "hurry-go-round-save";
  schemaVersion: 1;
  gameVersion: string;
  saveId: string;
  createdAt: string;
  updatedAt: string;
  checksumAlgorithm: "SHA-256";
  checksum: string;
  payload: PersistedGameSnapshot;
}
```

Rules:

- timestamps use ISO 8601 UTC strings
- `saveId` remains stable for one farm
- `createdAt` remains the original creation time
- `updatedAt` changes on successful saves
- checksum covers a canonical JSON representation of `payload`
- use the browser Web Crypto API for SHA-256
- checksum is corruption detection, not an anti-cheat security boundary
- do not claim save data is tamper-proof

The import system must reject an invalid checksum unless the user explicitly chooses a clearly labeled recovery path that first validates and sanitizes the payload. Ordinary import must not silently ignore a checksum mismatch.

---

## 6. Persisted snapshot

Use an explicit schema equivalent to:

```ts
interface PersistedGameSnapshot {
  player: {
    x: number;
    y: number;
    facing: "front" | "back" | "left" | "right";
  };

  cargo: {
    amounts: ResourceAmounts;
    capacity: number;
  };

  storage: {
    barn: ResourceAmounts;
    market: ResourceAmounts;
    marketCapacity: ResourceAmounts;
  };

  economy: {
    walletCoins: number;
    tillCoins: number;
    soldByResource: ResourceAmounts;
    soldUnits: number;
    customersServed: number;
    customersLeftWithoutPurchase: number;
    contractCoinsEarned: number;
  };

  landExpansion: LandExpansionState;
  livestock: LivestockInventory;
  upgrades: UpgradeState;
  workers: PersistedWorkersState;
  automation: PersistedAutomationState;
  crops: PersistedCropSnapshot[];
  contracts: PersistedContractState;
  progression: PersistedProgressionFlags;
  statistics: PersistedStatistics;
  tutorial: PersistedTutorialState;
  playTimeMs: number;
  saveSequence: number;
}
```

Exact type names may differ.

All numbers must be finite and range-validated.

---

## 7. Player position restore

Save the farmer's world position and facing.

On restore:

- clamp position to world bounds
- reject non-finite coordinates
- prevent restoration inside locked land
- prevent restoration inside impassable buildings or outside walkable boundaries
- if invalid, use the safe initial spawn point
- clear any saved point-move target or drag input
- start with zero input direction

Do not save the camera center independently; let the camera follow the restored player.

---

## 8. Crop persistence

Wheat and corn nodes need stable IDs.

Persist each crop as:

```ts
interface PersistedCropSnapshot {
  id: string;
  resource: "wheat" | "corn";
  state: "ready" | "growing" | "harvested";
  remainingMs: number;
}
```

Rules:

- stable IDs must not depend only on array order if possible
- `remainingMs` is active simulation time, not wall-clock completion time
- no crop growth occurs while the app is closed
- clamp remaining time to the valid configured range
- unknown crop IDs are ignored safely
- missing known crop IDs use a documented default state
- duplicate crop IDs invalidate the snapshot or are rejected during validation

On load, restore each node's logical lifecycle before rendering its visual state.

---

## 9. Worker and automation persistence

Persist durable worker state:

- hired flags
- worker cargo amounts
- wheat field-crate inventory
- corn field-crate inventory
- caretaker resource and carried amount
- unlocked automation facilities

Do not persist fragile runtime path indices or Phaser positions as authoritative task state.

On load:

- instantiate hired workers
- restore their cargo
- place workers at safe authored restart points
- choose a safe restart phase based on cargo and inventories
- if carrying goods, route them toward the correct deposit location
- if not carrying goods, begin from an idle/task-selection state
- never lose worker-carried goods
- never duplicate worker-carried goods

Examples:

- wheat harvester carrying wheat restarts by returning to the wheat crate
- wheat transporter carrying wheat restarts by going to the barn
- corn harvester carrying corn restarts by returning to the corn crate
- corn transporter carrying corn restarts by going to the barn
- caretaker carrying corn restarts by going to the feed trough
- caretaker carrying eggs restarts by going to the barn

Add tests for every restart decision.

---

## 10. Customers and market persistence

Persist:

- market stock
- barn stock
- till coins
- sales statistics
- customer-abandonment statistics

Do not persist active customer entities, queue order, patience timers, purchase timers, or exit animations.

After load:

- start with an empty customer queue
- resume ordinary spawning
- preserve market stock
- preserve till coins
- preserve served/abandoned statistics

This avoids restoring customers into invalid world positions while preserving all economic value.

---

## 11. Livestock persistence

Persist:

- feed amount and capacity
- egg-storage amount and capacity
- chicken-coop unlock state
- caretaker hiring/cargo state

Do not generate eggs or consume feed while the app is closed.

The egg-production timer may either:

1. persist active remaining simulation milliseconds, or
2. restart from the full interval on load

Prefer option 1 for continuity. Document the chosen behavior and test it.

Do not use the elapsed wall-clock time between saves to produce eggs.

---

## 12. Contract persistence

Persist every contract value specified in `CONTRACTS.md`, including:

- generated offers
- active contract
- delivered progress
- active-play elapsed time
- target bonus time
- contract generator seed/state
- sequence counter
- reputation
- completed/cancelled statistics

Contract timers advance only during active unpaused gameplay.

No contract timer advances while the app is closed.

---

## 13. Tutorial and hint persistence

Persist one-time progression/tutorial flags so completed long explanations do not reappear after every reload.

Do not persist a currently visible transient hint.

Persist logical flags such as:

```text
first harvest completed
first delivery completed
first sale completed
first worker hired
first corn unlock completed
first coop unlock completed
first contract accepted
first contract shipment
first contract completed
```

The exact set may follow the current tutorial architecture.

---

## 14. Autosave policy

Use dirty-state tracking.

Recommended autosave interval:

```text
15 seconds
```

Autosave only when:

- game state is dirty
- no save is already in progress
- initial load has completed
- no destructive import/reset operation is in progress

Mark dirty after canonical state changes.

Immediately request a save after major progression events:

- land purchase
- upgrade purchase
- worker hire
- contract acceptance
- contract completion
- contract cancellation
- successful imported-save activation
- settings change

Use a short debounce so several changes in one update do not create several writes.

Recommended debounce:

```text
500 ms
```

Do not save on every harvested unit, every coin transfer, every customer update, or every frame.

---

## 15. Page lifecycle save

Listen for:

```text
visibilitychange
pagehide
```

When the page becomes hidden or is leaving:

- request a final save if dirty
- do not block the UI with a modal
- use ordinary IndexedDB writes where the browser permits
- do not claim completion if the browser terminates the page before the promise resolves

`beforeunload` may be used only for best-effort triggering; do not show a generic browser confirmation dialog merely because a save is pending.

Remove lifecycle listeners during teardown/tests as appropriate.

---

## 16. Primary and backup writes

Before replacing a valid primary save:

1. read and validate the existing primary
2. if valid, copy it to `backup`
3. write the new primary
4. read the written primary and validate it
5. only then report save success

If no valid primary exists, write the new primary directly.

If backup writing fails but primary writing succeeds:

- report a non-fatal backup warning
- keep the valid primary

If primary writing fails:

- do not report success
- keep the previous primary/backup records
- show a short Japanese error message

---

## 17. Load and recovery order

On startup:

1. load primary
2. validate envelope, schema, checksum, and payload
3. if valid, use primary
4. if invalid, load backup
5. if backup is valid, offer or automatically perform documented recovery
6. show a Japanese recovery notice
7. if both are invalid or absent, show the new-game flow

Suggested messages:

```text
前回のセーブデータを読み込みました

セーブデータに問題があったため、バックアップから復元しました

有効なセーブデータが見つかりませんでした
```

Do not silently discard a corrupt save and start a new game.

---

## 18. Validation and sanitization

Create deterministic validation functions.

Validate at least:

- object shape
- schema version
- game version string presence
- resource keys
- finite numbers
- non-negative inventory and currency
- capacity bounds
- upgrade-level ranges
- land prerequisite consistency
- worker prerequisite consistency
- worker cargo capacities
- crop ID uniqueness
- contract resource validity
- contract reward and requirement ranges
- contract progress not exceeding requirement
- player coordinates
- statistics non-negative
- play time non-negative

Do not silently clamp severe structural corruption.

Use these outcomes:

```ts
type ValidationResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: string[] };
```

Minor legacy/defaultable fields may produce warnings and defaults. Invalid core structure must fail.

---

## 19. Schema migration

Initial save schema:

```text
schemaVersion = 1
```

Create migration infrastructure even though no previous persistent schema exists.

Recommended API:

```ts
migrateSaveEnvelope(input: unknown): MigrationResult;
```

Rules:

- schema version newer than supported: reject with a clear message
- schema version equal to current: validate directly
- older known schema: run ordered migrations
- every migration is pure and tested
- do not mutate the source object unexpectedly
- preserve `saveId` and `createdAt`
- update `schemaVersion`
- recalculate checksum after migration

Do not attempt heuristic migration from arbitrary unrelated JSON.

---

## 20. Manual save

The pause/management menu must provide:

```text
今すぐ保存
```

Behavior:

- disable while a save is in progress
- show success time after completion
- show error on failure
- do not create duplicate simultaneous save operations

Suggested status:

```text
保存中…
保存しました　14:32
保存に失敗しました
```

Use local display time for UI only; save metadata remains UTC ISO.

---

## 21. Save-status indicator

Add a small unobtrusive camera-fixed indicator.

States:

```text
変更なし
未保存
保存中
保存済み
保存エラー
```

It may normally collapse to an icon after a short delay.

Do not show a large persistent message during ordinary autosaves.

Reduced-motion mode must avoid spinning or pulsing save icons.

---

## 22. JSON export

Provide:

```text
セーブデータを書き出す
```

Export the validated envelope as formatted UTF-8 JSON.

Recommended filename:

```text
hurry-go-round-save-YYYYMMDD-HHMMSS.json
```

Requirements:

- run a fresh manual save first or export the current canonical snapshot
- include checksum
- do not include code, scripts, DOM, or secrets
- use a Blob and object URL
- revoke object URL after download
- show success/failure feedback

Do not export browser-internal IndexedDB metadata that is not part of the format.

---

## 23. JSON import

Provide:

```text
セーブデータを読み込む
```

Import requirements:

- accept `.json`
- maximum file size: 2 MiB
- parse as text/JSON only
- never evaluate code
- validate envelope, schema, checksum, and payload
- show a preview before applying
- preview includes save date, game version, wallet, land unlocks, worker hires, reputation, and contract progress
- require explicit confirmation
- create a backup of the current valid primary before replacing it
- after successful import, restart/rebuild the game from imported canonical state
- do not partially merge imported state into the current runtime

Suggested failure messages:

```text
このファイルは読み込めません
セーブデータの形式が正しくありません
セーブデータが破損しています
このセーブデータは新しいバージョンで作成されています
```

---

## 24. New game and reset

Title screen new game:

- if no valid save exists, start directly after confirmation-free title action
- if a valid save exists, require confirmation before replacing progress

Pause menu reset:

```text
農場を最初からやり直す
```

Use a two-step confirmation:

1. explanatory confirmation
2. explicit final action such as `すべて消して最初から`

Reset must delete:

- primary save
- backup save
- gameplay progression

Settings may be retained by default. Document the behavior.

Do not delete data merely by opening the reset panel.

---

## 25. Persistence settings

Persist settings independently so they can apply before the game snapshot loads.

Recommended settings:

```ts
interface PersistedSettings {
  textScale: 1 | 1.15 | 1.3;
  reducedMotion: boolean;
  joystickScale: 0.85 | 1 | 1.15;
  joystickOpacity: 0.45 | 0.65 | 0.85;
  contextualHints: boolean;
}
```

Validate and default each field.

Do not store arbitrary CSS or executable content.

---

## 26. No offline progression

The save includes metadata timestamps, but v0.7.0 must not use elapsed closed time to create resources or currency.

On resume:

- crop timers continue from saved remaining active time
- contract bonus timer continues from saved active elapsed time
- egg production continues from saved active remaining time
- workers restart safely
- customers start fresh

No simulation occurs for the time between `updatedAt` and load time.

---

## 27. Failure handling

Persistence errors must not crash the active farm session.

On save failure:

- retain in-memory state
- set save status to error
- allow retry
- do not reset the farm

On load failure:

- try backup
- if no valid backup, show a clear title-screen recovery state
- allow import
- allow new game only after explicit user action

Log concise developer diagnostics to the console, but do not expose stack traces in public UI.
