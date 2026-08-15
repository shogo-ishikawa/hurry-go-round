export const RESOURCE_IDS = ["wheat", "corn", "egg", "flour", "cornmeal", "bread", "cornbread", "hay", "milk", "butter", "cheese"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export type ResourceAmounts = Record<ResourceId, number>;

export const emptyResourceAmounts = (): ResourceAmounts => ({
  wheat: 0,
  corn: 0,
  egg: 0,
  flour: 0, cornmeal: 0, bread: 0, cornbread: 0, hay: 0, milk: 0, butter: 0, cheese: 0,
});

export const RESOURCE_UNIT_PRICES: Readonly<ResourceAmounts> = {
  wheat: 2,
  corn: 3,
  egg: 5,
  flour: 6, cornmeal: 8, bread: 16, cornbread: 26, hay: 0, milk: 8, butter: 20, cheese: 32,
};

export const RESOURCE_MARKET_CAPACITIES: Readonly<ResourceAmounts> = {
  wheat: 8,
  corn: 8,
  egg: 8,
  flour: 6, cornmeal: 6, bread: 6, cornbread: 4, hay: 0, milk: 8, butter: 6, cheese: 4,
};

export type ResourceSourceKind = "farm" | "livestock" | "processing" | "trade";
export interface ResourceDefinition { id:ResourceId; publicName:string; unitPrice:number; marketCapacity:number; sourceKind:ResourceSourceKind; customerDemand:boolean; contractEligible:boolean; feedFor?:"chicken"|"cow"; color:number; iconId:string }
const names:Record<ResourceId,string>={wheat:"麦",corn:"とうもろこし",egg:"たまご",flour:"小麦粉",cornmeal:"コーンミール",bread:"パン",cornbread:"コーンブレッド",hay:"干し草",milk:"牛乳",butter:"バター",cheese:"チーズ"};
export const RESOURCE_DEFINITIONS:Readonly<Record<ResourceId,ResourceDefinition>>=Object.fromEntries(RESOURCE_IDS.map(id=>[id,{id,publicName:names[id],unitPrice:RESOURCE_UNIT_PRICES[id],marketCapacity:RESOURCE_MARKET_CAPACITIES[id],sourceKind:id==="hay"?"farm":id==="milk"?"livestock":["butter","cheese","flour","cornmeal","bread","cornbread"].includes(id)?"processing":"farm",customerDemand:id!=="hay",contractEligible:id!=="hay",feedFor:id==="corn"?"chicken":id==="hay"?"cow":undefined,color:0xf2d27a,iconId:id}])) as Record<ResourceId,ResourceDefinition>;
