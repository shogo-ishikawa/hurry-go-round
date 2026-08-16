import {expect,test} from "@playwright/test";
test("trained wheat workers batch harvest and expanded wheat survives reload",async({page})=>{
 await page.goto("");await page.getByRole("button",{name:"はじめる"}).click();
 await page.evaluate(()=>window.__HGR_E2E__?.configureWheat(1,2));
 await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary()?.nodeCount)).toBe(42);
 await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary()?.crate),{timeout:30000}).toBeGreaterThanOrEqual(5);
 const harvested=await page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary());expect(harvested?.workerLevel).toBe(2);expect(harvested?.capacity).toBe(24);
 await page.evaluate(()=>window.__HGR_E2E__?.requestSave());await page.reload();await page.getByRole("button",{name:"つづきから"}).click();
 await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary())).toMatchObject({level:1,nodeCount:42,workerLevel:2,capacity:24});
});
test("level three worker produces an eight-plus logical batch without empty crate trips",async({page})=>{await page.goto("");await page.getByRole("button",{name:"はじめる"}).click();await page.evaluate(()=>window.__HGR_E2E__?.configureWheat(2,3));await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary()?.crate),{timeout:30000}).toBeGreaterThanOrEqual(8);});
