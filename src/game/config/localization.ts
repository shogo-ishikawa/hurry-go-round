import type { ResourceId } from "./resourceDefinitions";

export const UI_TEXT = {
  resources: {
    wheat: "麦",
    corn: "とうもろこし",
    egg: "たまご",
    flour: "小麦粉",
    cornmeal: "コーンミール",
    bread: "パン",
    cornbread: "コーンブレッド",
      hay: "干し草", milk: "牛乳", butter: "バター", cheese: "チーズ",
  } satisfies Record<ResourceId, string>,
  facilities: {
    delivery: "納品",
    market: "売り場",
    cash: "売上回収",
    carry: "運搬かご",
    east: "東の畑",
    cornFieldExpansion: "とうもろこし畑拡張",
    coop: "鶏小屋",
    feed: "餌箱",
    eggs: "卵置き場",
    harvestWorker: "麦の収穫スタッフ",
    transportWorker: "麦の運搬スタッフ",
    crate: "麦の集荷箱",
  },
  terminology: { inventory:"持ち物", carryingBasket:"運搬かご", carryingCapacity:"持てる数", trainingLodge:"研修小屋", collectionHub:"集配所", collectionBox:"集配ボックス", collectionCourier:"集配スタッフ" },
  messages: {
    insufficientCoins: "コインが足りません",
    full: "持ち物がいっぱいです",
    mixed:
      "持ち物には別の商品が入っています\n先に倉庫へ納品してください",
    feedEmpty: "とうもろこしを餌箱へ入れましょう",
    eggsFull: "卵置き場が満杯です",
    landLocked: "この土地はまだ購入されていません",
    eastRequired: "先に東の畑を購入してください",
    purchaseHint: "円内に立つと土地を購入できます",
    cornFieldExpansionHint: "円内に立つととうもろこし畑を拡張できます",
    cornFieldMaximum: "とうもろこし畑は最大まで拡張されています",
    customerAbandoned: "お客さんが購入をあきらめました",
  },
} as const;
