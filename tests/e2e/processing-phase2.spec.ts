import { expect, test, type Page } from "@playwright/test";

type Interaction =
  | "purchase-processing-yard"
  | "build-grain-mill"
  | "build-bakery"
  | "transfer-mill-input"
  | "collect-mill-output"
  | "transfer-bakery-input"
  | "collect-bakery-output";

async function ready(page: Page): Promise<void> {
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
}

async function at(page: Page, id: Interaction, ms: number): Promise<void> {
  await page.evaluate(
    ([interaction, duration]) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
      bridge.positionAtProcessingInteraction(interaction);
      bridge.advanceProcessing(duration, 40);
    },
    [id, ms] as const,
  );
}

async function advance(page: Page, ms: number, stepMs = 50): Promise<void> {
  await page.evaluate(
    ([duration, step]) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
      bridge.advanceProcessing(duration, step);
    },
    [ms, stepMs] as const,
  );
}

async function configure(
  page: Page,
  coins: number,
  cargo?: Record<string, number>,
): Promise<void> {
  await page.evaluate(
    ([wallet, amounts]) => {
      const bridge = window.__HGR_E2E__;
      if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
      bridge.configureProcessing(wallet, amounts);
    },
    [coins, cargo] as const,
  );
}

async function diagnostics(page: Page) {
  return page.evaluate(() => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    return bridge.getProcessingDiagnostics();
  });
}

async function buildAll(page: Page, coins = 4000): Promise<void> {
  await configure(page, coins);
  await at(page, "purchase-processing-yard", 1240);
  await at(page, "build-grain-mill", 1040);
  await at(page, "build-bakery", 1040);
}

test("constructs the registered processing chain once at exact costs", async ({
  page,
}) => {
  await ready(page);
  await configure(page, 3000);

  await at(page, "purchase-processing-yard", 1240);
  expect(await diagnostics(page)).toMatchObject({
    yardBuilt: true,
    walletCoins: 2200,
    constructionTransactionCount: 1,
  });

  await at(page, "build-grain-mill", 1040);
  expect(await diagnostics(page)).toMatchObject({
    millBuilt: true,
    walletCoins: 1850,
    constructionTransactionCount: 2,
  });

  await at(page, "build-bakery", 1040);
  expect(await diagnostics(page)).toMatchObject({
    bakeryBuilt: true,
    walletCoins: 1000,
    constructionTransactionCount: 3,
  });

  await at(page, "build-bakery", 1200);
  expect(await diagnostics(page)).toMatchObject({
    walletCoins: 1000,
    constructionTransactionCount: 3,
  });
});

test("moves ingredients through real mill and bakery cycles and collection", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);

  await configure(page, 2000, { wheat: 2, corn: 2 });
  await at(page, "transfer-mill-input", 700);

  // Phase 2 transfers every available planned deficit atomically. Both wheat
  // and corn leave the player cargo in one station transaction. The mill then
  // reserves the wheat for flour while the corn remains buffered.
  expect(await diagnostics(page)).toMatchObject({
    playerCargo: { wheat: 0, corn: 0 },
    millInput: { wheat: 0, corn: 2 },
    millActiveRecipe: "mill-flour",
    activeTransferInteraction: "transfer-mill-input",
  });

  await advance(page, 4300);
  expect((await diagnostics(page)).millOutput.flour).toBeGreaterThan(0);

  await at(page, "collect-mill-output", 200);
  expect(await diagnostics(page)).toMatchObject({
    lastManualOutputResource: "flour",
    playerCargo: { flour: 1 },
  });

  await configure(page, 2000, { flour: 1, egg: 1 });
  await at(page, "transfer-bakery-input", 360);

  // Flour and egg are likewise supplied as one atomic planned batch. They are
  // immediately reserved by the bread cycle, so the observable contract is
  // empty cargo plus the active recipe rather than a legacy "last item" value.
  expect(await diagnostics(page)).toMatchObject({
    playerCargo: { flour: 0, egg: 0 },
    bakeryActiveRecipe: "bakery-bread",
    activeTransferInteraction: "transfer-bakery-input",
  });

  await advance(page, 5600);
  expect((await diagnostics(page)).bakeryOutput.bread).toBe(1);

  await at(page, "collect-bakery-output", 200);
  expect(await diagnostics(page)).toMatchObject({
    lastManualOutputResource: "bread",
    bakeryOutput: { bread: 0 },
    playerCargo: { bread: 1 },
  });
});

test("restores active processing cycles and existing output exactly once", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);

  // Produce one completed mill item through the real input and production path.
  await configure(page, 1000, { wheat: 2 });
  await at(page, "transfer-mill-input", 400);
  await advance(page, 3600);
  expect(await diagnostics(page)).toMatchObject({
    millOutput: { flour: 1 },
    millActiveRecipe: null,
  });

  // Moving to the bakery station resets the previous input station's bounded
  // empty-input notification cooldown before the new ingredients are loaded.
  await configure(page, 1000, { flour: 1, egg: 1 });
  await at(page, "transfer-bakery-input", 400);
  await advance(page, 5600);
  expect(await diagnostics(page)).toMatchObject({
    millOutput: { flour: 1 },
    bakeryOutput: { bread: 1 },
    bakeryActiveRecipe: null,
  });

  // Leave the bakery input zone before supplying another batch. This models a
  // real station transition and prevents an intentional no-input message
  // cooldown from delaying the newly supplied ingredients.
  await at(page, "build-bakery", 40);

  // Start fresh cycles immediately before saving. Both cycles retain ample
  // remaining time, so normal post-load frame progression cannot be mistaken
  // for duplicated output.
  await configure(page, 1000, { wheat: 2, flour: 1, egg: 1 });
  await at(page, "transfer-bakery-input", 400);
  await at(page, "transfer-mill-input", 400);

  const before = await diagnostics(page);
  expect(before).toMatchObject({
    millOutput: { flour: 1 },
    bakeryOutput: { bread: 1 },
    millActiveRecipe: "mill-flour",
    bakeryActiveRecipe: "bakery-bread",
  });
  expect(before.millRemainingTime).toBeGreaterThan(2500);
  expect(before.bakeryRemainingTime).toBeGreaterThan(4000);

  await page.evaluate(async () => {
    const bridge = window.__HGR_E2E__;
    if (!bridge) throw new Error("Hurry-Go-Round E2E bridge is unavailable");
    await bridge.requestSave();
  });

  await page.reload();
  await page.getByRole("button", { name: "つづきから" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);

  const after = await diagnostics(page);

  // Finished products must not be duplicated or lost during restore.
  expect(after.millOutput).toEqual(before.millOutput);
  expect(after.bakeryOutput).toEqual(before.bakeryOutput);
  expect(after.millActiveRecipe).toBe(before.millActiveRecipe);
  expect(after.bakeryActiveRecipe).toBe(before.bakeryActiveRecipe);

  // The loaded game resumes immediately, so a small amount of legitimate
  // runtime progress is allowed after restore. The cycles must neither reset to
  // full duration nor complete before the first diagnostic read.
  expect(after.millRemainingTime).toBeGreaterThan(0);
  expect(after.millRemainingTime).toBeLessThanOrEqual(before.millRemainingTime);
  expect(before.millRemainingTime - after.millRemainingTime).toBeLessThan(2000);
  expect(after.bakeryRemainingTime).toBeGreaterThan(0);
  expect(after.bakeryRemainingTime).toBeLessThanOrEqual(
    before.bakeryRemainingTime,
  );
  expect(before.bakeryRemainingTime - after.bakeryRemainingTime).toBeLessThan(
    2000,
  );
});