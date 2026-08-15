export type CaretakerCargo = { resource: "corn"|"egg"|null; count: number; capacity: number };
export type PoultryTask = "emergency-feed"|"collect-eggs"|"top-up-feed"|"wait";
export function choosePoultryTask(feed:number,target:number,emergency:number,barnCorn:number,eggs:number):PoultryTask { if(feed<=emergency&&barnCorn>0)return"emergency-feed";if(eggs>0)return"collect-eggs";if(feed<target&&barnCorn>0)return"top-up-feed";return"wait"; }
export const canLoadCaretaker = (cargo:CaretakerCargo,resource:"corn"|"egg") => cargo.count<cargo.capacity&&(cargo.resource===null||cargo.resource===resource);
