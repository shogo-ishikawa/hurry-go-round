import { describe, expect, it } from "vitest";
import {
  canHireWorker,
  getWorkerHireCost,
  hireWorker,
  type HiringState,
} from "./hiring";
const make = (coins = 0): HiringState => ({
  walletCoins: coins,
  harvestHired: false,
  transportHired: false,
});
describe("worker hiring", () => {
  it("returns exact costs", () => {
    expect(getWorkerHireCost("harvest")).toBe(40);
    expect(getWorkerHireCost("transport")).toBe(75);
  });
  it("refuses insufficient harvest funds without deductions", () => {
    const s = make(39);
    expect(hireWorker(s, "harvest")).toEqual({
      state: s,
      hired: false,
      reason: "insufficient",
    });
  });
  it("hires harvest once for exactly 40", () => {
    const r = hireWorker(make(50), "harvest");
    expect(r.state).toEqual({
      walletCoins: 10,
      harvestHired: true,
      transportHired: false,
    });
    expect(r.hired).toBe(true);
    expect(hireWorker(r.state, "harvest").reason).toBe("already-hired");
  });
  it("locks transport until harvest is hired", () => {
    expect(canHireWorker(make(100), "transport")).toBe(false);
    expect(hireWorker(make(100), "transport").reason).toBe("locked");
  });
  it("hires transport once for exactly 75", () => {
    const s = { walletCoins: 90, harvestHired: true, transportHired: false };
    const r = hireWorker(s, "transport");
    expect(r.state.walletCoins).toBe(15);
    expect(r.state.transportHired).toBe(true);
    expect(hireWorker(r.state, "transport").reason).toBe("already-hired");
  });
  it("never creates a negative wallet", () =>
    expect(hireWorker(make(0), "harvest").state.walletCoins).toBe(0));
});
