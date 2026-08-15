import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { HiringStation } from "../entities/HiringStation";
import {
  getWorkerHireCost,
  hireWorker,
  type WorkerKind,
} from "../logic/hiring";
import type { Farmer } from "../entities/Farmer";
import type { GameState } from "../state/GameState";
export class HiringSystem {
  private stations: Record<WorkerKind, HiringStation>;
  private progress: Record<WorkerKind, number> = { harvest: 0, transport: 0 };
  private insufficient: Record<WorkerKind, boolean> = {
    harvest: false,
    transport: false,
  };
  constructor(
    scene: Phaser.Scene,
    private farmer: Farmer,
    private getState: () => GameState,
    private setState: (s: GameState) => void,
    private tutorial: (n: number) => void,
  ) {
    this.stations = {
      harvest: new HiringStation(
        scene,
        "harvest",
        GAME_CONFIG.harvestHire.x,
        GAME_CONFIG.harvestHire.y,
      ),
      transport: new HiringStation(
        scene,
        "transport",
        GAME_CONFIG.transportHire.x,
        GAME_CONFIG.transportHire.y,
      ),
    };
  }
  update(delta: number): void {
    this.updateOne("harvest", delta);
    this.updateOne("transport", delta);
  }
  private updateOne(kind: WorkerKind, delta: number): void {
    const s = this.getState(),
      worker =
        kind === "harvest"
          ? s.workers.harvestWorker
          : s.workers.transportWorker,
      station = this.stations[kind];
    const locked = kind === "transport" && !s.workers.harvestWorker.hired;
    const cost = getWorkerHireCost(kind);
    let text =
      kind === "harvest"
        ? `収穫スタッフを雇う\n${cost}コイン`
        : `運搬スタッフを雇う\n${cost}コイン`;
    if (locked) text = "収穫スタッフ雇用後に解放";
    else if (worker.hired) text = "雇用済み";
    else if (s.economy.walletCoins < cost)
      text = `あと ${cost - s.economy.walletCoins} コイン`;
    const near =
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        station.x,
        station.y,
      ) <= GAME_CONFIG.workerHireRadius;
    if (!near || locked || worker.hired) {
      this.progress[kind] = 0;
      this.insufficient[kind] = false;
      station.updateDisplay(0, text);
      return;
    }
    if (s.economy.walletCoins < cost) {
      if (!this.insufficient[kind]) {
        this.insufficient[kind] = true;
        station.pulse();
      }
      station.updateDisplay(0, text);
      return;
    }
    this.progress[kind] += delta;
    station.updateDisplay(
      this.progress[kind] / GAME_CONFIG.workerHireHoldDurationMs,
      text,
    );
    if (this.progress[kind] < GAME_CONFIG.workerHireHoldDurationMs) return;
    const r = hireWorker(
      {
        walletCoins: s.economy.walletCoins,
        harvestHired: s.workers.harvestWorker.hired,
        transportHired: s.workers.transportWorker.hired,
      },
      kind,
    );
    if (!r.hired) return;
    this.setState({
      ...s,
      economy: { ...s.economy, walletCoins: r.state.walletCoins },
      workers: {
        harvestWorker: {
          ...s.workers.harvestWorker,
          hired: r.state.harvestHired,
          status: r.state.harvestHired ? "麦畑へ移動中" : "未雇用",
        },
        transportWorker: {
          ...s.workers.transportWorker,
          hired: r.state.transportHired,
          status: r.state.transportHired ? "集荷箱へ戻っています" : "未雇用",
        },
      },
      firstHarvestWorkerHired: r.state.harvestHired,
      firstTransportWorkerHired: r.state.transportHired,
    });
    this.progress[kind] = 0;
    station.pulse();
    this.tutorial(kind === "harvest" ? 10 : 13);
  }
}
