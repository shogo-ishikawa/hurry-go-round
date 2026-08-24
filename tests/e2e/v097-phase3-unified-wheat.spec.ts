import { expect, test, type Page } from "@playwright/test";

async function start(page:Page){await page.goto("");await page.getByRole("button",{name:/はじめる/}).click();await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.isGameReady())).toBe(true);}

test("one authoritative field expands 30 to 42 to 54 through the actual pad",async({page})=>{
  await start(page);await page.evaluate(()=>window.__HGR_E2E__!.configureWheatExpansion(740));
  let field=await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary());
  expect(field).toMatchObject({level:0,nodeCount:30,oldWestNodeCount:0,fieldEntryCount:1,fieldBounds:{x:650,y:890,width:760,height:390}});
  expect(field.nodeIds.every(id=>id.startsWith("wheat-main-"))).toBe(true);
  await page.evaluate(()=>window.__HGR_E2E__!.positionAtWheatExpansion());
  field=await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary());expect(field).toMatchObject({level:1,nodeCount:42,crateCapacity:24});
  expect((await page.evaluate(()=>window.__HGR_E2E__!.getStateSummary())).coins).toBe(520);
  await page.evaluate(()=>window.__HGR_E2E__!.positionAtWheatExpansion());
  expect((await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary())).level).toBe(1);
  await page.evaluate(()=>{window.__HGR_E2E__!.positionOutsideWheatExpansion();window.__HGR_E2E__!.positionAtWheatExpansion();});
  field=await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary());expect(field).toMatchObject({level:2,nodeCount:54,crateCapacity:32});
  expect((await page.evaluate(()=>window.__HGR_E2E__!.getStateSummary())).coins).toBe(0);
  await page.evaluate(()=>{window.__HGR_E2E__!.positionOutsideWheatExpansion();window.__HGR_E2E__!.positionAtWheatExpansion();});
  expect((await page.evaluate(()=>window.__HGR_E2E__!.getStateSummary())).coins).toBe(0);
});

for(const viewport of [{width:1920,height:1080},{width:844,height:390},{width:390,height:844},{width:320,height:568}])test(`unified wheat topology loads at ${viewport.width}x${viewport.height}`,async({page})=>{await page.setViewportSize(viewport);await start(page);const field=await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary());expect(field.nodeCount).toBe(30);expect(field.fieldEntryCount).toBe(1);});

test("a real schema-8 browser save migrates to schema 9 and reloads idempotently",async({page})=>{
  await start(page);await page.evaluate(()=>{window.__HGR_E2E__!.configureWheat(2,3);return window.__HGR_E2E__!.requestSave();});
  await page.evaluate(async()=>{
    const canonical=(value:unknown):string=>{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;};
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open("hurry-go-round",1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const envelope=await new Promise<Record<string,unknown>>((resolve,reject)=>{const tx=db.transaction("saves"),request=tx.objectStore("saves").get("primary");request.onsuccess=()=>resolve(request.result as Record<string,unknown>);request.onerror=()=>reject(request.error);});
    const payload=envelope.payload as {crops:Array<{id:string;state:string;remainingMs:number}>};
    for(const [index,crop] of payload.crops.entries()){const match=/^wheat-main-(base|exp1|exp2)-(\d{2})$/.exec(crop.id)!;const split=match[1]==="base"?15:6,n=Number(match[2]);crop.id=`wheat-${n<split?"west":"central"}-${match[1]}-${String(n%split).padStart(2,"0")}`;if(index===0){crop.state="growing";crop.remainingMs=1234;}}
    envelope.schemaVersion=8;envelope.gameVersion="0.9.6";envelope.checksum=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(payload))))].map(byte=>byte.toString(16).padStart(2,"0")).join("");
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction("saves","readwrite");tx.objectStore("saves").put(envelope,"primary");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  });
  await page.reload();await page.getByRole("button",{name:"つづきから"}).click();await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.isGameReady())).toBe(true);
  expect(await page.evaluate(()=>window.__HGR_E2E__!.getWheatSummary())).toMatchObject({level:2,nodeCount:54,workerLevel:3});
  await page.evaluate(()=>window.__HGR_E2E__!.requestSave());await page.reload();await page.getByRole("button",{name:"つづきから"}).click();await expect.poll(()=>page.evaluate(()=>window.__HGR_E2E__?.getWheatSummary().nodeCount)).toBe(54);
});
