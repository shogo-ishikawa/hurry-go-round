import { expect, test, type Page } from "@playwright/test";

const resourceIds = [
  "wheat",
  "corn",
  "egg",
  "flour",
  "cornmeal",
  "bread",
  "cornbread",
  "hay",
  "milk",
  "butter",
  "cheese",
] as const;

const names = [
  "麦",
  "とうもろこし",
  "たまご",
  "小麦粉",
  "コーンミール",
  "パン",
  "コーンブレッド",
  "干し草",
  "牛乳",
  "バター",
  "チーズ",
];

async function ready(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
  return errors;
}

test("ledger shows exact carried and warehouse rows, paginates, and survives reload", async ({
  page,
}) => {
  const errors = await ready(page);
  const values = Object.fromEntries(
    resourceIds.map((id, index) => [id, index + 1]),
  );
  const barn = Object.fromEntries(
    Object.entries(values).map(([id, amount]) => [id, amount + 11]),
  );
  const zeroMarketCapacity = Object.fromEntries(
    resourceIds.map((id) => [id, 0]),
  );

  await page.evaluate(
    ([cargo, warehouse, capacity]) =>
      window.__HGR_E2E__!.configureInventory({
        cargo,
        cargoCapacity: 100,
        barn: warehouse,
        marketCapacity: capacity,
      }),
    [values, barn, zeroMarketCapacity] as const,
  );

  const hud = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  expect(hud.carried).toContain("一覧");
  expect(hud.barn).toContain("一覧");

  await page.keyboard.press("i");
  let panel = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  expect(panel.section).toBe("持ち物・倉庫");
  expect(panel.rows.map((row) => row.name)).toEqual(names);

  panel.rows.forEach((row, index) => {
    expect(row.carried).toBe(index + 1);
    expect(row.barn).toBe(index + 12);
    expect(row.availableForContract).toBe(index * 2 + 13);
  });
  expect(
    panel.buttons.every(
      (button) =>
        button.x >= 0 &&
        button.x + button.width <= page.viewportSize()!.width,
    ),
  ).toBe(true);

  await page.keyboard.press("PageDown");
  panel = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  expect(panel.scrollPosition).toBeGreaterThanOrEqual(0);

  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__HGR_E2E__!.requestSave());
  await page.reload();
  await page.getByRole("button", { name: "つづきから" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);

  await page.keyboard.press("i");
  panel = await page.evaluate(() =>
    window.__HGR_E2E__!.getInventoryDiagnostics(),
  );
  expect(panel.rows[10]).toMatchObject({ carried: 11, barn: 22 });
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`processing overview is visibly reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors = await ready(page);
    await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(0));

    let panel = await page.evaluate(() =>
      window.__HGR_E2E__!.getProcessingPanel(),
    );
    expect(panel.pageName).toBe("概要");
    expect(
      panel.visibleText.some(
        (item) =>
          item.visible && !item.clipped && item.text.includes("加工場の流れ"),
      ),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__HGR_E2E__!.openProcessingPanel(1));
    panel = await page.evaluate(() =>
      window.__HGR_E2E__!.getProcessingPanel(),
    );
    expect(panel.pageName).toBe("レシピ帳");

    const reached = new Set<string>();
    for (let pageIndex = 0; pageIndex < 8; pageIndex += 1) {
      panel = await page.evaluate(() =>
        window.__HGR_E2E__!.getProcessingPanel(),
      );
      panel.visibleText
        .filter((item) => item.visible && !item.clipped)
        .forEach((item) => reached.add(item.text));

      expect(
        panel.buttons.every(
          (button) =>
            button.x >= -1 &&
            button.x + button.width <= viewport.width + 1 &&
            button.y >= -1 &&
            button.y + button.height <= viewport.height + 1 &&
            button.height >= 44,
        ),
      ).toBe(true);

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

    const all = [...reached].join(" ");
    expect(all).toContain("麦 2 → 小麦粉 1");
    expect(all).toContain("とうもろこし 2 → コーンミール 1");
    expect(all).toContain("小麦粉 1 + たまご 1 → パン 1");
    expect(all).toContain(
      "小麦粉 1 + コーンミール 1 + たまご 1 → コーンブレッド 1",
    );
    expect(all).not.toContain("mill-flour");
    expect(all).not.toContain("bakery-bread");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });
}