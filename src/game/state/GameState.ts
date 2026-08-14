import { GAME_CONFIG } from '../config/gameConfig';
import type { Inventory } from '../logic/inventory';
import type { Point } from '../logic/movement';

export interface GameState {
  inventory: Inventory;
  harvestedTotal: number;
  deliveredOnce: boolean;
}

export interface ScreenTargetRequest extends Point {}

export function createGameState(): GameState {
  return {
    inventory: {
      carried: 0,
      barn: 0,
      capacity: GAME_CONFIG.carryCapacity,
    },
    harvestedTotal: 0,
    deliveredOnce: false,
  };
}

export const GAME_EVENTS = {
  state: 'game-state-changed',
  full: 'capacity-full',
  tutorial: 'tutorial-stage',
  direction: 'movement-direction-changed',
  moveTarget: 'movement-target-requested',
  playerMoved: 'player-first-moved',
} as const;
