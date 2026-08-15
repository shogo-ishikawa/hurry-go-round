import type { Economy } from "../state/GameState";
export function collectTillCoin(value: Economy): Economy {
  return value.tillCoins <= 0
    ? value
    : {
        ...value,
        tillCoins: value.tillCoins - 1,
        walletCoins: value.walletCoins + 1,
      };
}
