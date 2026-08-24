import { expect, test, type Page } from "@playwright/test";

const resources = {
  wheat: ["麦", "crop"],
  corn: ["とうもろこし", "crop"],
  egg: ["たまご", "egg-crate"],
  flour: ["小麦粉", "sack"],
  cornmeal: ["コーンミール", "sack"],
  bread: ["パン", "bread-tray"],
  cornbread: ["コーンブレッド", "bread-tray"],
  hay: ["干し草", "hay-bale"],
  milk: ["牛乳", "milk-can"],
  butter: ["バター", "dairy-pack"],
  cheese: ["チーズ", "dairy-pack"],
} as const;

type ResourceKey = keyof typeof resources;

async function ready(page: Page): Promise<void> {
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
}

async function getInventoryDiagnostics(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getInventoryDiagnostics());
}

async function getProcessingPanel(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingPanel());
}

test("renders all eleven carried resources truthfully and preserves mixed inventory", async ({
  page,
}) => {
  await ready(page);

  const zero = Object.fromEntries(
    (Object.keys(resources) as ResourceKey[]).map((id) => [id, 0]),
  ) as Record<ResourceKey, number>;

  for (const [id, [name, art]] of Object.entries(resources)) {
    await page.evaluate(
      ([amounts, key]) =>
        window.__HGR_E2E__!.configureInventory({
          cargo: { ...amounts, [key]: 1 },
        }),
      [zero, id] as const,
    );

    const ui = await getInventoryDiagnostics(page);
    expect(ui.carried).toContain(name);
    expect(ui.carried).toContain("1 / 12");
    expect(ui.cargoArt).toEqual([art]);
  }

  const mixed = {
    wheat: 1,
    corn: 1,
    egg: 1,
    flour: 1,
    cornmeal: 1,
    bread: 1,
    cornbread: 1,
    hay: 1,
    milk: 1,
    butter: 1,
    cheese: 1,
  };

  await page.evaluate(
    (value) =>
      window.__HGR_E2E__!.configureInventory({
        cargo: value,
        barn: { cheese: 2, flour: 3 },
        market: { milk: 2, bread: 1 },
        marketCapacity: { flour: 0, cheese: 0 },
        tillCoins: 14,
        walletCoins: 23,
      }),
    mixed,
  );

  let ui = await getInventoryDiagnostics(page);
  expect(ui.carried).toContain("11 / 12");
  expect(ui.carried).toContain("ほか 8種類・8個");
  expect(ui.barn).toContain("合計 5");
  expect(ui.market).toContain("販売棚 合計 3");
  expect(ui.till).toContain("未回収売上");
  expect(ui.wallet).toContain("所持コイン");

  await page.evaluate(() => window.__HGR_E2E__!.openInventory());
  ui = await getInventoryDiagnostics(page);

  expect(ui.section).toBe("持ち物・倉庫");
  const overlayText = ui.overlayText.join(" ");
  expect(overlayText).toContain("在庫台帳");
  expect(overlayText).toContain("商品 | 持ち物 | 倉庫 | 利用可能計");
  expect(ui.rows).toHaveLength(11);

  const rows = new Map(ui.rows.map((row) => [row.name, row] as const));
  expect(rows.get("小麦粉")).toMatchObject({
    carried: 1,
    barn: 3,
    availableForContract: 4,
  });
  expect(rows.get("チーズ")).toMatchObject({
    carried: 1,
    barn: 2,
    availableForContract: 3,
  });
  expect(ui.buttons.every((button) => button.height >= 44)).toBe(true);

  await page.evaluate(() => window.__HGR_E2E__!.requestSave());
  await page.reload();
  await page.getByRole("button", { name: "つづきから" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);

  ui = await getInventoryDiagnostics(page);
  expect(ui.carried).toContain("11 / 12");
  expect(ui.barn).toContain("合計 5");
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`inventory and processing panels fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.evaluate(() =>
      window.__HGR_E2E__!.configureProcessing(4000, {
        wheat: 2,
        corn: 2,
        flour: 1,
        egg: 1,
      }),
    );
    await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(2));

    const reached = new Set<string>();
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const panel = await getProcessingPanel(page);
      expect(panel.pageName).toBe("製粉機");
      expect(
        panel.buttons.every(
          (button) =>
            button.height >= 44 &&
            button.x >= -1 &&
            button.x + button.width <= viewport.width + 1 &&
            button.y >= -1 &&
            button.y + button.height <= viewport.height + 1,
        ),
      ).toBe(true);

      for (const item of panel.visibleText) {
        if (item.visible && !item.clipped) reached.add(item.text);
      }

      const next = panel.buttons.find(
        (button) => button.label === "次へ" && button.enabled,
      );
      if (!next) break;

      const previousPosition = panel.scrollPosition;
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.mouse.wheel(0, 120);
      await expect
        .poll(() =>
          page.evaluate(
            () => window.__HGR_E2E__!.getProcessingPanel().scrollPosition,
          ),
        )
        .toBe(previousPosition + 1);
    }

    const text = [...reached].join(" ");
    expect(text).toContain("入力バッファ");
    expect(text).toContain("加工中に予約済み");
    expect(text).toContain("完成品バッファ");
    expect(text).toContain("小麦粉");
    expect(text).not.toContain("mill-flour");
  });
}
