import type { Inventory } from '../logic/inventory';
export interface GameState { inventory: Inventory; harvestedTotal: number; deliveredOnce: boolean }
export function createGameState(): GameState {
  return { inventory: { carried: 0, barn: 0, capacity: 12 }, harvestedTotal: 0, deliveredOnce: false };
}
export const GAME_EVENTS = { state: 'game-state-changed', full: 'capacity-full', tutorial: 'tutorial-stage' } as const;
