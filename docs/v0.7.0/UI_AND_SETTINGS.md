# v0.7.0 UI and Settings Specification

## 1. Startup flow

Add a startup sequence equivalent to:

```text
BootScene
→ load settings
→ open and validate local save
→ TitleScene
→ GameScene + UIScene
```

The farm must not start running before save restoration is complete.

### BootScene responsibilities

- initialize the save repository
- load validated settings
- validate primary and backup metadata
- show a simple loading state
- route to title, continue, or recovery state

### TitleScene responsibilities

- continue an existing farm
- start a new farm
- import a save file
- open settings
- show version and last-save summary

### GameScene responsibilities

- receive a validated initial snapshot
- build runtime systems once
- never asynchronously overwrite an already-running default farm

---

## 2. Loading presentation

Show:

```text
Hurry-Go-Round
農場を準備しています…
```

Use local farm art, a cream panel, and restrained animation. Reduced-motion mode must avoid continuous animation.

A load error must route to a recovery screen rather than leave a frozen canvas.

---

## 3. Title screen

If a valid save exists, show:

```text
つづきから
新しくはじめる
セーブデータを読み込む
設定
```

Show a concise save summary:

```text
最終保存　2026/08/15 19:42
所持金　680
評判　地域の農場
契約　進行中
```

If no valid save exists, show:

```text
はじめる
セーブデータを読み込む
設定
```

The title screen must work with mouse, keyboard, and touch.

---

## 4. Continue and new-game behavior

Continue must:

- use the validated loaded snapshot
- restore player, crops, workers, contracts, and UI state
- prevent duplicate scene starts
- show the farm only after restoration is ready

Starting a new farm while progress exists requires a clear two-step confirmation. No progress is replaced merely by opening the confirmation panel.

Settings may remain after a new farm is started.

---

## 5. Pause and management menu

Add a camera-fixed pause button.

PC shortcuts:

```text
Escape
P
```

Mobile uses the pause button.

Menu items:

```text
ゲームに戻る
今すぐ保存
出荷契約
設定
セーブデータを書き出す
セーブデータを読み込む
タイトルへ戻る
農場を最初からやり直す
```

Opening the menu pauses:

- crop and livestock timers
- workers
- customers and patience
- market restocking
- contract timer and delivery
- player movement

Autosave writes may finish while paused.

On pause:

- reset joystick direction
- stop drag movement
- clear or safely suspend point movement
- prevent a large accumulated delta on resume

---

## 6. Save status

Add a small camera-fixed save indicator.

States:

```text
未保存
保存中…
保存しました
保存エラー
```

Ordinary successful status should collapse or fade after about 1.5 seconds. Errors remain until retry or later success.

Reduced-motion mode uses no spinning or repeated pulsing.

---

## 7. Contract-board action

Near the physical contract board, show one camera-fixed context action:

```text
契約を見る
```

Inputs:

- PC: `E`, `Space`, or button click
- mobile: button tap
- direct board tap may also work if it does not trigger movement

The action button must:

- appear only in range
- be reserved from world input
- not overlap the joystick
- disappear after leaving range
- be the only primary context action shown at once

Opening the contract panel pauses simulation.

---

## 8. Contract panel

Display:

- three offer cards
- one active-contract section
- reputation
- completed-contract count
- requirements
- rewards
- optional speed bonus
- accept, decline, cancellation, and close actions

Resource communication must use icon + Japanese name + number, not color alone.

Example:

```text
[麦束] 麦 18
[とうもろこし] とうもろこし 12
[卵箱] たまご 6
```

No internal IDs, seeds, or enum names appear publicly.

---

## 9. Contract completion panel

On completion, pause simulation and show:

```text
契約達成
基本報酬 120コイン
早期達成ボーナス 24コイン
評判 +2
```

Rewards must already be committed once before presentation. Closing the panel must not award them again.

Use a restrained seal-stamp or crate-highlight effect. Reduced-motion mode uses a static highlight and fade.

---

## 10. Settings

Persist these settings independently so they can apply before the game snapshot loads.

### Text size

```text
標準 100%
大きめ 115%
最大 130%
```

Apply to title, pause, contract, hint, and HUD text where layout permits.

### Reduced motion

```text
動きを控えめにする
```

Reduce decorative sway, cargo bounce, large celebration motion, repeated pulses, and spinning status icons while retaining gameplay movement.

### Joystick size

```text
小さめ 85%
標準 100%
大きめ 115%
```

### Joystick opacity

```text
薄い 45%
標準 65%
濃い 85%
```

### Contextual hints

```text
操作案内を表示する
```

If disabled, hide ordinary explanatory hints but still show critical errors, prerequisites, inventory-full messages, save errors, and confirmations.

Apply non-destructive settings immediately and persist them.

---

## 11. Import preview

After validating an imported JSON file, show a preview before applying it:

```text
保存日時
ゲーム版
所持金
土地の開放状況
雇用済みスタッフ
評判
契約状況
```

Actions:

```text
やめる
このデータを読み込む
```

Do not replace current progress before confirmation and successful validation.

After successful import, rebuild the runtime from the imported snapshot rather than partially merging it into the current session.

---

## 12. Export feedback

Action:

```text
セーブデータを書き出す
```

Feedback:

```text
セーブデータを書き出しました
書き出しに失敗しました
```

Do not expose IndexedDB implementation details in ordinary UI.

---

## 13. Return to title

Returning to title must:

1. pause simulation
2. request a save if dirty
3. show retry/return options if saving fails
4. tear down runtime scenes and listeners
5. return to TitleScene

Do not leave duplicate game scenes active.

---

## 14. Recovery screen

If neither primary nor backup is valid, show:

```text
セーブデータを読み込めませんでした
```

Actions:

```text
セーブデータを読み込む
新しくはじめる
詳細を表示
```

Details show concise validation information, not raw stack traces or absolute paths.

---

## 15. Responsive targets

Test:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Desktop:

- centered title and pause panels
- balanced contract cards
- restrained maximum panel width

Mobile landscape:

- large touch targets
- scrollable contract area if required
- safe margins

Mobile portrait:

- vertically stacked cards
- reachable close/back actions
- vertically scrollable settings
- no clipped Japanese text
- destructive actions visually separated from ordinary actions

Minimum touch target should be approximately 44 CSS pixels.

---

## 16. Input isolation

While title, pause, contract, settings, confirmation, or import-preview UI is open:

- disable world pointer navigation
- disable continuous drag movement
- suppress keyboard movement
- reset joystick
- do not place a point target

`Escape` closes only the topmost non-destructive panel first. It must not confirm a destructive action.

All interactive UI rectangles must be reserved from world input.

---

## 17. Visual language

Use the current warm farm style:

- cream surfaces
- warm brown outlines
- wood and cloth accents
- local resource icons
- soft shadows
- clear hierarchy

Avoid:

- remote fonts
- emoji icons
- tiny gray text
- naked map text
- generic browser dialogs for ordinary game UI
- excessive full-screen opacity

Native browser file selection and download behavior are acceptable for import/export.

---

## 18. Public text centralization

Add all new public Japanese text to the existing localization module or a coherent extension.

Centralize:

- title actions
- pause actions
- save states
- recovery messages
- contract labels
- reputation labels
- import/export messages
- settings labels
- confirmations
- validation errors

Do not duplicate the same sentence across several systems.
