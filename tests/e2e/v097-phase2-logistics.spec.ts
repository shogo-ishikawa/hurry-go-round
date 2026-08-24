import { expect, test, type Page } from "@playwright/test";

async function start(page:Page){await page.goto("");await page.getByRole("button",{name:/はじめる|つづきから/}).click();await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.isGameReady())).toBe(true);}

test("actual contract dock performs one cargo-first mixed batch and rewards exactly once",async({page})=>{
  await start(page);
  await page.evaluate(()=>window.__HGR_E2E__!.configureContractBatch({egg:5,flour:3,bread:3,milk:2,butter:2,cheese:2},{egg:2,flour:1,bread:1,milk:1,butter:1,cheese:1},{egg:7,flour:2,bread:2,milk:1,butter:1,cheese:1}));
  const before=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());
  await page.evaluate(()=>window.__HGR_E2E__!.positionAtContractDock());
  const done=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());
  expect(done.contracts.active).toBeNull();expect(done.contracts.statistics.contractsCompleted).toBe(1);expect(done.wallet).toBeGreaterThan(before.wallet);
  expect(done.cargo).toMatchObject({egg:0,flour:0,bread:0,milk:0,butter:0,cheese:0});expect(done.barn).toMatchObject({egg:4,flour:0,bread:0,milk:0,butter:0,cheese:0});
  await page.waitForTimeout(300);const still=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(still.wallet).toBe(done.wallet);expect(still.contracts.statistics.contractsCompleted).toBe(1);
});

test("actual dock batches partial stock, waits for re-entry, then completes",async({page})=>{
  await start(page);await page.evaluate(()=>window.__HGR_E2E__!.configureContractBatch({egg:4,bread:3,cheese:2},{egg:1,bread:1},{egg:1,bread:1}));
  await page.evaluate(()=>window.__HGR_E2E__!.positionAtContractDock());let partial=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(partial.contracts.active?.delivered).toMatchObject({egg:2,bread:2,cheese:0});
  await page.evaluate(()=>window.__HGR_E2E__!.configureInventory({cargo:{egg:2,bread:1,cheese:2}}));await page.waitForTimeout(150);let armed=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(armed.contracts.active?.delivered).toMatchObject({egg:2,bread:2,cheese:0});
  await page.evaluate(()=>{window.__HGR_E2E__!.positionOutsideContractDock();window.__HGR_E2E__!.positionAtContractDock();});partial=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(partial.contracts.active).toBeNull();expect(partial.contracts.statistics.contractsCompleted).toBe(1);
});

test("actual cash zone collects the whole till once and persists",async({page})=>{
  await start(page);await page.evaluate(()=>window.__HGR_E2E__!.configureInventory({walletCoins:17,tillCoins:184}));await page.evaluate(()=>window.__HGR_E2E__!.positionAtCash());
  let result=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(result).toMatchObject({wallet:201,till:0});await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__HGR_E2E__!.getLogistics())).toMatchObject({wallet:201,till:0});
  await page.evaluate(()=>window.__HGR_E2E__!.requestSave());await page.reload();await page.getByRole("button",{name:"つづきから"}).click();await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.isGameReady())).toBe(true);result=await page.evaluate(()=>window.__HGR_E2E__!.getLogistics());expect(result).toMatchObject({wallet:201,till:0});
});
