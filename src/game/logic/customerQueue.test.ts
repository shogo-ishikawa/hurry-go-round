import { describe, expect, it } from "vitest";
import {
  canFrontBuy,
  canSpawn,
  enqueueCustomer,
  removeFront,
  type QueueCustomer,
} from "./customerQueue";
const customer = (id: number): QueueCustomer => ({
  id,
  phase: "entering",
  purchased: false,
});
describe("FIFO customer queue", () => {
  it("preserves order and assigns one front buyer", () => {
    let q = enqueueCustomer([], customer(1), 4);
    q = enqueueCustomer(q, customer(2), 4);
    expect(q.map((x) => x.id)).toEqual([1, 2]);
    expect(q.filter((x) => x.phase === "buying")).toHaveLength(1);
  });
  it("respects queue and active limits", () => {
    let q: QueueCustomer[] = [];
    for (let i = 0; i < 5; i++) q = enqueueCustomer(q, customer(i), 4);
    expect(q).toHaveLength(4);
    expect(canSpawn(6, 6)).toBe(false);
    expect(canSpawn(5, 6)).toBe(true);
  });
  it("advances FIFO after front leaves", () => {
    const q = [
      { ...customer(1), phase: "buying" as const },
      { ...customer(2), phase: "queueing" as const },
    ];
    const next = removeFront(q);
    expect(next[0]).toMatchObject({ id: 2, phase: "buying" });
  });
  it("waits without stock and resumes with stock", () => {
    const q = enqueueCustomer([], customer(1), 4);
    expect(canFrontBuy(q, 0)).toBe(false);
    expect(canFrontBuy(q, 1)).toBe(true);
  });
  it("does not process a purchased customer twice", () => {
    const q = [{ ...customer(1), phase: "buying" as const, purchased: true }];
    expect(canFrontBuy(q, 2)).toBe(false);
  });
});
