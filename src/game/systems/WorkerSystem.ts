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
  depositHarvestWorkerCargoOne,
  getAutomationWheatTotal,
  harvestWorkerCollectOne,
  loadTransportWorkerOne,
  playerCollectFromFieldCrateOne,
  unloadTransportWorkerOne,
  type AutomationState,
} from "../logic/workers";
import { palette } from "../art/palette";
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
    this.crate.updateDisplay(s.inventory.fieldCrate);
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
    this.setState({
      ...s,
      ...extra,
      inventory: a.inventory,
      workers: {
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
    const r = playerCollectFromFieldCrateOne(this.automation(s));
    if (!r.changed) return;
    this.apply(s, r.state, { firstFieldCratePickup: true });
    this.farmer.setCarried(r.state.inventory.carried);
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
      s = this.getState();
    this.retarget = Math.max(0, this.retarget - delta);
    if (
      this.harvestPhase === "seeking-crop" ||
      this.harvestPhase === "waiting-for-crops"
    ) {
      if (
        s.workers.harvestWorker.carried >=
        GAME_CONFIG.harvestWorkerCarryCapacity
      ) {
        this.setHarvestPhase("returning-to-crate");
        return;
      }
      if (this.retarget > 0) return;
      this.retarget = GAME_CONFIG.harvestWorkerRetargetIntervalMs;
      this.target = this.nearestReady(w.x, w.y);
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
        (this.target?.y ?? 0) < 700
          ? WORKER_ROUTES.fieldEntries[0]
          : WORKER_ROUTES.fieldEntries[1];
      if (
        entry &&
        w.moveToward(entry, delta, GAME_CONFIG.harvestWorkerMoveSpeed)
      )
        this.setHarvestPhase("moving-to-crop");
    } else if (this.harvestPhase === "moving-to-crop") {
      if (!this.target || this.target.model.state !== "ready") {
        this.setHarvestPhase("seeking-crop");
        return;
      }
      if (
        w.moveToward(this.target, delta, GAME_CONFIG.harvestWorkerMoveSpeed)
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
      if (this.timer >= GAME_CONFIG.harvestWorkerHarvestDurationMs) {
        const before = getAutomationWheatTotal(this.automation(s));
        if (this.target.harvest()) {
          const r = harvestWorkerCollectOne(
            this.automation(s),
            GAME_CONFIG.harvestWorkerCarryCapacity,
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
          GAME_CONFIG.harvestWorkerMoveSpeed,
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
      const r = depositHarvestWorkerCargoOne(this.automation(current));
      if (r.changed) {
        this.apply(current, r.state);
        this.effect(
          w.x,
          w.y,
          GAME_CONFIG.fieldCrate.x,
          GAME_CONFIG.fieldCrate.y,
        );
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
  private nearestReady(x: number, y: number): CropNode | undefined {
    let result: CropNode | undefined,
      best = Infinity;
    for (const crop of this.crops) {
      if (crop.model.state !== "ready") continue;
      const d = Phaser.Math.Distance.Squared(x, y, crop.x, crop.y);
      if (d < best) {
        best = d;
        result = crop;
      }
    }
    return result;
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
  return s.workers.harvestWorker.carried >=
    GAME_CONFIG.harvestWorkerCarryCapacity
    ? "returning-to-crate"
    : "seeking-crop";
}
