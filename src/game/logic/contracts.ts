import { emptyResourceAmounts, RESOURCE_DEFINITIONS, RESOURCE_IDS, type ResourceAmounts, type ResourceId } from "../config/resourceDefinitions";
import type { CarriedCargo } from "./resources";
import type { ContractCommandResult, ContractState, ContractType, DeliveryContract } from "../contracts/contractTypes";

export interface ContractGenerationInput { seed: number; nextSequence: number; count: number; unlockedResources: readonly ResourceId[]; reputationLevel: number }
const RESOURCE_KEYS = RESOURCE_IDS;
export const CONTRACT_OFFER_COUNT = 3;
const result=(command:ContractCommandResult["command"],changed:boolean,message:string,reason?:ContractCommandResult["reason"]):ContractCommandResult=>({command,changed,message,reason,prioritySaveRequested:changed});
export const formatContractIdentity=(contract:Pick<DeliveryContract,"sequence">)=>`依頼 #${String(contract.sequence).padStart(6,"0")}`;
const prices: ResourceAmounts = { wheat:2,corn:3,egg:5,flour:6,cornmeal:8,bread:16,cornbread:26,hay:0,milk:8,butter:20,cheese:32 };
const typeMultipliers: Record<ContractType, number> = { single: 1.35, mixed: 1.5, priority: 1.45 };
const bonusRates: Record<ContractType, number> = { single: .15, mixed: .2, priority: .3 };
const reputationMultipliers = [1, 1.05, 1.1, 1.15] as const;
const ranges: Record<ResourceId, Record<"single" | "mixed" | "priority", readonly [number, number]>> = {
  wheat: { single: [18, 42], mixed: [10, 28], priority: [10, 22] },
  corn: { single: [14, 34], mixed: [8, 24], priority: [8, 18] },
  egg: { single: [6, 18], mixed: [4, 12], priority: [4, 10] },
  flour:{single:[5,14],mixed:[3,9],priority:[3,8]}, cornmeal:{single:[5,12],mixed:[3,8],priority:[3,7]},
  bread:{single:[3,10],mixed:[2,7],priority:[2,6]}, cornbread:{single:[2,8],mixed:[2,5],priority:[2,4]},
  hay:{single:[1,1],mixed:[1,1],priority:[1,1]}, milk:{single:[4,8],mixed:[2,5],priority:[8,12]}, butter:{single:[2,5],mixed:[1,3],priority:[5,8]}, cheese:{single:[2,4],mixed:[1,3],priority:[4,7]},
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
  const eligible=input.unlockedResources.filter(resource=>RESOURCE_DEFINITIONS[resource].contractEligible);
  if (!eligible.length) throw new Error("At least one contract-eligible resource must be unlocked");
  let seed = input.seed >>> 0, sequence = input.nextSequence; const offers: DeliveryContract[] = [];
  while (offers.length < input.count) {
    let roll; [seed, roll] = random(seed);
    const mixedAllowed = eligible.length > 1;
    const type: ContractType = roll < .2 + input.reputationLevel * .03 ? "priority" : roll < .55 + input.reputationLevel * .04 && mixedAllowed ? "mixed" : "single";
    let selected: ResourceId[];
    if (type === "mixed") {
      const max = Math.min(3, eligible.length); let countRoll; [seed, countRoll] = random(seed);
      const count = 2 + Math.floor(countRoll * (max - 1)); selected = [...eligible];
      for (let i = selected.length - 1; i > 0; i--) { let n; [seed, n] = random(seed); const j = Math.floor(n * (i + 1)); [selected[i], selected[j]] = [selected[j]!, selected[i]!]; }
      selected = selected.slice(0, count);
    } else { let key; [seed, key] = choose(seed, eligible); selected = [key]; }
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
export function acceptContract(state: ContractState, id: string, unlocked: ResourceId[]) {
  if (state.active) return { ok:false, state, ...result("accept",false,"進行中の契約を完了または中止してください","active-contract-exists") };
  const offer = state.offers.find(item => item.id === id && item.status === "offered"); if (!offer) return { ok:false, state, ...result("accept",false,"契約候補が見つかりません","offer-not-found") };
  const base = { ...state, offers: state.offers.filter(item => item.id !== id), active: { ...offer, delivered: emptyResourceAmounts(), elapsedActiveMs: 0, status: "active" as const }, deliveryCursor: null };
  return { ok:true, state: { ...base, ...replacement(base, unlocked) }, ...result("accept",true,`${formatContractIdentity(offer)} を受注しました`) };
}
export function declineContractOffer(state: ContractState, id: string, unlocked: ResourceId[]) {
  const declined=state.offers.find(o=>o.id===id&&o.status==="offered");if(!declined)return {ok:false,state,...result("decline",false,"契約候補が見つかりません","offer-not-found")};
  const base = { ...state, offers: state.offers.filter(o => o.id !== id), statistics: { ...state.statistics, offersDeclined: state.statistics.offersDeclined + 1 }, declineCooldownMs: 0 };
  const next={...base,...replacement(base,unlocked)};return {ok:true,state:next,...result("decline",true,`${formatContractIdentity(declined)} を見送り、新しい依頼を追加しました`)};
}
export function deliverNextContractResourceOne(state: ContractState, cargo:CarriedCargo, barn: ResourceAmounts) {
  if (!state.active) return { state,cargo,barn,resource:null,source:null as null,...result("deliver",false,"進行中の契約がありません","no-active-contract") }; const start = state.deliveryCursor ? (RESOURCE_KEYS.indexOf(state.deliveryCursor) + 1) % RESOURCE_KEYS.length : 0;
  for(let i=0;i<RESOURCE_KEYS.length;i++){const key=RESOURCE_KEYS[(start+i)%RESOURCE_KEYS.length]!;if(state.active.delivered[key]>=state.active.requirements[key])continue;const source=cargo.amounts[key]>0?"cargo":barn[key]>0?"barn":null;if(!source)continue;const active={...state.active,delivered:{...state.active.delivered,[key]:state.active.delivered[key]+1}};const name=RESOURCE_DEFINITIONS[key].publicName;return{state:{...state,active,deliveryCursor:key},cargo:source==="cargo"?{...cargo,amounts:{...cargo.amounts,[key]:cargo.amounts[key]-1}}:cargo,barn:source==="barn"?{...barn,[key]:barn[key]-1}:barn,resource:key,source,...result("deliver",true,`${name}を${source==="cargo"?"持ち物":"倉庫"}から1個出荷しました`)}};
  const missing=RESOURCE_KEYS.filter(key=>state.active!.requirements[key]>state.active!.delivered[key]).map(key=>`${RESOURCE_DEFINITIONS[key].publicName} ${state.active!.requirements[key]-state.active!.delivered[key]}`).join("、");return{state,cargo,barn,resource:null,source:null as null,...result("deliver",false,`出荷できる商品がありません\n不足：${missing}`,"no-deliverable-stock")};
}
export interface ContractBatchDeliveryBreakdown { resource:ResourceId; fromCargo:number; fromBarn:number; deliveredThisBatch:number; deliveredTotal:number; requirement:number; remaining:number }
export interface ContractBatchDeliveryResult { changed:boolean; state:ContractState; cargo:CarriedCargo; barn:ResourceAmounts; breakdown:ContractBatchDeliveryBreakdown[]; totalDelivered:number; complete:boolean; message:string; reason?:"no-active-contract"|"no-deliverable-stock"|"already-complete" }
export function deliverContractBatch(state:ContractState,cargo:CarriedCargo,barn:ResourceAmounts):ContractBatchDeliveryResult {
  const active=state.active;
  if(!active)return{changed:false,state,cargo,barn,breakdown:[],totalDelivered:0,complete:false,message:"進行中の契約はありません",reason:"no-active-contract"};
  if(isContractComplete(active))return{changed:false,state,cargo,barn,breakdown:[],totalDelivered:0,complete:true,message:"契約はすでに納品済みです",reason:"already-complete"};
  const nextCargo={...cargo,amounts:{...cargo.amounts}},nextBarn={...barn},delivered={...active.delivered};
  const breakdown:ContractBatchDeliveryBreakdown[]=[];
  for(const resource of RESOURCE_KEYS){
    const requirement=active.requirements[resource],unmet=Math.max(0,requirement-delivered[resource]);
    if(unmet===0)continue;
    const fromCargo=Math.min(unmet,nextCargo.amounts[resource]);
    const fromBarn=Math.min(unmet-fromCargo,nextBarn[resource]);
    const deliveredThisBatch=fromCargo+fromBarn;
    nextCargo.amounts[resource]-=fromCargo;nextBarn[resource]-=fromBarn;delivered[resource]+=deliveredThisBatch;
    breakdown.push({resource,fromCargo,fromBarn,deliveredThisBatch,deliveredTotal:delivered[resource],requirement,remaining:requirement-delivered[resource]});
  }
  const totalDelivered=breakdown.reduce((sum,item)=>sum+item.deliveredThisBatch,0);
  if(totalDelivered===0){const missing=breakdown.map(item=>`${RESOURCE_DEFINITIONS[item.resource].publicName} ${item.remaining}`).join("、");return{changed:false,state,cargo,barn,breakdown,totalDelivered:0,complete:false,message:`納品できる商品がありません\n在庫台帳で持ち物と倉庫を確認してください\n不足：${missing}`,reason:"no-deliverable-stock"};}
  const nextState={...state,active:{...active,delivered},deliveryCursor:null};
  const complete=isContractComplete(nextState.active);
  const cargoCount=breakdown.reduce((sum,item)=>sum+item.fromCargo,0),barnCount=breakdown.reduce((sum,item)=>sum+item.fromBarn,0);
  const remaining=breakdown.filter(item=>item.remaining>0).map(item=>`${RESOURCE_DEFINITIONS[item.resource].publicName} ${item.remaining}`).join("、");
  return{changed:true,state:nextState,cargo:nextCargo,barn:nextBarn,breakdown,totalDelivered,complete,message:`一括納品しました：合計 ${totalDelivered}個\n持ち物から ${cargoCount}個\n倉庫から ${barnCount}個${remaining?`\n残り：${remaining}`:""}`};
}
export function isContractComplete(contract: DeliveryContract): boolean { return RESOURCE_KEYS.every(k => contract.delivered[k] >= contract.requirements[k]); }
export function advanceContractActiveTime(state: ContractState, delta: number, paused: boolean): ContractState { const normalized={...state,declineCooldownMs:0};return !normalized.active || paused ? normalized : { ...normalized, active: { ...normalized.active, elapsedActiveMs: normalized.active.elapsedActiveMs + Math.max(0, delta) } }; }
export function cancelActiveContract(state: ContractState, barn: ResourceAmounts) { if (!state.active) return { ok:false,state,barn,returned:emptyResourceAmounts(),...result("cancel",false,"進行中の契約がありません","no-active-contract") }; const returned={...barn},quantities=emptyResourceAmounts();for(const key of RESOURCE_KEYS){quantities[key]=state.active.delivered[key];returned[key]+=quantities[key]}const detail=RESOURCE_KEYS.filter(key=>quantities[key]>0).map(key=>`${RESOURCE_DEFINITIONS[key].publicName} ${quantities[key]}個`).join("、")||"なし";return {ok:true,state:{...state,active:null,deliveryCursor:null,statistics:{...state.statistics,contractsCancelled:state.statistics.contractsCancelled+1}},barn:returned,returned:quantities,...result("cancel",true,`契約を中止しました。倉庫へ返却：${detail}`)}; }
export function completeContract(state: ContractState, wallet: number) {
  const active = state.active; if (!active) return {ok:false,state,wallet,...result("complete",false,"進行中の契約がありません","no-active-contract")};if(!isContractComplete(active)) return {ok:false,state,wallet,...result("complete",false,"契約はまだ完了していません","contract-incomplete")};
  const reward = calculateContractReward(active.requirements, active.type, state.reputation.level, active.elapsedActiveMs, active.targetBonusMs); const points = state.reputation.points + active.reputationReward;
  return { ok:true,wallet:wallet+reward.total,reward:{...reward,reputation:active.reputationReward},state:{...state,active:null,deliveryCursor:null,reputation:{points,level:calculateReputationLevel(points)},statistics:{...state.statistics,contractsCompleted:state.statistics.contractsCompleted+1,contractCoinsEarned:state.statistics.contractCoinsEarned+reward.total,speedBonusesEarned:state.statistics.speedBonusesEarned+Number(reward.bonus>0),bestCompletionMs:state.statistics.bestCompletionMs===null?active.elapsedActiveMs:Math.min(state.statistics.bestCompletionMs,active.elapsedActiveMs)}},...result("complete",true,`${formatContractIdentity(active)} を達成しました`)};
}
