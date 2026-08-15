export const RESOURCE_IDS = ["wheat", "corn", "egg"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export interface ResourceAmounts {
  wheat: number;
  corn: number;
  egg: number;
}

export const emptyResourceAmounts = (): ResourceAmounts => ({
  wheat: 0,
  corn: 0,
  egg: 0,
});

export const RESOURCE_UNIT_PRICES: Readonly<ResourceAmounts> = {
  wheat: 2,
  corn: 3,
  egg: 5,
};

export const RESOURCE_MARKET_CAPACITIES: Readonly<ResourceAmounts> = {
  wheat: 8,
  corn: 8,
  egg: 8,
};
