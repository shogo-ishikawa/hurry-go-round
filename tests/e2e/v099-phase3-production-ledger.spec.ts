import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

type ProcessingInteraction =
  | "purchase-processing-yard"
  | "build-grain-mill"
  | "build-bakery"
  | "transfer-mill-input"
  | "collect-mill-output";

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
    bridge.advanceProcessing(duration, 50);
  }, durationMs);
}

async function buildAll(page: Page): Promise<void> {
  await configureProcessing(page, 4000);
  await at(page, "purchase-processing-yard", 1240);
  await at(page, "build-grain-mill", 1040);
  await at(page, "build-bakery", 1040);
}

async function produceMillPair(page: Page): Promise<void> {
  await configureProcessing(page, 2000, { wheat: 2, corn: 2 });
  await at(page, "transfer-mill-input", 240);
  await advance(page, 8000);
}

async function diagnostics(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingDiagnostics());
}

async function panel(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingPanel());
}

async function clickPanelButton(page: Page, label: string): Promise<void> {
  const summary = await panel(page);
  const button = summary.buttons.find((item) => item.label === label);
  if (!button) throw new Error(`Processing button not found: ${label}`);
  expect(button.enabled).toBe(true);
  await page.mouse.click(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
}

test("records both mill recipes and exposes the production ledger", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);
  await produceMillPair(page);

  expect(await diagnostics(page)).toMatchObject({
    millActiveRecipe: null,
    millOutput: { flour: 1, cornmeal: 1 },
  });

  await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(4));
  await expect.poll(async () => (await panel(page)).pageName).toBe("完成品");

  const summary = await panel(page);
  const visibleText = summary.visibleText
    .filter((item) => item.visible && !item.clipped)
    .map((item) => item.text)
    .join("\n");

  expect(visibleText).toContain("完成品置き場 2/16");
  expect(visibleText).toContain("小麦粉 1 / 計画6");
  expect(visibleText).toContain("コーンミール 1 / 計画6");
  expect(visibleText).toContain("累計");
  expect(visibleText).toContain("小麦粉 1");
  expect(visibleText).toContain("コーンミール 1");
  expect(visibleText).toContain("最後に完成 コーンミール");
  expect(visibleText).toContain("直近の履歴");
  expect(summary.buttons.some((item) => item.label === "製粉品を倉庫へ")).toBe(
    true,
  );
});

test("collects mixed finished goods atomically and re-arms for new output", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);
  await produceMillPair(page);

  await at(page, "collect-mill-output", 80);
  let state = await diagnostics(page);
  expect(state).toMatchObject({
    millOutput: { flour: 0, cornmeal: 0 },
    playerCargo: { flour: 1, cornmeal: 1 },
  });

  await advance(page, 240);
  expect(await diagnostics(page)).toMatchObject({
    millOutput: { flour: 0, cornmeal: 0 },
    playerCargo: { flour: 1, cornmeal: 1 },
  });

  await configureProcessing(page, 2000, { wheat: 2 });
  await at(page, "transfer-mill-input", 160);
  await advance(page, 3600);
  await at(page, "collect-mill-output", 80);

  state = await diagnostics(page);
  expect(state).toMatchObject({
    millOutput: { flour: 0, cornmeal: 0 },
    playerCargo: { flour: 2, cornmeal: 1, wheat: 0 },
  });
});

test("moves all mixed mill output to the barn through the visible button once", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);
  await page.evaluate(() =>
    window.__HGR_E2E__!.configureInventory({
      market: { flour: 0, cornmeal: 0 },
      marketCapacity: { flour: 0, cornmeal: 0 },
    }),
  );
  await produceMillPair(page);

  await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(4));
  await expect.poll(async () => (await panel(page)).pageName).toBe("完成品");
  await clickPanelButton(page, "製粉品を倉庫へ");

  await expect
    .poll(async () => (await diagnostics(page)).millOutput.flour)
    .toBe(0);
  let inventory = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  let rows = new Map(inventory.rows.map((row) => [row.name, row] as const));
  expect(rows.get("小麦粉")?.barn).toBe(1);
  expect(rows.get("コーンミール")?.barn).toBe(1);

  await clickPanelButton(page, "製粉品を倉庫へ");
  inventory = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  rows = new Map(inventory.rows.map((row) => [row.name, row] as const));
  expect(rows.get("小麦粉")?.barn).toBe(1);
  expect(rows.get("コーンミール")?.barn).toBe(1);
});
