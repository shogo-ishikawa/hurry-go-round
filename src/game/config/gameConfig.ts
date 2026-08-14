export const GAME_CONFIG = {
  worldWidth: 2000,
  worldHeight: 1400,
  playerInset: 42,
  playerSpeed: 270,
  pointMoveArrivalRadius: 10,
  carryCapacity: 12,
  harvestRange: 92,
  harvestIntervalMs: 280,
  regrowBaseMs: 7600,
  unloadIntervalMs: 180,
  delivery: { x: 1450, y: 560, radius: 125 },
} as const;
