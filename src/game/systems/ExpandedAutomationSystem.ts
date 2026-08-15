import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import type { Farmer } from "../entities/Farmer";
import type { GameState } from "../state/GameState";
import { choosePoultryTask } from "../logic/poultryAutomation";
import { hireWorker } from "../logic/workerHiring";
import { palette } from "../art/palette";

const PADS = { cornHarvest:{x:2180,y:980,cost:160}, cornTransport:{x:2320,y:980,cost:240}, caretaker:{x:1540,y:1530,cost:300} } as const;
export class ExpandedAutomationSystem {
  private hold: Record<keyof typeof PADS,number>={cornHarvest:0,cornTransport:0,caretaker:0};
  private harvestMs=0; private transferMs=0; private careMs=0;
  constructor(scene:Phaser.Scene,private farmer:Farmer,private getState:()=>GameState,private setState:(s:GameState)=>void){
    for(const [key,p] of Object.entries(PADS)){const color=key==="caretaker"?palette.coral:key==="cornTransport"?palette.sky:palette.wheat;scene.add.circle(p.x,p.y,34,color,.55).setStrokeStyle(4,palette.outline).setDepth(p.y);}
  }
  update(delta:number):void{this.updateHiring(delta);let s=this.getState();
    if(s.workers.cornHarvestWorker.hired){this.harvestMs+=delta;if(this.harvestMs>=GAME_CONFIG.cornHarvestWorkerHarvestDurationMs&&s.automation.cornFieldCrate<s.automation.cornFieldCrateCapacity){this.harvestMs=0;s={...s,automation:{...s.automation,cornFieldCrate:s.automation.cornFieldCrate+1},workers:{...s.workers,cornHarvestWorker:{...s.workers.cornHarvestWorker,status:"収穫中"}}};this.setState(s);}}
    s=this.getState();if(s.workers.cornTransportWorker.hired&&s.automation.cornFieldCrate>0){this.transferMs+=delta;if(this.transferMs>=GAME_CONFIG.cornTransportWorkerUnloadIntervalMs){this.transferMs=0;s={...s,automation:{...s.automation,cornFieldCrate:s.automation.cornFieldCrate-1},barn:{...s.barn,corn:s.barn.corn+1},workers:{...s.workers,cornTransportWorker:{...s.workers.cornTransportWorker,status:"倉庫へ移動中"}}};this.setState(s);}}
    s=this.getState();if(s.workers.poultryCaretaker.hired){this.careMs+=delta;if(this.careMs>=GAME_CONFIG.poultryCaretakerUnloadIntervalMs){this.careMs=0;const task=choosePoultryTask(s.livestock.feed,10,3,s.barn.corn,s.livestock.eggs);if((task==="emergency-feed"||task==="top-up-feed")&&s.barn.corn>0&&s.livestock.feed<s.livestock.feedCapacity)s={...s,barn:{...s.barn,corn:s.barn.corn-1},livestock:{...s.livestock,feed:s.livestock.feed+1},workers:{...s.workers,poultryCaretaker:{...s.workers.poultryCaretaker,status:"給餌中"}}};else if(task==="collect-eggs"&&s.livestock.eggs>0)s={...s,barn:{...s.barn,egg:s.barn.egg+1},livestock:{...s.livestock,eggs:s.livestock.eggs-1},workers:{...s.workers,poultryCaretaker:{...s.workers.poultryCaretaker,status:"卵を納品中"}}};else s={...s,workers:{...s.workers,poultryCaretaker:{...s.workers.poultryCaretaker,status:"待機中"}}};this.setState(s);}}
  }
  private updateHiring(delta:number):void{let s=this.getState();for(const [key,p] of Object.entries(PADS) as [keyof typeof PADS,(typeof PADS)[keyof typeof PADS]][]){const near=Phaser.Math.Distance.Between(this.farmer.x,this.farmer.y,p.x,p.y)<=82;if(!near){this.hold[key]=0;continue;}this.hold[key]+=delta;if(this.hold[key]<900)continue;this.hold[key]=0;const field=s.landExpansion.eastCornFieldUnlocked,prerequisite=key==="caretaker"?s.landExpansion.southChickenCoopUnlocked:key==="cornHarvest"?field:field&&s.workers.cornHarvestWorker.hired;const workerKey=key==="cornHarvest"?"cornHarvestWorker":key==="cornTransport"?"cornTransportWorker":"poultryCaretaker";const r=hireWorker(p.cost,s.economy.walletCoins,s.workers[workerKey].hired,prerequisite);if(r.changed){s={...s,economy:{...s.economy,walletCoins:r.wallet},workers:{...s.workers,[workerKey]:{...s.workers[workerKey],hired:true,status:"作業確認中"}}};this.setState(s);}}}
}
