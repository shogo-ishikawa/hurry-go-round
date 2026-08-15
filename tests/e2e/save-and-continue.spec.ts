import { expect,test,type Page } from "@playwright/test";

const getSaveBackend = (page: Page): Promise<string | null> =>
  page.evaluate(() => window.__HGR_E2E__?.getSaveBackend() ?? null);

const requestSave = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    if (!window.__HGR_E2E__) {
      throw new Error("Hurry-Go-Round E2E API is unavailable");
    }
    await window.__HGR_E2E__.requestSave();
  });

const getStateSummary = (page: Page) =>
  page.evaluate(() => {
    if (!window.__HGR_E2E__) {
      throw new Error("Hurry-Go-Round E2E API is unavailable");
    }
    return window.__HGR_E2E__.getStateSummary();
  });

const getLastSaveError = (page: Page): Promise<string | null> =>
  page.evaluate(() => window.__HGR_E2E__?.getLastSaveError() ?? null);

const corruptPrimary = (page: Page): Promise<void> =>
  page.evaluate(async () => {
    if (!window.__HGR_E2E__) {
      throw new Error("Hurry-Go-Round E2E API is unavailable");
    }
    await window.__HGR_E2E__.corruptPrimary();
  });

test("saves, reloads, continues, and rotates a backup",async({page})=>{
  await page.goto("");await page.getByRole("button",{name:"はじめる"}).click();await expect.poll(()=>getSaveBackend(page)).toBe("IndexedDB");
  await requestSave(page);const first=await getStateSummary(page);expect(first.saveSequence).toBe(1);expect(await getLastSaveError(page)).toBeNull();
  await page.reload();await expect(page.getByRole("button",{name:"つづきから"})).toBeVisible();await page.getByRole("button",{name:"つづきから"}).click();expect((await getStateSummary(page)).saveSequence).toBe(1);
  await requestSave(page);expect((await getStateSummary(page)).saveSequence).toBe(2);
  const stores=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("hurry-go-round",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<[boolean,boolean]>((resolve,reject)=>{const tx=db.transaction("saves"),store=tx.objectStore("saves"),a=store.get("primary"),b=store.get("backup");tx.oncomplete=()=>resolve([Boolean(a.result),Boolean(b.result)]);tx.onerror=()=>reject(tx.error);});});expect(stores).toEqual([true,true]);
});
test("recovers a corrupt primary from backup",async({page})=>{await page.goto("");await page.getByRole("button",{name:"はじめる"}).click();await requestSave(page);await requestSave(page);await corruptPrimary(page);await page.reload();await expect(page.getByText(/バックアップから復元しました/)).toBeVisible();await expect(page.getByRole("button",{name:"つづきから"})).toBeVisible();});
test("falls back when IndexedDB is unavailable",async({context,page})=>{await context.addInitScript(()=>{Object.defineProperty(window,"indexedDB",{value:{open(){throw new Error("disabled by E2E");}}});});await page.goto("");await expect.poll(()=>getSaveBackend(page)).toBe("簡易保存");await page.getByRole("button",{name:"はじめる"}).click();await requestSave(page);await page.reload();await expect(page.getByRole("button",{name:"つづきから"})).toBeVisible();});
