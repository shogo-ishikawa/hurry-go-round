import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

type ProcessingInteraction =
  | "purchase-processing-yard"
  | "build-grain-mill"
  | "build-bakery"
  | "transfer-mill-input";

async function ready(page: Page): Promise<void> {
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
}

async function configureProcessing(
  page: Page,
  coins: number,
  cargo?: Record<string, number>,
): Promise<void> {
  await page.evaluate(
    ([wallet, amounts]) =>
      window.__HGR_E2E__!.configureProcessing(wallet, amounts),
    [coins, cargo] as const,
  );
}

async function at(
  page: Page,
  interaction: ProcessingInteraction,
  durationMs: number,
): Promise<void> {
  await page.evaluate(
    ([id, duration]) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
      bridge.positionAtProcessingInteraction(id);
      bridge.advanceProcessing(duration, 40);
    },
    [interaction, durationMs] as const,
  );
}

async function advance(page: Page, durationMs: number): Promise<void> {
  await page.evaluate((duration) => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    bridge.advanceProcessing(duration, 40);
  }, durationMs);
}

async function buildAll(page: Page): Promise<void> {
  await configureProcessing(page, 4000);
  await at(page, "purchase-processing-yard", 1240);
  await at(page, "build-grain-mill", 1040);
  await at(page, "build-bakery", 1040);
}

async function processingDiagnostics(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingDiagnostics());
}

async function processingPanel(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingPanel());
}

async function inventoryRows(page: Page) {
  const diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  return new Map(diagnostics.rows.map((row) => [row.name, row] as const));
}

async function clickPanelButton(page: Page, label: string): Promise<void> {
  const panel = await processingPanel(page);
  const button = panel.buttons.find((item) => item.label === label);
  if (!button) throw new Error(`Processing button not found: ${label}`);
  expect(button.enabled).toBe(true);
  await page.mouse.click(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
}

test("atomically fills planned deficits and re-arms after production consumes input", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);

  await configureProcessing(page, 2000, { wheat: 2, corn: 2 });
  await at(page, "transfer-mill-input", 240);

  let state = await processingDiagnostics(page);
  expect(state).toMatchObject({
    playerCargo: { wheat: 0, corn: 0 },
    millInput: { wheat: 0, corn: 2 },
    millActiveRecipe: "mill-flour",
    activeTransferInteraction: "transfer-mill-input",
  });

  // Remaining in the station with the same state must not repeat a transfer.
  await advance(page, 240);
  expect(await processingDiagnostics(page)).toMatchObject({
    playerCargo: { wheat: 0, corn: 0 },
    millInput: { wheat: 0, corn: 2 },
  });

  // The active flour cycle consumed wheat from the input buffer. Supplying new
  // wheat while still inside the station changes the deterministic signature,
  // so the missing target is replenished in one atomic batch.
  await configureProcessing(page, 2000, { wheat: 2, corn: 0 });
  await advance(page, 80);
  state = await processingDiagnostics(page);
  expect(state).toMatchObject({
    playerCargo: { wheat: 0, corn: 0 },
    millInput: { wheat: 2, corn: 2 },
    millActiveRecipe: "mill-flour",
  });
});

test("visible panel actions fill the full plan from the barn and return all waiting input", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);

  await page.evaluate(() =>
    window.__HGR_E2E__!.configureInventory({
      barn: { wheat: 12, corn: 12 },
      marketCapacity: { wheat: 0, corn: 0 },
    }),
  );
  await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(2));
  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(
    "製粉機",
  );

  await clickPanelButton(page, "倉庫から計画まで");
  await expect
    .poll(async () => (await processingDiagnostics(page)).millInput.wheat)
    .toBe(12);

  let state = await processingDiagnostics(page);
  expect(state.millInput).toMatchObject({ wheat: 12, corn: 12 });
  let rows = await inventoryRows(page);
  expect(rows.get("麦")?.barn).toBe(0);
  expect(rows.get("とうもろこし")?.barn).toBe(0);

  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(
    "製粉機",
  );
  await clickPanelButton(page, "入力を全て倉庫へ");
  await expect
    .poll(async () => (await processingDiagnostics(page)).millInput.wheat)
    .toBe(0);

  state = await processingDiagnostics(page);
  expect(state.millInput).toMatchObject({ wheat: 0, corn: 0 });
  rows = await inventoryRows(page);
  expect(rows.get("麦")?.barn).toBe(12);
  expect(rows.get("とうもろこし")?.barn).toBe(12);

  // Repeating the empty action is an explicit no-op and must not duplicate
  // resources.
  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(
    "製粉機",
  );
  const before = await processingDiagnostics(page);
  await clickPanelButton(page, "入力を全て倉庫へ");
  expect((await processingDiagnostics(page)).millInput).toEqual(before.millInput);
  rows = await inventoryRows(page);
  expect(rows.get("麦")?.barn).toBe(12);
  expect(rows.get("とうもろこし")?.barn).toBe(12);
});

test("processing staff can be hired and trained from the visible staff page", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);
  await configureProcessing(page, 10_000);

  await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(5));
  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(
    "スタッフ",
  );

  await clickPanelButton(page, "製粉 雇用 450");
  await expect
    .poll(async () => (await processingDiagnostics(page)).walletCoins)
    .toBe(9550);
  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(
    "スタッフ",
  );

  await clickPanelButton(page, "製パン 雇用 700");
  await expect
    .poll(async () => (await processingDiagnostics(page)).walletCoins)
    .toBe(8850);

  await clickPanelButton(page, "製粉 研修 420");
  await expect
    .poll(async () => (await processingDiagnostics(page)).walletCoins)
    .toBe(8430);

  await clickPanelButton(page, "製パン 研修 650");
  await expect
    .poll(async () => (await processingDiagnostics(page)).walletCoins)
    .toBe(7780);

  const panel = await processingPanel(page);
  expect(panel.pageName).toBe("スタッフ");
  const visibleText = panel.visibleText
    .filter((item) => item.visible && !item.clipped)
    .map((item) => item.text)
    .join(" ");
  expect(visibleText).toContain("製粉スタッフ Lv2");
  expect(visibleText).toContain("容量 12");
  expect(visibleText).toContain("製パンスタッフ Lv2");
  expect(visibleText).toContain("容量 9");
  expect(panel.buttons.every((button) => button.height >= 44)).toBe(true);
});