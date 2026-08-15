export type WorkerKind = "harvest" | "transport";
export interface HiringState {
  walletCoins: number;
  harvestHired: boolean;
  transportHired: boolean;
}
export interface HiringResult {
  state: HiringState;
  hired: boolean;
  reason: "hired" | "insufficient" | "locked" | "already-hired";
}
export function getWorkerHireCost(kind: WorkerKind): number {
  return kind === "harvest" ? 40 : 75;
}
export function canHireWorker(s: HiringState, kind: WorkerKind): boolean {
  return kind === "harvest"
    ? !s.harvestHired && s.walletCoins >= 40
    : s.harvestHired && !s.transportHired && s.walletCoins >= 75;
}
export function hireWorker(s: HiringState, kind: WorkerKind): HiringResult {
  if (kind === "transport" && !s.harvestHired)
    return { state: s, hired: false, reason: "locked" };
  if (kind === "harvest" ? s.harvestHired : s.transportHired)
    return { state: s, hired: false, reason: "already-hired" };
  const cost = getWorkerHireCost(kind);
  if (s.walletCoins < cost)
    return { state: s, hired: false, reason: "insufficient" };
  return {
    hired: true,
    reason: "hired",
    state: {
      walletCoins: s.walletCoins - cost,
      harvestHired: kind === "harvest" ? true : s.harvestHired,
      transportHired: kind === "transport" ? true : s.transportHired,
    },
  };
}
