import { expect, test, type Page } from "@playwright/test";

const FROZEN_MARKET = {
  wheat: 0,
  corn: 0,
  egg: 0,
  flour: 0,
  cornmeal: 0,
  bread: 0,
  cornbread: 0,
  hay: 0,
  milk: 0,
  butter: 0,
  cheese: 0,
} as const;

async function start(page: Page): Promise<void> {
  await page.goto("");
  await page.getByRole("button", { name: /はじめる|つづきから/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
}

test("mixed cargo enters the barn once as an atomic batch and survives reload", async ({
  page,
}) => {
  await start(page);
  await page.evaluate((marketCapacity) => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    bridge.configureInventory({
      cargo: { wheat: 3, egg: 2, flour: 4, milk: 1 },
      barn: { wheat: 5, egg: 1, flour: 0, milk: 2 },
      market: { ...marketCapacity },
      marketCapacity: { ...marketCapacity },
    });
  }, FROZEN_MARKET);

  const before = await page.evaluate(() => window.__HGR_E2E__!.getLogistics());
  expect(before.barn).toMatchObject({ wheat: 5, egg: 1, flour: 0, milk: 2 });
  expect(before.market).toMatchObject({ wheat: 0, egg: 0, flour: 0, milk: 0 });

  await page.evaluate(() => window.__HGR_E2E__!.positionAtBarnDelivery());
  let state = await page.evaluate(() => window.__HGR_E2E__!.getLogistics());
  expect(state.cargo).toMatchObject({ wheat: 0, egg: 0, flour: 0, milk: 0 });
  expect(state.barn).toMatchObject({ wheat: 8, egg: 3, flour: 4, milk: 3 });

  await page.evaluate(() =>
    window.__HGR_E2E__!.configureInventory({ cargo: { corn: 2 } }),
  );
  await page.waitForTimeout(250);
  state = await page.evaluate(() => window.__HGR_E2E__!.getLogistics());
  expect(state.cargo.corn).toBe(2);

  // Armed/re-entry state is deliberately transient and resets on load. Leave
  // the delivery zone before saving so this assertion tests cargo persistence,
  // rather than intentionally triggering a fresh delivery after reload.
  await page.evaluate(() =>
    window.__HGR_E2E__!.positionOutsideBarnDelivery(),
  );
  expect(
    (await page.evaluate(() => window.__HGR_E2E__!.getLogistics())).cargo.corn,
  ).toBe(2);

  await page.evaluate(() => window.__HGR_E2E__!.requestSave());
  await page.reload();
  await page.getByRole("button", { name: "つづきから" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
  state = await page.evaluate(() => window.__HGR_E2E__!.getLogistics());
  expect(state.barn).toMatchObject({ wheat: 8, egg: 3, flour: 4, milk: 3 });
  expect(state.cargo.corn).toBe(2);
});

test("collection stations batch partial deposit and capacity-limited withdraw independently", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() =>
    window.__HGR_E2E__!.configureCollection({
      built: true,
      sources: { wheat: 22 },
      cargo: { wheat: 7, corn: 1 },
      cargoCapacity: 12,
    }),
  );

  await page.evaluate(() =>
    window.__HGR_E2E__!.positionAtCollectionInteraction(
      "deposit-wheat-collection-box",
    ),
  );
  let diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.boxes.wheat.amount).toBe(24);
  expect(diagnostics.cargo.wheat).toBe(5);

  await page.evaluate(() =>
    window.__HGR_E2E__!.positionAtCollectionInteraction(
      "open-collection-panel",
    ),
  );
  await page.evaluate(() =>
    window.__HGR_E2E__!.positionAtCollectionInteraction(
      "withdraw-wheat-collection-box",
    ),
  );
  diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.cargo.wheat).toBe(11);
  expect(diagnostics.cargo.corn).toBe(1);
  expect(diagnostics.boxes.wheat.amount).toBe(18);

  await page.waitForTimeout(250);
  expect(
    (
      await page.evaluate(() =>
        window.__HGR_E2E__!.getCollectionDiagnostics(),
      )
    ).boxes.wheat.amount,
  ).toBe(18);
});

test("hub construction stays still while locked or underfunded, then charges exactly once", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() =>
    window.__HGR_E2E__!.configureCollection({
      coins: 1000,
      processingYard: false,
      built: false,
    }),
  );
  await page.evaluate(() =>
    window.__HGR_E2E__!.positionAtCollectionInteraction(
      "build-collection-hub",
    ),
  );
  await page.evaluate(() => window.__HGR_E2E__!.advanceCollection(5000));
  let diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.hubBuilt).toBe(false);
  expect(diagnostics.walletCoins).toBe(1000);
  expect(diagnostics.construction.holdMs).toBe(0);

  await page.evaluate(() =>
    window.__HGR_E2E__!.configureCollection({
      coins: 599,
      processingYard: true,
      built: false,
    }),
  );
  await page.evaluate(() => window.__HGR_E2E__!.advanceCollection(5000));
  diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.hubBuilt).toBe(false);
  expect(diagnostics.walletCoins).toBe(599);
  expect(diagnostics.construction.holdMs).toBe(0);

  await page.evaluate(() =>
    window.__HGR_E2E__!.configureCollection({
      coins: 700,
      processingYard: true,
      built: false,
    }),
  );
  await page.evaluate(() => window.__HGR_E2E__!.advanceCollection(1200));
  diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.hubBuilt).toBe(true);
  expect(diagnostics.walletCoins).toBe(100);

  const changed = diagnostics.changedCommandCount;
  await page.evaluate(() => window.__HGR_E2E__!.advanceCollection(5000));
  diagnostics = await page.evaluate(() =>
    window.__HGR_E2E__!.getCollectionDiagnostics(),
  );
  expect(diagnostics.walletCoins).toBe(100);
  expect(diagnostics.changedCommandCount).toBe(changed);
});
