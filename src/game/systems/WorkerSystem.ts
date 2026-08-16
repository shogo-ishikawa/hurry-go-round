import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { FieldCrate } from "../entities/FieldCrate";
import { HarvestWorker } from "../entities/HarvestWorker";
import { TransportWorker } from "../entities/TransportWorker";
import type { Farmer } from "../entities/Farmer";
import type { CropNode } from "../entities/CropNode";
import type { GameState } from "../state/GameState";
import { WORKER_ROUTES } from "../routes/workerRoutes";
import {
  depositHarvestWorkerBatch,
  getAutomationWheatTotal,
  harvestWorkerCollectOne,
  loadTransportWorkerOne,
  unloadTransportWorkerOne,
  type AutomationState,
  selectNextWheatNodeInCluster,
  selectWheatFieldCluster,
} from "../logic/workers";
import { addCargoOne } from "../logic/resources";
import { palette } from "../art/palette";
import { getWheatWorkerRuntimeParameters } from "../logic/workforce";
export type HarvestWorkerPhase =
  | "idle"
  | "seeking-crop"
  | "moving-to-field"
  | "moving-to-crop"
  | "harvesting"
  | "returning-to-crate"
  | "depositing"
  | "waiting-for-crops"
  | "waiting-for-crate-space";
export type TransportWorkerPhase =
  | "idle-at-crate"
  | "loading"
  | "moving-to-barn"
  | "unloading"
  | "returning-to-crate";
export class WorkerSystem {
  private crate: FieldCrate;
  private harvester?: HarvestWorker;
  private transporter?: TransportWorker;
  private harvestPhase: HarvestWorkerPhase = "idle";
  private transportPhase: TransportWorkerPhase = "idle-at-crate";
  private target?: CropNode;
  private timer = 0;
  private retarget = 0;
  private depositTimer = 0;
  private pickupTimer = 0;
  private loadTimer = 0;
  private unloadTimer = 0;
  private routeIndex = 0;
  private crateFullNotified = false;
  private activeCluster?: "west" | "central";
  private clusterEmptyElapsed=0;
  constructor(
    private scene: Phaser.Scene,
    private farmer: Farmer,
    private crops: CropNode[],
    private getState: () => GameState,
    private setState: (s: GameState) => void,
    private tutorial: (n: number) => void,
  ) {
    this.crate = new FieldCrate(scene);
  }
  update(delta: number): void {
    this.ensureWorkers();
    this.updatePlayerPickup(delta);
    if (this.harvester) this.updateHarvester(delta);
    if (this.transporter) this.updateTransporter(delta);
    const s = this.getState();
    this.crate.updateDisplay(s.inventory.fieldCrate, s.inventory.fieldCrateCapacity);
    this.harvester?.setCargo(s.workers.harvestWorker.carried);
    this.transporter?.setCargo(s.workers.transportWorker.carried);
  }
  private ensureWorkers(): void {
    const s = this.getState();
    if (s.workers.harvestWorker.hired && !this.harvester) {
      this.harvester = new HarvestWorker(
        this.scene,
        WORKER_ROUTES.home.x,
        WORKER_ROUTES.home.y,
      );
      this.harvestPhase = "seeking-crop";
      this.harvester.setStatus("麦を探しています");
    }
    if (s.workers.transportWorker.hired && !this.transporter) {
      this.transporter = new TransportWorker(
        this.scene,
        WORKER_ROUTES.home.x,
        WORKER_ROUTES.home.y,
      );
      this.transportPhase = "returning-to-crate";
      this.transporter.setStatus("集荷箱へ戻っています");
      this.routeIndex = 0;
    }
  }
  private automation(s: GameState): AutomationState {
    return {
      inventory: s.inventory,
      harvestWorker: s.workers.harvestWorker,
      transportWorker: s.workers.transportWorker,
    };
  }
  private apply(
    s: GameState,
    a: AutomationState,
    extra: Partial<GameState> = {},
  ): void {
    const barn = a.inventory.barn !== s.inventory.barn ? { ...s.barn, wheat: s.barn.wheat + (a.inventory.barn - s.inventory.barn) } : s.barn;
    this.setState({
      ...s,
      ...extra,
      inventory: a.inventory,
      barn,
      workers: {
        ...s.workers,
        harvestWorker: { ...s.workers.harvestWorker, ...a.harvestWorker },
        transportWorker: { ...s.workers.transportWorker, ...a.transportWorker },
      },
    });
  }
  private updatePlayerPickup(delta: number): void {
    const s = this.getState(),
      near =
        Phaser.Math.Distance.Between(
          this.farmer.x,
          this.farmer.y,
          GAME_CONFIG.fieldCrate.x,
          GAME_CONFIG.fieldCrate.y,
        ) <= GAME_CONFIG.fieldCrate.radius;
    if (!near) {
      this.pickupTimer = 0;
      return;
    }
    this.pickupTimer += delta;
    if (this.pickupTimer < GAME_CONFIG.fieldCratePickupIntervalMs) return;
    this.pickupTimer -= GAME_CONFIG.fieldCratePickupIntervalMs;
    if (s.inventory.fieldCrate <= 0) return;
    const r = addCargoOne(s.cargo, "wheat");
    if (!r.changed) return;
    this.setState({ ...s, cargo: r.cargo, inventory: { ...s.inventory, fieldCrate: s.inventory.fieldCrate - 1 }, firstFieldCratePickup: true });
    this.farmer.setCargo(r.cargo.amounts, r.cargo.capacity);
    this.effect(
      GAME_CONFIG.fieldCrate.x,
      GAME_CONFIG.fieldCrate.y,
      this.farmer.x,
      this.farmer.y - 45,
    );
    this.tutorial(12);
  }
  private updateHarvester(delta: number): void {
    const w = this.harvester!,
      s = this.getState(), params=getWheatWorkerRuntimeParameters("wheat-harvester",s.workers.harvestWorker.level);
    this.retarget = Math.max(0, this.retarget - delta);
    if (
      this.harvestPhase === "seeking-crop" ||
      this.harvestPhase === "waiting-for-crops"
    ) {
      if (
        s.workers.harvestWorker.carried >=
        params.capacity
      ) {
        this.setHarvestPhase("returning-to-crate");
        return;
      }
      if(this.activeCluster&&s.workers.harvestWorker.carried>0&&!this.crops.some(c=>c.cluster===this.activeCluster&&c.model.state==="ready")){this.clusterEmptyElapsed+=delta;if(this.clusterEmptyElapsed<600)return;this.clusterEmptyElapsed=0;this.activeCluster=undefined;this.setHarvestPhase("returning-to-crate");return;}
      this.clusterEmptyElapsed=0;if (this.retarget > 0) return;
      this.retarget = params.retargetIntervalMs;
      this.activeCluster=selectWheatFieldCluster(this.crops.map(c=>({id:c.cropId,cluster:c.cluster,x:c.x,y:c.y,ready:c.model.state==="ready"})),w.x,w.y,this.activeCluster)??undefined;
      this.target=this.activeCluster?this.nextInCluster(this.activeCluster,w.x,w.y):undefined;
      if (!this.target) {
        this.setHarvestPhase(
          s.workers.harvestWorker.carried > 0
            ? "returning-to-crate"
            : "waiting-for-crops",
        );
        return;
      }
      this.setHarvestPhase("moving-to-field");
    }
    if (this.harvestPhase === "moving-to-field") {
      const entry =
        this.target?.cluster === "west" ? WORKER_ROUTES.fieldEntries[0] : WORKER_ROUTES.fieldEntries[1];
      if (
        entry &&
        w.moveToward(entry, delta, params.moveSpeed)
      )
        this.setHarvestPhase("moving-to-crop");
    } else if (this.harvestPhase === "moving-to-crop") {
      if (!this.target || this.target.model.state !== "ready") {
        this.setHarvestPhase("seeking-crop");
        return;
      }
      if (
        w.moveToward(this.target, delta, params.moveSpeed)
      ) {
        this.timer = 0;
        this.setHarvestPhase("harvesting");
      }
    } else if (this.harvestPhase === "harvesting") {
      if (!this.target || this.target.model.state !== "ready") {
        this.setHarvestPhase("seeking-crop");
        return;
      }
      this.timer += delta;
      if (this.timer >= params.operationIntervalMs) {
        const before = getAutomationWheatTotal(this.automation(s));
        if (this.target.harvest()) {
          const r = harvestWorkerCollectOne(
            this.automation(s),
            params.capacity,
          );
          if (r.changed) {
            this.apply(s, r.state, { harvestedTotal: s.harvestedTotal + 1 });
            if (getAutomationWheatTotal(r.state) !== before + 1)
              throw new Error("麦在庫の不整合");
          }
        }
        this.target = undefined;
        this.setHarvestPhase(routingAfterHarvest(this.getState()));
      }
    } else if (this.harvestPhase === "returning-to-crate") {
      if (
        w.moveToward(
          WORKER_ROUTES.crateWait,
          delta,
          params.moveSpeed,
        )
      )
        this.setHarvestPhase("depositing");
    } else if (
      this.harvestPhase === "depositing" ||
      this.harvestPhase === "waiting-for-crate-space"
    ) {
      const current = this.getState();
      if (
        current.inventory.fieldCrate >= current.inventory.fieldCrateCapacity
      ) {
        this.setHarvestPhase("waiting-for-crate-space");
        if (!this.crateFullNotified) {
          this.crateFullNotified = true;
          w.setStatus("集荷箱が満杯");
        }
        return;
      }
      this.crateFullNotified = false;
      if (current.workers.harvestWorker.carried <= 0) {
        this.setHarvestPhase("seeking-crop");
        return;
      }
      this.depositTimer += delta;
      if (this.depositTimer < GAME_CONFIG.harvestWorkerDepositIntervalMs)
        return;
      this.depositTimer -= GAME_CONFIG.harvestWorkerDepositIntervalMs;
      const r = depositHarvestWorkerBatch(this.automation(current));
      if (r.changed) {
        this.apply(current, r.state);
        this.effect(
          w.x,
          w.y,
          GAME_CONFIG.fieldCrate.x,
          GAME_CONFIG.fieldCrate.y,
        );
        w.setStatus(`麦を ${r.transferred} 個まとめて納品`);
        this.scene.time.delayedCall(450,()=>{if(this.harvestPhase==="depositing")this.setHarvestPhase("seeking-crop");});
        this.tutorial(11);
      }
    }
  }
  private updateTransporter(delta: number): void {
    const w = this.transporter!;
    if (this.transportPhase === "returning-to-crate") {
      const p = WORKER_ROUTES.transportToCrate[this.routeIndex];
      if (p && w.moveToward(p, delta, GAME_CONFIG.transportWorkerMoveSpeed)) {
        this.routeIndex++;
        if (this.routeIndex >= WORKER_ROUTES.transportToCrate.length) {
          this.routeIndex = 0;
          this.setTransportPhase("idle-at-crate");
        }
      }
    } else if (
      this.transportPhase === "idle-at-crate" ||
      this.transportPhase === "loading"
    ) {
      const s = this.getState();
      if (s.inventory.fieldCrate <= 0) {
        if (s.workers.transportWorker.carried > 0) {
          this.routeIndex = 0;
          this.setTransportPhase("moving-to-barn");
        } else this.setTransportPhase("idle-at-crate");
        return;
      }
      this.setTransportPhase("loading");
      this.loadTimer += delta;
      if (this.loadTimer < GAME_CONFIG.transportWorkerLoadIntervalMs) return;
      this.loadTimer -= GAME_CONFIG.transportWorkerLoadIntervalMs;
      const r = loadTransportWorkerOne(
        this.automation(s),
        GAME_CONFIG.transportWorkerCarryCapacity,
      );
      if (r.changed) {
        this.apply(s, r.state);
        this.effect(
          GAME_CONFIG.fieldCrate.x,
          GAME_CONFIG.fieldCrate.y,
          w.x,
          w.y - 35,
        );
        if (
          r.state.transportWorker.carried >=
          GAME_CONFIG.transportWorkerCarryCapacity
        ) {
          this.routeIndex = 0;
          this.setTransportPhase("moving-to-barn");
        }
      }
    } else if (this.transportPhase === "moving-to-barn") {
      const p = WORKER_ROUTES.transportToBarn[this.routeIndex];
      if (p && w.moveToward(p, delta, GAME_CONFIG.transportWorkerMoveSpeed)) {
        this.routeIndex++;
        if (this.routeIndex >= WORKER_ROUTES.transportToBarn.length) {
          this.routeIndex = 0;
          this.setTransportPhase("unloading");
        }
      }
    } else if (this.transportPhase === "unloading") {
      const s = this.getState();
      if (s.workers.transportWorker.carried <= 0) {
        this.routeIndex = 0;
        this.setTransportPhase("returning-to-crate");
        return;
      }
      this.unloadTimer += delta;
      if (this.unloadTimer < GAME_CONFIG.transportWorkerUnloadIntervalMs)
        return;
      this.unloadTimer -= GAME_CONFIG.transportWorkerUnloadIntervalMs;
      const r = unloadTransportWorkerOne(this.automation(s));
      if (r.changed) {
        this.apply(s, r.state, { firstAutomatedBarnDelivery: true });
        this.effect(w.x, w.y, GAME_CONFIG.delivery.x, GAME_CONFIG.delivery.y);
        this.tutorial(14);
      }
    }
  }
  private nextInCluster(cluster:"west"|"central",x:number,y:number):CropNode|undefined {
    const node=selectNextWheatNodeInCluster(this.crops.map(c=>({id:c.cropId,cluster:c.cluster,x:c.x,y:c.y,ready:c.model.state==="ready"})),cluster,x,y);
    return node?this.crops.find(c=>c.cropId===node.id):undefined;
  }
  private setHarvestPhase(p: HarvestWorkerPhase): void {
    if (p === this.harvestPhase) return;
    this.harvestPhase = p;
    const labels: Record<HarvestWorkerPhase, string> = {
      idle: "待機中",
      "seeking-crop": "麦を探しています",
      "moving-to-field": "麦畑へ移動中",
      "moving-to-crop": "麦畑へ移動中",
      harvesting: "収穫中",
      "returning-to-crate": "集荷箱へ運搬中",
      depositing: "集荷中",
      "waiting-for-crops": "成長待ち",
      "waiting-for-crate-space": "集荷箱待ち",
    };
    this.harvester?.setStatus(labels[p]);
    this.updateStatus("harvest", labels[p]);
  }
  private setTransportPhase(p: TransportWorkerPhase): void {
    if (p === this.transportPhase) return;
    this.transportPhase = p;
    const labels: Record<TransportWorkerPhase, string> = {
      "idle-at-crate": "集荷箱で待機",
      loading: "積み込み中",
      "moving-to-barn": "倉庫へ運搬中",
      unloading: "納品中",
      "returning-to-crate": "集荷箱へ戻っています",
    };
    this.transporter?.setStatus(labels[p]);
    this.updateStatus("transport", labels[p]);
  }
  private updateStatus(kind: "harvest" | "transport", status: string): void {
    const s = this.getState(),
      key = kind === "harvest" ? "harvestWorker" : "transportWorker";
    if (s.workers[key].status === status) return;
    this.setState({
      ...s,
      workers: { ...s.workers, [key]: { ...s.workers[key], status } },
    });
  }
  private effect(x: number, y: number, tx: number, ty: number): void {
    const d = this.scene.add
      .circle(x, y, 8, palette.wheat)
      .setStrokeStyle(2, palette.outline)
      .setDepth(9000);
    this.scene.tweens.add({
      targets: d,
      x: tx,
      y: ty,
      scale: 0.5,
      duration: 300,
      onComplete: () => d.destroy(),
    });
  }
}
function routingAfterHarvest(s: GameState): HarvestWorkerPhase {
 const capacity=getWheatWorkerRuntimeParameters("wheat-harvester",s.workers.harvestWorker.level).capacity;
 return s.workers.harvestWorker.carried>=capacity?"returning-to-crate":"seeking-crop";
}
