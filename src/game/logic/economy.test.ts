import { describe, expect, it } from "vitest";
import { collectAllTillCoins } from "./economy";
const economy = { walletCoins:5,tillCoins:3,wheatUnitPrice:2,soldUnits:4,customersServed:4 };
describe("collect-all till transaction",()=>{
  it.each([1,184,10000])("collects %i coins in one immutable transition",tillCoins=>{const before={...economy,tillCoins};const result=collectAllTillCoins(before);expect(result).toMatchObject({changed:true,collected:tillCoins,economy:{walletCoins:5+tillCoins,tillCoins:0}});expect(result.economy.walletCoins+result.economy.tillCoins).toBe(before.walletCoins+before.tillCoins);expect(before.tillCoins).toBe(tillCoins);});
  it("is an identity no-op at zero",()=>{const empty={...economy,tillCoins:0};expect(collectAllTillCoins(empty)).toMatchObject({changed:false,collected:0,economy:empty});expect(collectAllTillCoins(empty).economy).toBe(empty);});
});
