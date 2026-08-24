import { expect, test, type Page } from "@playwright/test";

test.setTimeout(180_000);

async function ready(page: Page): Promise<void> {
  await page.goto("");
  await page.getByRole("button", { name: /はじめる/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__HGR_E2E__?.isGameReady()))
    .toBe(true);
}

async function processingPanel(page: Page) {
  return page.evaluate(() => window.__HGR_E2E__!.getProcessingPanel());
}

async function at(
  page: Page,
  id: Parameters<NonNullable<Window["__HGR_E2E__"]>["positionAtProcessingInteraction"]>[0],
  ms: number,
): Promise<void> {
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

async function buildAll(page: Page): Promise<void> {
  await page.evaluate(() => window.__HGR_E2E__!.configureProcessing(4000));
  await at(page, "purchase-processing-yard", 1240);
  await at(page, "build-grain-mill", 1040);
  await at(page, "build-bakery", 1040);
}

async function openDirect(
  page: Page,
  interaction: "open-mill-plan" | "open-bakery-plan",
  expectedPage: "製粉機" | "ベーカリー",
): Promise<void> {
  await page.evaluate(
    (id) => window.__HGR_E2E__!.positionAtProcessingInteraction(id),
    interaction,
  );
  await page.keyboard.down("e");
  await page.evaluate(() => window.__HGR_E2E__!.advanceProcessing(50, 50));
  await page.keyboard.up("e");
  await expect.poll(async () => (await processingPanel(page)).pageName).toBe(expectedPage);
}

function center(rect: { x: number; y: number; width: number; height: number }) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

test("machine-local interactions open the corresponding production-plan page", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);

  await openDirect(page, "open-mill-plan", "製粉機");
  let panel = await processingPanel(page);
  expect(panel.sliders).toHaveLength(2);
  expect(panel.sliders.every((slider) => slider.height >= 44)).toBe(true);
  expect(panel.visibleText.map((item) => item.text).join(" ")).toContain("小麦粉");

  await page.keyboard.press("Escape");
  await openDirect(page, "open-bakery-plan", "ベーカリー");
  panel = await processingPanel(page);
  expect(panel.sliders).toHaveLength(2);
  expect(panel.visibleText.map((item) => item.text).join(" ")).toContain("パン");
});

test("minus, slider focus, and keyboard change one plan while the panel stays open", async ({
  page,
}) => {
  await ready(page);
  await buildAll(page);
  await openDirect(page, "open-mill-plan", "製粉機");

  let panel = await processingPanel(page);
  expect(panel.sliders.map((slider) => slider.value).sort((a, b) => a - b)).toEqual([6, 6]);

  const firstSlider = panel.sliders[0];
  const minus = panel.buttons
    .filter((button) => button.label === "−" && button.enabled)
    .sort(
      (a, b) =>
        Math.abs(a.y + a.height / 2 - (firstSlider.y + firstSlider.height / 2)) -
        Math.abs(b.y + b.height / 2 - (firstSlider.y + firstSlider.height / 2)),
    )[0];
  if (!minus) throw new Error("Enabled minus button was not found beside the first slider");
  await page.mouse.click(center(minus).x, center(minus).y);

  await expect
    .poll(async () =>
      (await processingPanel(page)).sliders
        .map((slider) => slider.value)
        .sort((a, b) => a - b),
    )
    .toEqual([5, 6]);

  panel = await processingPanel(page);
  const sliderAtFive = panel.sliders.find((slider) => slider.value === 5);
  if (!sliderAtFive) throw new Error("Updated five-cycle slider was not found");
  await page.mouse.click(center(sliderAtFive).x, center(sliderAtFive).y);
  await page.keyboard.press("Home");

  await expect
    .poll(async () =>
      (await processingPanel(page)).sliders
        .map((slider) => slider.value)
        .sort((a, b) => a - b),
    )
    .toEqual([0, 6]);

  panel = await processingPanel(page);
  const sliderAtZero = panel.sliders.find((slider) => slider.value === 0);
  if (!sliderAtZero) throw new Error("Zero-cycle slider was not found");
  await page.mouse.click(sliderAtZero.x + 1, center(sliderAtZero).y);
  await page.keyboard.press("ArrowRight");

  await expect
    .poll(async () =>
      (await processingPanel(page)).sliders
        .map((slider) => slider.value)
        .sort((a, b) => a - b),
    )
    .toEqual([1, 6]);
  expect((await processingPanel(page)).pageName).toBe("製粉機");
});
