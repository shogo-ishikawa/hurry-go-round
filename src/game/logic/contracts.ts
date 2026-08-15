import { emptyResourceAmounts, RESOURCE_IDS, type ResourceAmounts, type ResourceId } from "../config/resourceDefinitions";
import type { ContractState, ContractType, DeliveryContract } from "../contracts/contractTypes";

export interface ContractGenerationInput { seed: number; nextSequence: number; count: number; unlockedResources: readonly ResourceId[]; reputationLevel: number }
const RESOURCE_KEYS = RESOURCE_IDS;
export const CONTRACT_OFFER_COUNT = 3;
const prices: ResourceAmounts = { wheat: 2, corn: 3, egg: 5 };
const typeMultipliers: Record<ContractType, number> = { single: 1.35, mixed: 1.5, priority: 1.45 };
const bonusRates: Record<ContractType, number> = { single: .15, mixed: .2, priority: .3 };
const reputationMultipliers = [1, 1.05, 1.1, 1.15] as const;
const ranges: Record<ResourceId, Record<"single" | "mixed" | "priority", readonly [number, number]>> = {
  wheat: { single: [18, 42], mixed: [10, 28], priority: [10, 22] },
  corn: { single: [14, 34], mixed: [8, 24], priority: [8, 18] },
  egg: { single: [6, 18], mixed: [4, 12], priority: [4, 10] },
};

function random(seed: number): [number, number] {
  let x = seed >>> 0 || 0x9e3779b9;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return [x >>> 0, (x >>> 0) / 4294967296];
}
function choose<T>(seed: number, values: readonly T[]): [number, T] { const [next, n] = random(seed); return [next, values[Math.floor(n * values.length)]!]; }
function amount(seed: number, range: readonly [number, number], level: number): [number, number] {
  const [next, n] = random(seed); const extra = Math.min(3, Math.max(0, level)) * .05;
  return [next, Math.max(1, Math.round((range[0] + Math.floor(n * (range[1] - range[0] + 1))) * (1 + extra)))];
}
export function calculateReputationLevel(points: number): number { return points >= 30 ? 3 : points >= 15 ? 2 : points >= 5 ? 1 : 0; }
export function calculateContractReward(requirements: ResourceAmounts, type: ContractType, level: number, elapsed = 0, target: number | null = null): { base: number; bonus: number; total: number } {
  const raw = RESOURCE_KEYS.reduce((sum, key) => sum + requirements[key] * prices[key], 0);
  const base = Math.round(raw * typeMultipliers[type] * reputationMultipliers[Math.min(3, Math.max(0, level))]!);
  const bonus = target !== null && elapsed <= target ? Math.floor(base * bonusRates[type]) : 0;
  return { base, bonus, total: base + bonus };
}
export function generateContractOffers(input: ContractGenerationInput): { offers: DeliveryContract[]; seed: number; nextSequence: number } {
  if (!input.unlockedResources.length) throw new Error("At least one resource must be unlocked");
  let seed = input.seed >>> 0, sequence = input.nextSequence; const offers: DeliveryContract[] = [];
  while (offers.length < input.count) {
    let roll; [seed, roll] = random(seed);
    const mixedAllowed = input.unlockedResources.length > 1;
    const type: ContractType = roll < .2 + input.reputationLevel * .03 ? "priority" : roll < .55 + input.reputationLevel * .04 && mixedAllowed ? "mixed" : "single";
    let selected: ResourceId[];
    if (type === "mixed") {
      const max = Math.min(3, input.unlockedResources.length); let countRoll; [seed, countRoll] = random(seed);
      const count = 2 + Math.floor(countRoll * (max - 1)); selected = [...input.unlockedResources];
      for (let i = selected.length - 1; i > 0; i--) { let n; [seed, n] = random(seed); const j = Math.floor(n * (i + 1)); [selected[i], selected[j]] = [selected[j]!, selected[i]!]; }
      selected = selected.slice(0, count);
    } else { let key; [seed, key] = choose(seed, input.unlockedResources); selected = [key]; }
    const requirements = emptyResourceAmounts();
    for (const key of selected) [seed, requirements[key]] = amount(seed, ranges[key][type === "mixed" ? "mixed" : type], input.reputationLevel);
    const targetRange = type === "priority" ? [90, 180] : type === "mixed" ? [240, 420] : [180, 300]; let target; [seed, target] = amount(seed, targetRange as [number, number], 0);
    const reward = calculateContractReward(requirements, type, input.reputationLevel);
    const large = RESOURCE_KEYS.reduce((sum, key) => sum + requirements[key] * prices[key], 0) >= 100;
    offers.push({ id: `contract-${String(sequence).padStart(6, "0")}`, sequence, type, titleKey: type === "priority" ? `priority.${selected[0]}` : type === "mixed" ? "mixed" : `single.${selected[0]}`, requirements, delivered: emptyResourceAmounts(), baseRewardCoins: reward.base, reputationReward: (type === "single" ? 1 : 2) + Number(large), targetBonusMs: target * 1000, bonusMultiplier: bonusRates[type], elapsedActiveMs: 0, status: "offered" });
    sequence++;
  }
  return { offers, seed, nextSequence: sequence };
}
export function createContractState(seed = 0x48575247): ContractState {
  const generated = generateContractOffers({ seed, nextSequence: 1, count: 3, unlockedResources: ["wheat"], reputationLevel: 0 });
  return { offers: generated.offers, active: null, generatorSeed: generated.seed, nextSequence: generated.nextSequence, reputation: { points: 0, level: 0 }, statistics: { contractsCompleted: 0, contractsCancelled: 0, offersDeclined: 0, contractCoinsEarned: 0, speedBonusesEarned: 0, bestCompletionMs: null }, deliveryCursor: null, declineCooldownMs: 0 };
}
function replacement(state: ContractState, unlockedResources: ResourceId[]): Pick<ContractState, "offers" | "generatorSeed" | "nextSequence"> {
  const generated = generateContractOffers({ seed: state.generatorSeed, nextSequence: state.nextSequence, count: 1, unlockedResources, reputationLevel: state.reputation.level });
  return { offers: [...state.offers, generated.offers[0]!], generatorSeed: generated.seed, nextSequence: generated.nextSequence };
}
export function acceptContract(state: ContractState, id: string, unlocked: ResourceId[]): { ok: true; state: ContractState } | { ok: false; reason: string } {
  if (state.active) return { ok: false, reason: "進行中の契約を完了または中止してください" };
  const offer = state.offers.find(item => item.id === id && item.status === "offered"); if (!offer) return { ok: false, reason: "契約候補が見つかりません" };
  const base = { ...state, offers: state.offers.filter(item => item.id !== id), active: { ...offer, delivered: emptyResourceAmounts(), elapsedActiveMs: 0, status: "active" as const }, deliveryCursor: null };
  return { ok: true, state: { ...base, ...replacement(base, unlocked) } };
}
export function declineContractOffer(state: ContractState, id: string, unlocked: ResourceId[]): { ok: true; state: ContractState } | { ok: false; reason: string } {
  if (state.declineCooldownMs > 0) return { ok: false, reason: "新しい候補を準備しています" }; if (!state.offers.some(o => o.id === id)) return { ok: false, reason: "契約候補が見つかりません" };
  const base = { ...state, offers: state.offers.filter(o => o.id !== id), statistics: { ...state.statistics, offersDeclined: state.statistics.offersDeclined + 1 }, declineCooldownMs: 30000 };
  return { ok: true, state: { ...base, ...replacement(base, unlocked) } };
}
export function deliverNextContractResourceOne(state: ContractState, barn: ResourceAmounts): { state: ContractState; barn: ResourceAmounts; resource: ResourceId | null; changed: boolean } {
  if (!state.active) return { state, barn, resource: null, changed: false }; const start = state.deliveryCursor ? (RESOURCE_KEYS.indexOf(state.deliveryCursor) + 1) % 3 : 0;
  for (let i = 0; i < 3; i++) { const key = RESOURCE_KEYS[(start + i) % 3]!; if (state.active.delivered[key] < state.active.requirements[key] && barn[key] > 0) { const active = { ...state.active, delivered: { ...state.active.delivered, [key]: state.active.delivered[key] + 1 } }; return { state: { ...state, active, deliveryCursor: key }, barn: { ...barn, [key]: barn[key] - 1 }, resource: key, changed: true }; } }
  return { state, barn, resource: null, changed: false };
}
export function isContractComplete(contract: DeliveryContract): boolean { return RESOURCE_KEYS.every(k => contract.delivered[k] >= contract.requirements[k]); }
export function advanceContractActiveTime(state: ContractState, delta: number, paused: boolean): ContractState { return !state.active || paused ? state : { ...state, declineCooldownMs: Math.max(0, state.declineCooldownMs - delta), active: { ...state.active, elapsedActiveMs: state.active.elapsedActiveMs + Math.max(0, delta) } }; }
export function cancelActiveContract(state: ContractState, barn: ResourceAmounts): { ok: true; state: ContractState; barn: ResourceAmounts } | { ok: false; reason: string } { if (!state.active) return { ok: false, reason: "進行中の契約がありません" }; const returned = { ...barn }; for (const key of RESOURCE_KEYS) returned[key] += state.active.delivered[key]; return { ok: true, state: { ...state, active: null, deliveryCursor: null, statistics: { ...state.statistics, contractsCancelled: state.statistics.contractsCancelled + 1 } }, barn: returned }; }
export function completeContract(state: ContractState, wallet: number): { ok: true; state: ContractState; wallet: number; reward: { base: number; bonus: number; total: number; reputation: number } } | { ok: false; reason: string } {
  const active = state.active; if (!active || !isContractComplete(active)) return { ok: false, reason: "契約はまだ完了していません" };
  const reward = calculateContractReward(active.requirements, active.type, state.reputation.level, active.elapsedActiveMs, active.targetBonusMs); const points = state.reputation.points + active.reputationReward;
  return { ok: true, wallet: wallet + reward.total, reward: { ...reward, reputation: active.reputationReward }, state: { ...state, active: null, deliveryCursor: null, reputation: { points, level: calculateReputationLevel(points) }, statistics: { ...state.statistics, contractsCompleted: state.statistics.contractsCompleted + 1, contractCoinsEarned: state.statistics.contractCoinsEarned + reward.total, speedBonusesEarned: state.statistics.speedBonusesEarned + Number(reward.bonus > 0), bestCompletionMs: state.statistics.bestCompletionMs === null ? active.elapsedActiveMs : Math.min(state.statistics.bestCompletionMs, active.elapsedActiveMs) } } };
}
