import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    console.error(`[browser pageerror] ${error.stack ?? error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error(`[browser error] ${message.text()}`);
    }
  });
});

async function waitForGame(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const bridge = window.__HGR_E2E__;
          if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
          return bridge.isGameReady();
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function configureWheat(
  page: Page,
  level: 0 | 1 | 2,
  workerLevel: 1 | 2 | 3,
): Promise<void> {
  await waitForGame(page);
  await page.evaluate(
    ([fieldLevel, trainedLevel]) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
      if (!bridge.isGameReady()) throw new Error("GameScene is not ready");
      bridge.configureWheat(fieldLevel, trainedLevel);
    },
    [level, workerLevel] as const,
  );
}

async function wheatSummary(page: Page) {
  return page.evaluate(() => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    return bridge.getWheatSummary();
  });
}

async function verifyLiveRuntimeStarted(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const summary = await wheatSummary(page);
        return summary.workerPhase !== "idle" && summary.workerPhase !== "seeking-crop";
      },
      { timeout: 10_000 },
    )
    .toBe(true);
}

async function advanceUntilDeposit(page: Page) {
  return page.evaluate(() => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    return bridge.advanceWheatUntilDeposit(60_000, 50);
  });
}

test("Lv2 deposits seven wheat and expanded wheat survives reload", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "はじめる" }).click();
  await configureWheat(page, 1, 2);
  await expect.poll(() => wheatSummary(page)).toMatchObject({
    level: 1,
    nodeCount: 42,
    workerLevel: 2,
    workerCapacity: 7,
    crateCapacity: 24,
  });

  await verifyLiveRuntimeStarted(page);
  const result = await advanceUntilDeposit(page);
  console.log(`Lv2 first wheat batch: ${result.diagnostics.lastDepositedBatchSize} in ${result.simulatedMs} simulated ms`);
  expect(result.completed).toBe(true);
  expect(result.simulatedMs).toBeLessThan(30_000);
  expect(result.diagnostics).toMatchObject({
    completedDepositCount: 1,
    lastDepositedBatchSize: 7,
    crateAmount: 7,
    workerCargo: 0,
    emptyCrateTripCount: 0,
  });

  await page.evaluate(async () => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    await bridge.requestSave();
  });
  await page.reload();
  await page.getByRole("button", { name: "つづきから" }).click();
  await waitForGame(page);
  await expect.poll(() => wheatSummary(page)).toMatchObject({
    level: 1,
    nodeCount: 42,
    workerLevel: 2,
    workerCapacity: 7,
    crateCapacity: 24,
    crateAmount: 7,
  });
});

test("Lv3 deposits ten wheat without an empty crate trip", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "はじめる" }).click();
  await configureWheat(page, 2, 3);
  await expect.poll(() => wheatSummary(page)).toMatchObject({
    level: 2,
    nodeCount: 54,
    workerLevel: 3,
    workerCapacity: 10,
    crateCapacity: 32,
  });

  await verifyLiveRuntimeStarted(page);
  const result = await advanceUntilDeposit(page);
  console.log(`Lv3 first wheat batch: ${result.diagnostics.lastDepositedBatchSize} in ${result.simulatedMs} simulated ms`);
  expect(result.completed).toBe(true);
  expect(result.simulatedMs).toBeLessThan(30_000);
  expect(result.diagnostics).toMatchObject({
    completedDepositCount: 1,
    lastDepositedBatchSize: 10,
    crateAmount: 10,
    workerCargo: 0,
    emptyCrateTripCount: 0,
  });
});
