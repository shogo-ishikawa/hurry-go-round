import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    console.error(`[browser pageerror] ${error.stack ?? error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      console.error(`[browser ${message.type()}] ${message.text()}`);
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

async function waitForDeposit(
  page: Page,
  expectedBatch: number,
  expectedCrate: number,
): Promise<void> {
  let lastLoggedAt = 0;
  await expect
    .poll(
      async () => {
        const summary = await wheatSummary(page);
        const now = Date.now();
        if (now - lastLoggedAt >= 5_000) {
          lastLoggedAt = now;
          console.log(`[wheat diagnostics] ${JSON.stringify(summary)}`);
        }
        return {
          completedDepositCount: summary.completedDepositCount,
          lastDepositedBatchSize: summary.lastDepositedBatchSize,
          crateAmount: summary.crateAmount,
          emptyCrateTripCount: summary.emptyCrateTripCount,
        };
      },
      { timeout: 60_000 },
    )
    .toMatchObject({
      completedDepositCount: 1,
      lastDepositedBatchSize: expectedBatch,
      crateAmount: expectedCrate,
      emptyCrateTripCount: 0,
    });
}

test("Lv2 deposits seven wheat and expanded wheat survives reload", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "はじめる" }).click();
  await configureWheat(page, 1, 2);
  await expect.poll(() => wheatSummary(page)).toMatchObject({
    nodeCount: 42,
    workerLevel: 2,
    workerCapacity: 7,
    crateCapacity: 24,
  });

  const startedAt = Date.now();
  await waitForDeposit(page, 7, 7);
  const completionMs = Date.now() - startedAt;
  console.log(`Lv2 first wheat batch: 7 in ${completionMs}ms`);

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
  });
});

test("Lv3 deposits ten wheat without an empty crate trip", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "はじめる" }).click();
  await configureWheat(page, 2, 3);
  await expect.poll(() => wheatSummary(page)).toMatchObject({
    nodeCount: 54,
    workerLevel: 3,
    workerCapacity: 10,
    crateCapacity: 32,
  });

  const startedAt = Date.now();
  await waitForDeposit(page, 10, 10);
  const completionMs = Date.now() - startedAt;
  console.log(`Lv3 first wheat batch: 10 in ${completionMs}ms`);
});
