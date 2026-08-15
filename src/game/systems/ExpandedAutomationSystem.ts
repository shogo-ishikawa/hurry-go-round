import Phaser from "phaser";
import { palette } from "../art/palette";
import { GAME_CONFIG } from "../config/gameConfig";
import { CornNode } from "../entities/CornNode";
import type { Farmer } from "../entities/Farmer";
import {
  getCornWorkerHarvestIntervalMs,
  getEggCollectionBatchAmount,
  getLoadableBatchAmount,
  getPoultryFeedBatchAmount,
  shouldDepartWithBatch,
} from "../logic/automationBatching";
import { INTERACTIONS } from "../logic/facilities";
import { choosePoultryTask } from "../logic/poultryAutomation";
import {
  availabilityText,
  createWorkerProgress,
  getWorkerParametersForLevel,
  hireWorkerByRole,
  WORKER_ROLES,
  type WorkerLevel,
  type WorkerRoleId,
} from "../logic/workforce";
import { GAME_EVENTS, type GameState } from "../state/GameState";

type AutomationRole =
  | "corn-harvester"
  | "corn-transporter"
  | "poultry-caretaker";

type WorkerKey =
  | "cornHarvestWorker"
  | "cornTransportWorker"
  | "poultryCaretaker";

type RuntimeStage =
  | "corn-find"
  | "corn-to-crop"
  | "corn-harvesting"
  | "corn-to-crate"
  | "corn-depositing"
  | "transport-to-crate"
  | "transport-loading"
  | "transport-to-barn"
  | "transport-unloading"
  | "care-select"
  | "care-wait"
  | "care-to-barn-feed"
  | "care-loading-feed"
  | "care-to-feed"
  | "care-unloading-feed"
  | "care-return-corn"
  | "care-returning-corn"
  | "care-to-eggs"
  | "care-loading-eggs"
  | "care-to-barn-eggs"
  | "care-unloading-eggs";

type CareTask = "feed" | "eggs" | null;

type Runtime = {
  role: AutomationRole;
  body: Phaser.GameObjects.Container;
  cargoArt: Phaser.GameObjects.Graphics;
  stage: RuntimeStage;
  timer: number;
  waitTimer: number;
  targetCorn?: CornNode;
  task: CareTask;
};

type WorkerPatch = {
  hired?: boolean;
  level?: WorkerLevel;
  carried?: number;
  status?: string;
  resource?: "corn" | "egg" | null;
};

const STATE_KEY: Record<AutomationRole, WorkerKey> = {
  "corn-harvester": "cornHarvestWorker",
  "corn-transporter": "cornTransportWorker",
  "poultry-caretaker": "poultryCaretaker",
};

const CORN_CRATE = { x: 2480, y: 900 } as const;
const BARN = { x: 1450, y: 610 } as const;
const FEED_TROUGH = { x: 980, y: 1610 } as const;
const EGG_STORAGE = { x: 1390, y: 1620 } as const;
const CARETAKER_WAIT = { x: 1180, y: 1720 } as const;

export class ExpandedAutomationSystem {
  private readonly holds = new Map<AutomationRole, number>();
  private readonly armed = new Map<AutomationRole, boolean>();
  private readonly runtimes = new Map<AutomationRole, Runtime>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly farmer: Farmer,
    private readonly getState: () => GameState,
    private readonly setState: (state: GameState) => void,
  ) {
    this.createHiringPads();
    this.syncWorkers();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  update(delta: number): void {
    this.updateHiring(delta);
    this.syncWorkers();
    for (const runtime of this.runtimes.values()) {
      this.updateRuntime(runtime, delta);
      this.updateCargoArt(runtime);
    }
  }

  private createHiringPads(): void {
    for (const action of INTERACTIONS) {
      const role = action.workerRole;
      if (!this.isAutomationRole(role) || action.kind !== "hold-hire") continue;
      const color =
        role === "poultry-caretaker"
          ? palette.coral
          : role === "corn-transporter"
            ? palette.sky
            : palette.wheat;
      this.scene.add
        .circle(
          action.center.x,
          action.center.y,
          action.visibleRadius,
          color,
          0.22,
        )
        .setStrokeStyle(5, palette.outline)
        .setDepth(action.center.y - 1);
      this.scene.add
        .text(action.center.x, action.center.y, action.shortLabel, {
          fontFamily: "system-ui",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#49382e",
          backgroundColor: "#fff4d8dd",
          padding: { x: 7, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(action.center.y + 2);
    }
  }

  private updateHiring(delta: number): void {
    for (const action of INTERACTIONS) {
      const role = action.workerRole;
      if (!this.isAutomationRole(role) || action.kind !== "hold-hire") continue;

      const near =
        Phaser.Math.Distance.Between(
          this.farmer.x,
          this.farmer.y,
          action.center.x,
          action.center.y,
        ) <= action.radius;
      if (!near) {
        this.holds.set(role, 0);
        this.armed.set(role, true);
        continue;
      }
      if (this.armed.get(role) === false) continue;

      const hold = (this.holds.get(role) ?? 0) + delta;
      this.holds.set(role, hold);
      if (hold < (action.holdDurationMs ?? 900)) continue;

      this.holds.set(role, 0);
      this.armed.set(role, false);

      const state = this.getState();
      const current = this.getWorker(state, role);
      const caretakerResource =
        role === "poultry-caretaker"
          ? state.workers.poultryCaretaker.resource
          : "corn";
      const result = hireWorkerByRole(
        role,
        state.economy.walletCoins,
        createWorkerProgress(
          current.hired,
          caretakerResource,
          current.carried,
        ),
        this.getPrerequisites(state),
      );

      if (!result.changed) {
        this.scene.game.events.emit(
          GAME_EVENTS.hint,
          availabilityText(
            result.reason ?? "already-hired",
            Math.max(
              0,
              WORKER_ROLES[role].hireCost - state.economy.walletCoins,
            ),
          ),
        );
        continue;
      }

      const nextState = this.patchWorker(state, role, {
        hired: true,
        level: 1,
        carried: 0,
        resource: role === "poultry-caretaker" ? null : undefined,
        status: "作業場所へ移動中",
      });
      this.setState({
        ...nextState,
        economy: {
          ...nextState.economy,
          walletCoins: result.wallet,
        },
      });
      this.spawn(role);
      this.scene.game.events.emit(GAME_EVENTS.dirty, "priority");
      this.scene.game.events.emit(
        GAME_EVENTS.hint,
        `${role === "poultry-caretaker" ? "飼育" : "とうもろこし"}スタッフを雇いました`,
      );
    }
  }

  private getPrerequisites(state: GameState) {
    const hiredRoles = new Set<WorkerRoleId>();
    if (state.workers.harvestWorker.hired) hiredRoles.add("wheat-harvester");
    if (state.workers.transportWorker.hired) hiredRoles.add("wheat-transporter");
    if (state.workers.cornHarvestWorker.hired) hiredRoles.add("corn-harvester");
    if (state.workers.cornTransportWorker.hired) hiredRoles.add("corn-transporter");
    if (state.workers.poultryCaretaker.hired) hiredRoles.add("poultry-caretaker");
    return {
      eastUnlocked: state.landExpansion.eastCornFieldUnlocked,
      coopUnlocked: state.landExpansion.southChickenCoopUnlocked,
      hiredRoles,
    };
  }

  private syncWorkers(): void {
    const state = this.getState();
    for (const role of [
      "corn-harvester",
      "corn-transporter",
      "poultry-caretaker",
    ] as const) {
      if (this.getWorker(state, role).hired && !this.runtimes.has(role)) {
        this.spawn(role);
      }
    }
  }

  private spawn(role: AutomationRole): void {
    if (this.runtimes.has(role)) return;
    const state = this.getState();
    const worker = this.getWorker(state, role);
    const start =
      role === "poultry-caretaker"
        ? CARETAKER_WAIT
        : role === "corn-transporter"
          ? CORN_CRATE
          : { x: 2180, y: 900 };
    const color =
      role === "poultry-caretaker"
        ? palette.sky
        : role === "corn-transporter"
          ? palette.wheat
          : palette.foliage;

    const shadow = this.scene.add.ellipse(
      0,
      24,
      58,
      22,
      palette.shadow,
      0.25,
    );
    const body = this.scene.add
      .graphics()
      .lineStyle(4, palette.outline)
      .fillStyle(color)
      .fillRoundedRect(-20, -24, 40, 52, 12)
      .strokeRoundedRect(-20, -24, 40, 52, 12)
      .fillStyle(palette.cream)
      .fillCircle(0, -31, 18)
      .strokeCircle(0, -31, 18);
    const tool = this.scene.add
      .graphics()
      .lineStyle(5, palette.outline)
      .strokeLineShape(new Phaser.Geom.Line(18, -5, 34, 20));
    const cargoArt = this.scene.add.graphics();
    const container = this.scene.add
      .container(start.x, start.y, [shadow, body, tool, cargoArt])
      .setDepth(start.y);

    let stage: RuntimeStage;
    let task: CareTask = null;
    if (role === "corn-harvester") {
      stage = worker.carried > 0 ? "corn-to-crate" : "corn-find";
    } else if (role === "corn-transporter") {
      stage = worker.carried > 0 ? "transport-to-barn" : "transport-to-crate";
    } else {
      const caretaker = state.workers.poultryCaretaker;
      if (caretaker.carried > 0 && caretaker.resource === "corn") {
        stage = "care-to-feed";
        task = "feed";
      } else if (caretaker.carried > 0 && caretaker.resource === "egg") {
        stage = "care-to-barn-eggs";
        task = "eggs";
      } else {
        stage = "care-select";
      }
    }

    this.runtimes.set(role, {
      role,
      body: container,
      cargoArt,
      stage,
      timer: 0,
      waitTimer: 0,
      task,
    });
  }

  private updateRuntime(runtime: Runtime, delta: number): void {
    if (runtime.role === "corn-harvester") {
      this.updateCornHarvester(runtime, delta);
    } else if (runtime.role === "corn-transporter") {
      this.updateCornTransporter(runtime, delta);
    } else {
      this.updateCaretaker(runtime, delta);
    }
  }

  private updateCornHarvester(runtime: Runtime, delta: number): void {
    const state = this.getState();
    const worker = state.workers.cornHarvestWorker;
    const parameters = getWorkerParametersForLevel(
      "corn-harvester",
      worker.level,
    );

    switch (runtime.stage) {
      case "corn-find": {
        if (worker.carried >= parameters.capacity) {
          this.setStage(runtime, "corn-to-crate", "集荷箱へまとめて運搬中");
          return;
        }
        runtime.waitTimer += delta;
        if (runtime.waitTimer < 200) return;
        runtime.waitTimer = 0;
        const target = this.findNearestReadyCorn(runtime.body.x, runtime.body.y);
        if (!target) {
          if (worker.carried > 0) {
            this.setStage(runtime, "corn-to-crate", "集荷箱へまとめて運搬中");
          } else {
            this.setWorkerStatus("corn-harvester", "とうもろこしの成長待ち");
          }
          return;
        }
        runtime.targetCorn = target;
        this.setStage(runtime, "corn-to-crop", "収穫場所へ移動中");
        return;
      }
      case "corn-to-crop": {
        if (!this.isReadyCorn(runtime.targetCorn)) {
          runtime.targetCorn = undefined;
          this.setStage(runtime, "corn-find", "次のとうもろこしを探しています");
          return;
        }
        if (this.move(runtime, runtime.targetCorn, delta)) {
          this.setStage(runtime, "corn-harvesting", "まとめて収穫中");
        }
        return;
      }
      case "corn-harvesting": {
        const target = runtime.targetCorn;
        if (!this.isReadyCorn(target)) {
          runtime.targetCorn = undefined;
          this.setStage(runtime, "corn-find", "次のとうもろこしを探しています");
          return;
        }
        runtime.timer += delta;
        const interval = getCornWorkerHarvestIntervalMs(
          GAME_CONFIG.cornHarvestWorkerHarvestDurationMs,
          parameters.operationIntervalMultiplier,
          state.landExpansion.cornFieldLevel,
        );
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        if (!target.harvest()) {
          runtime.targetCorn = undefined;
          this.setStage(runtime, "corn-find", "次のとうもろこしを探しています");
          return;
        }
        const latest = this.getState();
        const carried = Math.min(
          parameters.capacity,
          latest.workers.cornHarvestWorker.carried + 1,
        );
        const nextState = this.patchWorker(latest, "corn-harvester", {
          carried,
          status: `まとめて収穫中 ${carried}/${parameters.capacity}`,
        });
        this.setState({
          ...nextState,
          harvestedTotal: nextState.harvestedTotal + 1,
        });
        runtime.targetCorn = undefined;
        this.setStage(
          runtime,
          carried >= parameters.capacity ? "corn-to-crate" : "corn-find",
          carried >= parameters.capacity
            ? "集荷箱へまとめて運搬中"
            : "次のとうもろこしを探しています",
        );
        return;
      }
      case "corn-to-crate": {
        if (this.move(runtime, CORN_CRATE, delta)) {
          this.setStage(runtime, "corn-depositing", "集荷箱へ格納中");
        }
        return;
      }
      case "corn-depositing": {
        const latest = this.getState();
        const current = latest.workers.cornHarvestWorker;
        if (current.carried <= 0) {
          this.setStage(runtime, "corn-find", "とうもろこし畑へ戻ります");
          return;
        }
        if (
          latest.automation.cornFieldCrate >=
          latest.automation.cornFieldCrateCapacity
        ) {
          this.setWorkerStatus("corn-harvester", "とうもろこし集荷箱が満杯");
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.cornHarvestWorkerDepositIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const remaining = current.carried - 1;
        const nextState = this.patchWorker(latest, "corn-harvester", {
          carried: remaining,
          status:
            remaining > 0
              ? `集荷箱へ格納中 ${remaining}個`
              : "とうもろこし畑へ戻ります",
        });
        this.setState({
          ...nextState,
          automation: {
            ...nextState.automation,
            cornFieldCrate: nextState.automation.cornFieldCrate + 1,
          },
        });
        if (remaining <= 0) {
          this.setStage(runtime, "corn-find", "とうもろこし畑へ戻ります");
        }
        return;
      }
      default:
        return;
    }
  }

  private updateCornTransporter(runtime: Runtime, delta: number): void {
    const state = this.getState();
    const worker = state.workers.cornTransportWorker;
    const parameters = getWorkerParametersForLevel(
      "corn-transporter",
      worker.level,
    );

    switch (runtime.stage) {
      case "transport-to-crate":
        if (this.move(runtime, CORN_CRATE, delta)) {
          this.setStage(runtime, "transport-loading", "まとめて積み込み中");
        }
        return;
      case "transport-loading": {
        const latest = this.getState();
        const current = latest.workers.cornTransportWorker;
        if (current.carried >= parameters.capacity) {
          this.setStage(runtime, "transport-to-barn", "倉庫へまとめて運搬中");
          return;
        }
        const loadable = getLoadableBatchAmount(
          latest.automation.cornFieldCrate,
          current.carried,
          parameters.capacity,
        );
        if (loadable > 0) {
          runtime.timer += delta;
          const interval =
            GAME_CONFIG.cornTransportWorkerLoadIntervalMs *
            parameters.operationIntervalMultiplier;
          if (runtime.timer < interval) return;
          runtime.timer -= interval;
          runtime.waitTimer = 0;
          const carried = current.carried + 1;
          const nextState = this.patchWorker(latest, "corn-transporter", {
            carried,
            status: `まとめて積み込み中 ${carried}/${parameters.capacity}`,
          });
          this.setState({
            ...nextState,
            automation: {
              ...nextState.automation,
              cornFieldCrate: nextState.automation.cornFieldCrate - 1,
            },
          });
          if (carried >= parameters.capacity) {
            this.setStage(runtime, "transport-to-barn", "倉庫へまとめて運搬中");
          }
          return;
        }
        if (current.carried <= 0) {
          runtime.waitTimer = 0;
          this.setWorkerStatus("corn-transporter", "とうもろこし集荷箱で待機");
          return;
        }
        runtime.waitTimer += delta;
        this.setWorkerStatus(
          "corn-transporter",
          `出発前のまとめ待ち ${current.carried}/${parameters.capacity}`,
        );
        if (
          shouldDepartWithBatch(
            current.carried,
            parameters.capacity,
            latest.automation.cornFieldCrate,
            runtime.waitTimer,
            GAME_CONFIG.cornTransportDepartureDelayMs,
          )
        ) {
          this.setStage(runtime, "transport-to-barn", "倉庫へまとめて運搬中");
        }
        return;
      }
      case "transport-to-barn":
        if (this.move(runtime, BARN, delta)) {
          this.setStage(runtime, "transport-unloading", "倉庫へまとめて納品中");
        }
        return;
      case "transport-unloading": {
        const latest = this.getState();
        const current = latest.workers.cornTransportWorker;
        if (current.carried <= 0) {
          this.setStage(runtime, "transport-to-crate", "集荷箱へ戻っています");
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.cornTransportWorkerUnloadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const remaining = current.carried - 1;
        const nextState = this.patchWorker(latest, "corn-transporter", {
          carried: remaining,
          status:
            remaining > 0
              ? `倉庫へまとめて納品中 ${remaining}個`
              : "集荷箱へ戻っています",
        });
        this.setState({
          ...nextState,
          barn: { ...nextState.barn, corn: nextState.barn.corn + 1 },
        });
        if (remaining <= 0) {
          this.setStage(runtime, "transport-to-crate", "集荷箱へ戻っています");
        }
        return;
      }
      default:
        return;
    }
  }

  private updateCaretaker(runtime: Runtime, delta: number): void {
    const state = this.getState();
    const worker = state.workers.poultryCaretaker;
    const parameters = getWorkerParametersForLevel(
      "poultry-caretaker",
      worker.level,
    );

    switch (runtime.stage) {
      case "care-select": {
        if (worker.carried > 0 && worker.resource === "corn") {
          runtime.task = "feed";
          this.setStage(runtime, "care-to-feed", "餌箱へまとめて運搬中");
          return;
        }
        if (worker.carried > 0 && worker.resource === "egg") {
          runtime.task = "eggs";
          this.setStage(runtime, "care-to-barn-eggs", "卵を倉庫へまとめて運搬中");
          return;
        }
        const task = choosePoultryTask(
          state.livestock.feed,
          GAME_CONFIG.poultryFeedTarget,
          GAME_CONFIG.poultryFeedEmergencyThreshold,
          state.barn.corn,
          state.livestock.eggs,
        );
        if (task === "emergency-feed" || task === "top-up-feed") {
          runtime.task = "feed";
          this.setStage(runtime, "care-to-barn-feed", "餌を取りに倉庫へ移動中");
        } else if (task === "collect-eggs") {
          runtime.task = "eggs";
          this.setStage(runtime, "care-to-eggs", "卵置き場へ移動中");
        } else {
          runtime.task = null;
          this.setStage(runtime, "care-wait", "鶏小屋で待機中");
        }
        return;
      }
      case "care-wait":
        this.move(runtime, CARETAKER_WAIT, delta);
        runtime.timer += delta;
        if (runtime.timer >= 500) {
          this.setStage(runtime, "care-select", "次の作業を確認中");
        }
        return;
      case "care-to-barn-feed":
        if (this.move(runtime, BARN, delta)) {
          this.setStage(runtime, "care-loading-feed", "餌をまとめて積み込み中");
        }
        return;
      case "care-loading-feed": {
        const latest = this.getState();
        const current = latest.workers.poultryCaretaker;
        const loadable = getPoultryFeedBatchAmount(
          latest.barn.corn,
          latest.livestock.feed + current.carried,
          GAME_CONFIG.poultryFeedTarget,
          Math.max(0, parameters.capacity - current.carried),
        );
        if (loadable <= 0) {
          this.setStage(
            runtime,
            current.carried > 0 ? "care-to-feed" : "care-select",
            current.carried > 0 ? "餌箱へまとめて運搬中" : "次の作業を確認中",
          );
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.poultryCaretakerLoadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const carried = current.carried + 1;
        const nextState = this.patchWorker(latest, "poultry-caretaker", {
          carried,
          resource: "corn",
          status: `餌をまとめて積み込み中 ${carried}/${parameters.capacity}`,
        });
        this.setState({
          ...nextState,
          barn: { ...nextState.barn, corn: nextState.barn.corn - 1 },
        });
        if (
          carried >= parameters.capacity ||
          latest.livestock.feed + carried >= GAME_CONFIG.poultryFeedTarget ||
          latest.barn.corn - 1 <= 0
        ) {
          this.setStage(runtime, "care-to-feed", "餌箱へまとめて運搬中");
        }
        return;
      }
      case "care-to-feed":
        if (this.move(runtime, FEED_TROUGH, delta)) {
          this.setStage(runtime, "care-unloading-feed", "餌箱へまとめて補充中");
        }
        return;
      case "care-unloading-feed": {
        const latest = this.getState();
        const current = latest.workers.poultryCaretaker;
        if (current.carried <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
          return;
        }
        if (latest.livestock.feed >= latest.livestock.feedCapacity) {
          this.setStage(runtime, "care-return-corn", "余った餌を倉庫へ戻します");
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.poultryCaretakerUnloadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const remaining = current.carried - 1;
        const nextState = this.patchWorker(latest, "poultry-caretaker", {
          carried: remaining,
          resource: remaining > 0 ? "corn" : null,
          status:
            remaining > 0
              ? `餌箱へまとめて補充中 ${remaining}個`
              : "次の作業を確認中",
        });
        this.setState({
          ...nextState,
          livestock: {
            ...nextState.livestock,
            feed: nextState.livestock.feed + 1,
          },
        });
        if (remaining <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
        }
        return;
      }
      case "care-return-corn":
        if (this.move(runtime, BARN, delta)) {
          this.setStage(runtime, "care-returning-corn", "余った餌を倉庫へ返却中");
        }
        return;
      case "care-returning-corn": {
        const latest = this.getState();
        const current = latest.workers.poultryCaretaker;
        if (current.carried <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.poultryCaretakerUnloadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const remaining = current.carried - 1;
        const nextState = this.patchWorker(latest, "poultry-caretaker", {
          carried: remaining,
          resource: remaining > 0 ? "corn" : null,
          status: remaining > 0 ? "余った餌を倉庫へ返却中" : "次の作業を確認中",
        });
        this.setState({
          ...nextState,
          barn: { ...nextState.barn, corn: nextState.barn.corn + 1 },
        });
        if (remaining <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
        }
        return;
      }
      case "care-to-eggs":
        if (this.move(runtime, EGG_STORAGE, delta)) {
          this.setStage(runtime, "care-loading-eggs", "卵をまとめて回収中");
        }
        return;
      case "care-loading-eggs": {
        const latest = this.getState();
        const current = latest.workers.poultryCaretaker;
        const loadable = getEggCollectionBatchAmount(
          latest.livestock.eggs,
          Math.max(0, parameters.capacity - current.carried),
        );
        if (loadable <= 0) {
          this.setStage(
            runtime,
            current.carried > 0 ? "care-to-barn-eggs" : "care-select",
            current.carried > 0
              ? "卵を倉庫へまとめて運搬中"
              : "次の作業を確認中",
          );
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.poultryCaretakerLoadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const carried = current.carried + 1;
        const nextState = this.patchWorker(latest, "poultry-caretaker", {
          carried,
          resource: "egg",
          status: `卵をまとめて回収中 ${carried}/${parameters.capacity}`,
        });
        this.setState({
          ...nextState,
          livestock: {
            ...nextState.livestock,
            eggs: nextState.livestock.eggs - 1,
          },
        });
        if (carried >= parameters.capacity || latest.livestock.eggs - 1 <= 0) {
          this.setStage(runtime, "care-to-barn-eggs", "卵を倉庫へまとめて運搬中");
        }
        return;
      }
      case "care-to-barn-eggs":
        if (this.move(runtime, BARN, delta)) {
          this.setStage(runtime, "care-unloading-eggs", "卵を倉庫へまとめて納品中");
        }
        return;
      case "care-unloading-eggs": {
        const latest = this.getState();
        const current = latest.workers.poultryCaretaker;
        if (current.carried <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
          return;
        }
        runtime.timer += delta;
        const interval =
          GAME_CONFIG.poultryCaretakerUnloadIntervalMs *
          parameters.operationIntervalMultiplier;
        if (runtime.timer < interval) return;
        runtime.timer -= interval;
        const remaining = current.carried - 1;
        const nextState = this.patchWorker(latest, "poultry-caretaker", {
          carried: remaining,
          resource: remaining > 0 ? "egg" : null,
          status:
            remaining > 0
              ? `卵を倉庫へまとめて納品中 ${remaining}個`
              : "次の作業を確認中",
        });
        this.setState({
          ...nextState,
          barn: { ...nextState.barn, egg: nextState.barn.egg + 1 },
        });
        if (remaining <= 0) {
          runtime.task = null;
          this.setStage(runtime, "care-select", "次の作業を確認中");
        }
        return;
      }
      default:
        return;
    }
  }

  private isReadyCorn(node: CornNode | undefined): node is CornNode {
    return Boolean(node?.visible && node.model.state === "ready");
  }

  private findNearestReadyCorn(x: number, y: number): CornNode | undefined {
    const stored = this.scene.data.get("corn-nodes");
    const nodes = Array.isArray(stored) ? (stored as CornNode[]) : [];
    let nearest: CornNode | undefined;
    let best = Number.POSITIVE_INFINITY;
    for (const node of nodes) {
      if (!this.isReadyCorn(node)) continue;
      const distance = Phaser.Math.Distance.Squared(x, y, node.x, node.y);
      if (distance < best) {
        best = distance;
        nearest = node;
      }
    }
    return nearest;
  }

  private move(
    runtime: Runtime,
    target: { x: number; y: number },
    delta: number,
  ): boolean {
    const level = this.getWorker(this.getState(), runtime.role).level;
    const baseSpeed =
      runtime.role === "corn-harvester"
        ? GAME_CONFIG.cornHarvestWorkerMoveSpeed
        : runtime.role === "corn-transporter"
          ? GAME_CONFIG.cornTransportWorkerMoveSpeed
          : GAME_CONFIG.poultryCaretakerMoveSpeed;
    const speed =
      baseSpeed *
      getWorkerParametersForLevel(runtime.role, level).moveSpeedMultiplier;
    const dx = target.x - runtime.body.x;
    const dy = target.y - runtime.body.y;
    const distance = Math.hypot(dx, dy);
    const step = (speed * delta) / 1000;
    if (distance <= step || distance === 0) {
      runtime.body.setPosition(target.x, target.y).setDepth(target.y);
      return true;
    }
    runtime.body.x += (dx / distance) * step;
    runtime.body.y += (dy / distance) * step;
    runtime.body.setDepth(runtime.body.y);
    return false;
  }

  private setStage(runtime: Runtime, stage: RuntimeStage, status: string): void {
    runtime.stage = stage;
    runtime.timer = 0;
    runtime.waitTimer = 0;
    this.setWorkerStatus(runtime.role, status);
  }

  private setWorkerStatus(role: AutomationRole, status: string): void {
    const state = this.getState();
    if (this.getWorker(state, role).status === status) return;
    this.setState(this.patchWorker(state, role, { status }));
  }

  private getWorker(state: GameState, role: AutomationRole) {
    return state.workers[STATE_KEY[role]];
  }

  private patchWorker(
    state: GameState,
    role: AutomationRole,
    patch: WorkerPatch,
  ): GameState {
    if (role === "corn-harvester") {
      const current = state.workers.cornHarvestWorker;
      return {
        ...state,
        workers: {
          ...state.workers,
          cornHarvestWorker: {
            hired: patch.hired ?? current.hired,
            level: patch.level ?? current.level,
            carried: patch.carried ?? current.carried,
            status: patch.status ?? current.status,
          },
        },
      };
    }
    if (role === "corn-transporter") {
      const current = state.workers.cornTransportWorker;
      return {
        ...state,
        workers: {
          ...state.workers,
          cornTransportWorker: {
            hired: patch.hired ?? current.hired,
            level: patch.level ?? current.level,
            carried: patch.carried ?? current.carried,
            status: patch.status ?? current.status,
          },
        },
      };
    }
    const current = state.workers.poultryCaretaker;
    return {
      ...state,
      workers: {
        ...state.workers,
        poultryCaretaker: {
          hired: patch.hired ?? current.hired,
          level: patch.level ?? current.level,
          resource:
            patch.resource === undefined ? current.resource : patch.resource,
          carried: patch.carried ?? current.carried,
          status: patch.status ?? current.status,
        },
      },
    };
  }

  private updateCargoArt(runtime: Runtime): void {
    const state = this.getState();
    const worker = this.getWorker(state, runtime.role);
    const resource =
      runtime.role === "poultry-caretaker"
        ? state.workers.poultryCaretaker.resource
        : "corn";
    const graphics = runtime.cargoArt.clear();
    if (worker.carried <= 0 || resource === null) return;

    graphics.lineStyle(2, palette.outline);
    for (let index = 0; index < Math.min(worker.carried, 10); index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = -10 + column * 10;
      const y = 20 - row * 9;
      if (resource === "egg") {
        graphics
          .fillStyle(palette.cream)
          .fillEllipse(x, y, 8, 10)
          .strokeEllipse(x, y, 8, 10);
      } else {
        graphics
          .fillStyle(0xf2c84b)
          .fillEllipse(x, y, 8, 13)
          .strokeEllipse(x, y, 8, 13)
          .lineStyle(2, palette.foliage)
          .lineBetween(x - 3, y + 4, x - 6, y - 5)
          .lineBetween(x + 3, y + 4, x + 6, y - 5)
          .lineStyle(2, palette.outline);
      }
    }
  }

  private isAutomationRole(role: WorkerRoleId | undefined): role is AutomationRole {
    return (
      role === "corn-harvester" ||
      role === "corn-transporter" ||
      role === "poultry-caretaker"
    );
  }

  private destroy(): void {
    for (const runtime of this.runtimes.values()) runtime.body.destroy();
    this.runtimes.clear();
  }
}
