import type { Economy } from "../state/GameState";
export interface CollectTillResult {
  changed: boolean;
  economy: Economy;
  collected: number;
  message: string;
}

export function collectAllTillCoins(value: Economy): CollectTillResult {
  const collected = Math.max(0, value.tillCoins);
  if (collected === 0)
    return { changed: false, economy: value, collected: 0, message: "未回収の売上はありません" };
  return {
    changed: true,
    economy: { ...value, tillCoins: 0, walletCoins: value.walletCoins + collected },
    collected,
    message: `売上 ${collected}コインを回収しました`,
  };
}
