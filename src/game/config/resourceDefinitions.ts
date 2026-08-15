export const RESOURCE_IDS = ["wheat", "corn", "egg", "flour", "cornmeal", "bread", "cornbread"] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export type ResourceAmounts = Record<ResourceId, number>;

export const emptyResourceAmounts = (): ResourceAmounts => ({
  wheat: 0,
  corn: 0,
  egg: 0,
  flour: 0, cornmeal: 0, bread: 0, cornbread: 0,
});

export const RESOURCE_UNIT_PRICES: Readonly<ResourceAmounts> = {
  wheat: 2,
  corn: 3,
  egg: 5,
  flour: 6, cornmeal: 8, bread: 16, cornbread: 26,
};

export const RESOURCE_MARKET_CAPACITIES: Readonly<ResourceAmounts> = {
  wheat: 8,
  corn: 8,
  egg: 8,
  flour: 6, cornmeal: 6, bread: 6, cornbread: 4,
};
