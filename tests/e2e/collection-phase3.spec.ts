import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

type Setup = Parameters<NonNullable<Window["__HGR_E2E__"]>["configureCollection"]>[0];

async function start(page: Page, setup?: Setup): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect.poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady())).toBe(true);
  if (setup) await page.evaluate(value => window.__HGR_E2E__!.configureCollection(value), setup);
  test.info().annotations.push({ type: "browser-errors", description: errors.join("\n") || "none" });
}

const diagnostics = (page: Page) => page.evaluate(() => window.__HGR_E2E__!.getCollectionDiagnostics());
const panel = (page: Page) => page.evaluate(() => window.__HGR_E2E__!.getCollectionPanel());

async function advance(page: Page, ms: number): Promise<void> {
  await page.evaluate(value => window.__HGR_E2E__!.advanceCollection(value, 50), ms);
}

async function position(page: Page, id: string): Promise<void> {
  await page.evaluate(value => window.__HGR_E2E__!.positionAtCollectionInteraction(value as Parameters<NonNullable<Window["__HGR_E2E__"]>["positionAtCollectionInteraction"]>[0]), id);
}

async function openPanel(page: Page): Promise<void> {
  await position(page, "open-collection-panel");
  // Keep E down while advancing one real collection-system step. A short
  // press can otherwise occur entirely between Phaser frames on slow CI or
  // after a viewport resize, especially at 844x390.
  await page.keyboard.down("e");
  await advance(page, 50);
  await page.keyboard.up("e");
  await expect.poll(async () => (await panel(page)).open).toBe(true);
}

async function buttonRect(page: Page, label: string) {
  const state = await panel(page);
  const button = state.buttons.find(item => item.label === label);
  if (!button) throw new Error(`Visible collection button not found: ${label}`);
  return button;
}

async function clickButton(page: Page, label: string): Promise<void> {
  const button = await buttonRect(page, label);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
}

async function tapButton(page: Page, label: string): Promise<void> {
  const button = await buttonRect(page, label);
  await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
}

test("discovers and constructs the hub and every unlocked box through real holds", async ({ page }) => {
  await start(page);
  expect((await diagnostics(page)).facilities.hub).toMatchObject({ visible: true, built: false, missingPrerequisites: ["processing-yard"] });
  await page.evaluate(() => window.__HGR_E2E__!.configureCollection({ coins: 2000, processingYard: true }));
  await position(page, "build-collection-hub"); await advance(page, 1250);
  expect(await diagnostics(page)).toMatchObject({ walletCoins: 1400, hubBuilt: true, facilities: { wheat: { visible: true, built: false }, corn: { visible: false }, egg: { visible: false } } });
  await page.evaluate(() => window.__HGR_E2E__!.configureCollection({ eastField: true }));
  expect((await diagnostics(page)).facilities.corn.visible).toBe(true);
  await page.evaluate(() => window.__HGR_E2E__!.configureCollection({ chickenCoop: true }));
  expect((await diagnostics(page)).facilities.egg.visible).toBe(true);
  for (const [id, coins] of [["build-wheat-collection-box", 1220], ["build-corn-collection-box", 960], ["build-egg-collection-box", 680]] as const) {
    await position(page, id); await advance(page, 1250); expect((await diagnostics(page)).walletCoins).toBe(coins);
  }
  await advance(page, 1500);
  expect((await diagnostics(page)).walletCoins).toBe(680);
  await page.evaluate(() => window.__HGR_E2E__!.requestSave());
  await page.reload(); await page.getByRole("button", { name: "つづきから" }).click();
  await expect.poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady())).toBe(true);
  expect(await diagnostics(page)).toMatchObject({ hubBuilt: true, boxes: { wheat: { built: true }, corn: { built: true }, egg: { built: true } } });
});

test("mouse controls route, hire, and train exactly once without closing or duplicating listeners", async ({ page }) => {
  await start(page, { coins: 3000, processingYard: true, eastField: true, chickenCoop: true, built: true });
  await openPanel(page); await clickButton(page, "配送設定");
  for (const [label, mode] of [["加工場優先", "processing-first"], ["倉庫優先", "barn-first"], ["自動", "auto"]] as const) {
    await clickButton(page, label); expect(await diagnostics(page)).toMatchObject({ routingMode: mode }); expect((await panel(page)).open).toBe(true);
  }
  const unchanged = await diagnostics(page); await clickButton(page, "自動");
  expect((await diagnostics(page)).changedCommandCount).toBe(unchanged.changedCommandCount);
  expect((await panel(page)).result).toContain("すでに");
  await clickButton(page, "集配スタッフ"); await clickButton(page, "雇用 480");
  expect(await diagnostics(page)).toMatchObject({ walletCoins: 2520, courier: { level: 1, capacity: 10 } });
  await clickButton(page, "研修 260");
  expect(await diagnostics(page)).toMatchObject({ walletCoins: 2260, courier: { level: 2, capacity: 14 } });
  const beforeClose = (await diagnostics(page)).commandCount; await clickButton(page, "閉じる"); await openPanel(page); await clickButton(page, "配送設定"); await clickButton(page, "倉庫優先");
  expect((await diagnostics(page)).commandCount).toBe(beforeClose + 1);
});

test("emergency buttons transfer each exact source independently and empty sources are no-ops", async ({ page }) => {
  await start(page, { coins: 1000, processingYard: true, eastField: true, chickenCoop: true, built: true, sources: { wheat: 7, corn: 5, egg: 3 } });
  await openPanel(page); await clickButton(page, "緊急操作");
  for (const [label, source, amount] of [["麦を倉庫へ移す", "wheat", 7], ["とうもろこしを倉庫へ移す", "corn", 5], ["たまごを倉庫へ移す", "egg", 3]] as const) {
    const before = await diagnostics(page); await clickButton(page, label); const after = await diagnostics(page);
    expect(after.boxes[source].amount).toBe(0); expect(after.barn[source] - before.barn[source]).toBe(amount);
    for (const other of ["wheat", "corn", "egg"] as const) if (other !== source) expect(after.barn[other]).toBe(before.barn[other]);
    expect((await panel(page)).result).toContain(`${amount}個`); expect((await panel(page)).open).toBe(true);
  }
  const before = await diagnostics(page); const empty = await buttonRect(page, "麦を倉庫へ移す"); expect(empty.enabled).toBe(false);
  await page.mouse.click(empty.x + empty.width / 2, empty.y + empty.height / 2); expect((await diagnostics(page)).commandCount).toBe(before.commandCount);
});

test.describe("touch collection panel", () => {
  test.use({ hasTouch: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    test(`remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await start(page, { coins: 3000, processingYard: true, eastField: true, chickenCoop: true, built: true, sources: { wheat: 2, corn: 2, egg: 2 } }); await openPanel(page);
    for (const label of ["施設", "集配スタッフ", "配送設定", "緊急操作", "閉じる"]) { const rect = await buttonRect(page, label); expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width); expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height); expect(rect.height).toBeGreaterThanOrEqual(44); }
    await tapButton(page, "配送設定"); const before = (await diagnostics(page)).commandCount; await tapButton(page, "加工場優先"); expect(await diagnostics(page)).toMatchObject({ routingMode: "processing-first", commandCount: before + 1 }); expect((await panel(page)).open).toBe(true);
    await tapButton(page, "集配スタッフ"); await tapButton(page, "雇用 480"); await tapButton(page, "研修 260"); expect((await diagnostics(page)).courier).toMatchObject({ level: 2, capacity: 14 });
    await tapButton(page, "緊急操作"); await tapButton(page, "麦を倉庫へ移す"); expect((await diagnostics(page)).barn.wheat).toBe(2); expect((await panel(page)).open).toBe(true);
    });
  }
});

test("keyboard focus is singular, reversible, and activates enabled controls once", async ({ page }) => {
  await start(page, { coins: 2000, processingYard: true, built: true }); await openPanel(page); await clickButton(page, "配送設定");
  const focusedLabel = async () => (await panel(page)).buttons.find(button => button.focused)?.label;
  await page.keyboard.press("Tab"); await expect.poll(focusedLabel).toBe("施設"); expect((await panel(page)).focusedCount).toBe(1); const commands = (await diagnostics(page)).commandCount; await page.keyboard.press("Enter"); expect((await diagnostics(page)).commandCount).toBe(commands);
  await page.keyboard.press("Shift+Tab"); await expect.poll(focusedLabel).toBe("緊急操作"); expect((await panel(page)).focusedCount).toBe(1);
  await page.keyboard.press("Enter"); await expect.poll(async () => (await panel(page)).page).toBe(3); expect((await diagnostics(page)).commandCount).toBe(commands);
  await page.keyboard.press("Tab"); await expect.poll(focusedLabel).toBe("施設"); await page.keyboard.press("Tab"); await expect.poll(focusedLabel).toBe("集配スタッフ"); await page.keyboard.press("Space"); await expect.poll(async () => (await panel(page)).page).toBe(1);
  await page.keyboard.press("Escape"); expect((await panel(page)).open).toBe(false); await openPanel(page); await page.keyboard.press("Tab"); expect((await panel(page)).focusedCount).toBe(1);
});

test("real courier batches, routes, falls back, conserves resources, and persists a mid-route snapshot", async ({ page }) => {
  await start(page, { coins: 3000, processingYard: true, eastField: true, chickenCoop: true, built: true, processingBuilt: true, processingEnabled: true, sources: { wheat: 10, corn: 6, egg: 4 } });
  await openPanel(page); await clickButton(page, "集配スタッフ"); await clickButton(page, "雇用 480"); await clickButton(page, "配送設定"); await clickButton(page, "加工場優先"); await clickButton(page, "閉じる");
  const initial = await diagnostics(page); await advance(page, 14_000); const carried = await diagnostics(page);
  expect(carried.boxes.wheat.amount + carried.boxes.corn.amount + carried.boxes.egg.amount + Object.values(carried.courier.carried).reduce((sum, value) => sum + value, 0) + Object.values(carried.processingIntake).reduce((sum, value) => sum + value, 0) + carried.barn.wheat + carried.barn.corn + carried.barn.egg).toBe(20);
  expect(Math.max(...Object.values(carried.courier.carried))).toBeGreaterThanOrEqual(2);
  await advance(page, 45_000); const delivered = await diagnostics(page); expect(Object.values(delivered.processingIntake).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.__HGR_E2E__!.configureCollection({ sources: { wheat: 6 }, processingEnabled: false })); await advance(page, 70_000); const fallback = await diagnostics(page); expect(fallback.barn.wheat).toBeGreaterThan(0);
  await page.evaluate(() => window.__HGR_E2E__!.configureCollection({ sources: { corn: 8 }, processingEnabled: true })); await advance(page, 12_000); await openPanel(page); const before = await diagnostics(page); expect(before.courier.stage).not.toBe("idle-at-hub"); expect(Object.values(before.courier.carried).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0); await page.evaluate(() => window.__HGR_E2E__!.requestSave());
  await page.reload(); await page.getByRole("button", { name: "つづきから" }).click(); await expect.poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady())).toBe(true); const restored = await diagnostics(page);
  expect(restored).toMatchObject({ hubBuilt: true, routingMode: "processing-first", boxes: before.boxes, processingIntake: before.processingIntake, courier: { hired: true, level: 1, capacity: 10, carried: before.courier.carried, sourceId: before.courier.sourceId, destinationId: before.courier.destinationId } }); expect([before.courier.stage, "loading"]).toContain(restored.courier.stage); expect((await panel(page)).open).toBe(false);
  await advance(page, 70_000); expect((await diagnostics(page)).courier.stage).toBe("idle-at-hub"); expect(initial.commandCount).toBe(2);
});