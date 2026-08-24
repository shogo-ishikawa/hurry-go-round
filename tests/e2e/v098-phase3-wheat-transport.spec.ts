import { expect, test, type Page } from "@playwright/test";

async function start(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("");
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
  return errors;
}

async function summary(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getWheatSummary());
}

async function configureTransport(
  page: Page,
  level: 1 | 2 | 3,
  crate: number,
  carried: number,
  barn: number,
): Promise<void> {
  await page.evaluate(
    ({ level, crate, carried, barn }) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");

      // Isolate transporter conservation from the independently running market
      // restock loop. The market behavior is covered by its own scenarios.
      bridge.configureInventory({
        market: { wheat: 0 },
        marketCapacity: { wheat: 0 },
      });
      bridge.configureWheatTransport(level, crate, carried, barn);
    },
    { level, crate, carried, barn },
  );
}

async function advanceUntilNextTransportDelivery(
  page: Page,
  maxSimulatedMs = 30_000,
  stepMs = 50,
) {
  return page.evaluate(
    ({ maxSimulatedMs, stepMs }) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");

      const initial = bridge.getWheatSummary().completedTransportDeliveries;
      let simulatedMs = 0;
      let diagnostics = bridge.getWheatSummary();

      while (
        simulatedMs < maxSimulatedMs &&
        diagnostics.completedTransportDeliveries === initial
      ) {
        const delta = Math.min(stepMs, maxSimulatedMs - simulatedMs);
        bridge.advanceWheatTransport(delta, delta);
        simulatedMs += delta;
        diagnostics = bridge.getWheatSummary();
      }

      return {
        simulatedMs,
        completed: diagnostics.completedTransportDeliveries > initial,
        diagnostics,
      };
    },
    { maxSimulatedMs, stepMs },
  );
}

test("dynamic view redraws 30, 42 and 54 crops inside matching soil", async ({
  page,
}) => {
  const errors = await start(page);

  for (const level of [0, 1, 2] as const) {
    await page.evaluate(
      (nextLevel) => window.__HGR_E2E__!.configureWheat(nextLevel, 1),
      level,
    );
    const value = await summary(page);

    expect(value).toMatchObject({
      renderedLevel: level,
      renderedNodeCount: [30, 42, 54][level],
      oldWestFieldRendered: false,
    });

    for (const node of value.nodeVisualBounds) {
      expect(node.x).toBeGreaterThanOrEqual(value.activeSoilBounds.x);
      expect(node.y).toBeGreaterThanOrEqual(value.activeSoilBounds.y);
      expect(node.x + node.width).toBeLessThanOrEqual(
        value.activeSoilBounds.x + value.activeSoilBounds.width,
      );
      expect(node.y + node.height).toBeLessThanOrEqual(
        value.activeSoilBounds.y + value.activeSoilBounds.height,
      );
    }
  }

  expect(errors).toEqual([]);
});

for (const [level, capacity] of [
  [1, 6],
  [2, 8],
  [3, 10],
] as const) {
  test(`Lv${level} transporter batch delivers ${capacity}`, async ({ page }) => {
    const errors = await start(page);
    await configureTransport(page, level, capacity, 0, 5);

    const result = await advanceUntilNextTransportDelivery(page);
    expect(result.completed).toBe(true);
    expect(result.diagnostics).toMatchObject({
      transportWorkerCapacity: capacity,
      crateAmount: 0,
      transportCargo: 0,
      barnWheat: 5 + capacity,
      lastTransportLoadedBatchSize: capacity,
      lastTransportUnloadedBatchSize: capacity,
      completedTransportDeliveries: 1,
    });
    expect(errors).toEqual([]);
  });
}

test("partial batch recovers without loss", async ({ page }) => {
  const errors = await start(page);
  await configureTransport(page, 2, 3, 0, 7);

  const result = await advanceUntilNextTransportDelivery(page);
  expect(result.completed).toBe(true);
  expect(result.diagnostics).toMatchObject({
    crateAmount: 0,
    transportCargo: 0,
    barnWheat: 10,
    lastTransportLoadedBatchSize: 3,
    lastTransportUnloadedBatchSize: 3,
    completedTransportDeliveries: 1,
  });
  expect(errors).toEqual([]);
});

test("legacy over-capacity cargo departs before touching a full crate", async ({
  page,
}) => {
  const errors = await start(page);
  await configureTransport(page, 3, 32, 11, 10);

  const result = await advanceUntilNextTransportDelivery(page, 15_000);
  expect(result.completed).toBe(true);
  expect(result.diagnostics).toMatchObject({
    crateAmount: 32,
    transportCargo: 0,
    barnWheat: 21,
    lastTransportLoadedBatchSize: 0,
    lastTransportUnloadedBatchSize: 11,
    completedTransportDeliveries: 1,
  });
  expect(errors).toEqual([]);
});
