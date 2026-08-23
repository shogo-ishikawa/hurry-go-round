import Phaser from "phaser";
import type { Farmer } from "../entities/Farmer";
import { INTERACTIONS, type InteractionId } from "../logic/facilities";
import {
  advanceProductionCycle,
  buildProcessingMachine,
  collectManualOutputOne,
  getProcessingConstructionAvailability,
  purchaseProcessingYard,
  startProductionCycle,
  transferManualInputOne,
  type MachineId,
  type RecipeId,
} from "../logic/processing";
import type { GameState } from "../state/GameState";
import { GAME_EVENTS } from "../state/GameState";
import { routeIntakeResourceOne } from "../logic/collectionNetwork";
import { ProcessingFacilityView } from "./ProcessingFacilityView";
import { ProcessingWorkerSystem } from "./ProcessingWorkerSystem";

type TransferDirection = "input" | "output";
type TransferStationId =
  | "mill-input"
  | "mill-output"
  | "bakery-input"
  | "bakery-output";
type TransferOption = readonly [
  interaction: InteractionId,
  machine: MachineId,
  direction: TransferDirection,
  station: TransferStationId,
];

const TRANSFER_OPTIONS: readonly TransferOption[] = [
  ["transfer-mill-input", "grain-mill", "input", "mill-input"],
  ["collect-mill-output", "grain-mill", "output", "mill-output"],
  ["transfer-bakery-input", "bakery", "input", "bakery-input"],
  ["collect-bakery-output", "bakery", "output", "bakery-output"],
];

export class ProcessingSystem {
  private readonly view: ProcessingFacilityView;
  private readonly workers: ProcessingWorkerSystem;
  private holdId: InteractionId | null = null;
  private holdMs = 0;
  private transferCooldown = 0;
  private activeTransferInteraction: InteractionId | null = null;
  private panelInRange = false;
  private inputCursor: Record<MachineId, number> = {
    "grain-mill": 0,
    bakery: 0,
  };
  private outputCursor: Record<MachineId, number> = {
    "grain-mill": 0,
    bakery: 0,
  };
  private lastManualInputResource: string | null = null;
  private lastManualOutputResource: string | null = null;
  private constructionTransactionCount = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly farmer: Farmer,
    private readonly getState: () => GameState,
    private readonly setState: (state: GameState) => void,
    private readonly actionKey: Phaser.Input.Keyboard.Key,
  ) {
    this.view = new ProcessingFacilityView(scene);
    this.workers = new ProcessingWorkerSystem(scene);
    scene.game.events.on(
      GAME_EVENTS.processingAction,
      this.handlePanelAction,
      this,
    );
  }

  update(delta: number): void {
    let state = this.getState();
    const routed = routeIntakeResourceOne(
      state.collectionNetwork.processingIntake,
      state.processing.mill.input.amounts,
      state.processing.bakery.input.amounts,
      {
        mill:
          state.processing.land.millBuilt && state.processing.mill.enabled
            ? state.processing.mill.input.capacity
            : 0,
        bakery:
          state.processing.land.bakeryBuilt && state.processing.bakery.enabled
            ? state.processing.bakery.input.capacity
            : 0,
      },
    );

    if (routed.changed) {
      state = {
        ...state,
        collectionNetwork: {
          ...state.collectionNetwork,
          processingIntake: routed.intake,
        },
        processing: {
          ...state.processing,
          mill: {
            ...state.processing.mill,
            input: {
              ...state.processing.mill.input,
              amounts: routed.mill,
            },
          },
          bakery: {
            ...state.processing.bakery,
            input: {
              ...state.processing.bakery.input,
              amounts: routed.bakery,
            },
          },
        },
      };
    }

    let mill = advanceProductionCycle(state.processing.mill, delta).machine;
    let bakery = advanceProductionCycle(state.processing.bakery, delta).machine;
    mill = startProductionCycle(mill, "grain-mill", [
      "mill-flour",
      "mill-cornmeal",
    ]).machine;
    bakery = startProductionCycle(bakery, "bakery", [
      "bakery-bread",
      "bakery-cornbread",
    ]).machine;

    state = {
      ...state,
      processing: { ...state.processing, mill, bakery },
    };
    state = this.workers.update(state, delta);
    this.setState(state);
    this.view.update(state, delta);
    this.updateHold(delta);
    this.updateTransfers(delta);
    this.updatePanel();
  }

  private inside(id: InteractionId): boolean {
    const action = INTERACTIONS.find((item) => item.id === id);
    if (!action) throw new Error(`Missing interaction ${id}`);
    return (
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        action.center.x,
        action.center.y,
      ) <= action.radius
    );
  }

  private publish(priority = false): void {
    this.scene.game.events.emit(GAME_EVENTS.state, this.getState());
    this.scene.game.events.emit(
      GAME_EVENTS.dirty,
      priority ? "priority" : undefined,
    );
  }

  private updateHold(delta: number): void {
    const state = this.getState();
    const candidates: readonly [
      InteractionId,
      "processing-yard" | MachineId,
    ][] = [
      ["purchase-processing-yard", "processing-yard"],
      ["build-grain-mill", "grain-mill"],
      ["build-bakery", "bakery"],
    ];
    const selected = candidates.find(([id]) => this.inside(id));

    if (!selected) {
      this.holdId = null;
      this.holdMs = 0;
      return;
    }

    const [id, facility] = selected;
    const action = INTERACTIONS.find((item) => item.id === id);
    if (!action) throw new Error(`Missing interaction ${id}`);

    const availability = getProcessingConstructionAvailability(
      facility,
      state.processing.land,
      state.economy.walletCoins,
      state.landExpansion.eastCornFieldUnlocked,
      state.landExpansion.southChickenCoopUnlocked,
    );

    if (availability.built) {
      this.holdId = null;
      this.holdMs = 0;
      return;
    }

    if (!availability.available) {
      this.holdId = null;
      this.holdMs = 0;
      this.scene.game.events.emit(GAME_EVENTS.hint, availability.reason);
      return;
    }

    if (this.holdId !== id) {
      this.holdId = id;
      this.holdMs = 0;
    }

    this.holdMs += delta;
    this.scene.game.events.emit(
      GAME_EVENTS.hint,
      `${action.title}　${Math.min(
        100,
        Math.round((this.holdMs / (action.holdDurationMs ?? 1000)) * 100),
      )}%`,
    );

    if (this.holdMs < (action.holdDurationMs ?? 1000)) return;

    const current = this.getState();
    const result =
      facility === "processing-yard"
        ? purchaseProcessingYard(
            current.processing.land,
            current.economy.walletCoins,
            current.landExpansion.eastCornFieldUnlocked,
            current.landExpansion.southChickenCoopUnlocked,
          )
        : buildProcessingMachine(
            current.processing.land,
            facility,
            current.economy.walletCoins,
          );

    this.holdMs = 0;
    if (!result.ok) return;

    const machineKey =
      facility === "grain-mill"
        ? "mill"
        : facility === "bakery"
          ? "bakery"
          : null;
    this.constructionTransactionCount += 1;
    this.setState({
      ...current,
      economy: {
        ...current.economy,
        walletCoins: result.walletCoins,
      },
      processing: {
        ...current.processing,
        land: result.state,
        ...(machineKey
          ? {
              [machineKey]: {
                ...current.processing[machineKey],
                built: true,
                level: 1,
              },
            }
          : {}),
      },
    });
    this.publish(true);
  }

  private updateTransfers(delta: number): void {
    const state = this.getState();
    let selected: TransferOption | undefined;

    for (const option of TRANSFER_OPTIONS) {
      const [interaction, , , station] = option;
      const isInside = this.inside(interaction);
      this.view.setStationHighlighted(station, isInside);
      if (!selected && isInside) selected = option;
    }

    const selectedInteraction = selected?.[0] ?? null;
    if (selectedInteraction !== this.activeTransferInteraction) {
      this.activeTransferInteraction = selectedInteraction;
      this.transferCooldown = 0;
    }

    if (!selected) {
      this.transferCooldown = 0;
      return;
    }

    this.transferCooldown = Math.max(0, this.transferCooldown - delta);
    if (this.transferCooldown > 0) return;

    const [interaction, id, direction] = selected;
    const key = id === "grain-mill" ? "mill" : "bakery";

    if (!state.processing[key].built) {
      this.scene.game.events.emit(
        GAME_EVENTS.hint,
        "先に設備を建設してください",
      );
      this.transferCooldown = 600;
      return;
    }

    const beforeCargo = state.cargo.amounts;
    const directionCursor =
      direction === "input" ? this.inputCursor[id] : this.outputCursor[id];
    const result =
      direction === "input"
        ? transferManualInputOne(
            state.processing[key],
            id,
            state.cargo,
            directionCursor,
          )
        : collectManualOutputOne(
            state.processing[key],
            id,
            state.cargo,
            directionCursor,
          );

    if (result.changed) {
      if (direction === "input") {
        this.inputCursor[id] = result.nextCursor;
        this.lastManualInputResource = result.resource;
      } else {
        this.outputCursor[id] = result.nextCursor;
        this.lastManualOutputResource = result.resource;
      }

      this.setState({
        ...state,
        cargo: result.cargo,
        processing: {
          ...state.processing,
          [key]: result.machine,
        },
      });
      this.transferCooldown = 160;
      this.scene.game.events.emit(
        GAME_EVENTS.hint,
        `${direction === "input" ? "搬入中　" : "回収中　"}${
          result.resource
        }\n持ち物 ${beforeCargo[result.resource]} → ${
          result.cargo.amounts[result.resource]
        }`,
      );
      this.publish();
      return;
    }

    const reason =
      result.reason === "buffer-full"
        ? `${id === "grain-mill" ? "製粉機" : "ベーカリー"}の原料置き場が満杯です`
        : result.reason === "cargo-full"
          ? "持ち物がいっぱいです"
          : direction === "input"
            ? "対応する原料を持っていません"
            : "完成品はまだありません";
    this.scene.game.events.emit(GAME_EVENTS.hint, reason);
    this.transferCooldown = 600;
  }

  private updatePanel(): void {
    const visible =
      this.getState().processing.land.yardUnlocked &&
      this.inside("open-processing-panel");
    if (visible !== this.panelInRange) {
      this.panelInRange = visible;
      this.scene.game.events.emit(GAME_EVENTS.processingRange, visible);
    }
    if (visible && Phaser.Input.Keyboard.JustDown(this.actionKey)) {
      this.scene.game.events.emit(GAME_EVENTS.state, this.getState());
      this.scene.game.events.emit(GAME_EVENTS.processingOpen);
    }
  }

  private handlePanelAction = (
    machine: MachineId,
    mode: "auto" | "stop" | RecipeId,
  ): void => {
    const state = this.getState();
    const key = machine === "grain-mill" ? "mill" : "bakery";
    const current = state.processing[key];
    this.setState({
      ...state,
      processing: {
        ...state.processing,
        [key]: {
          ...current,
          enabled: mode !== "stop",
          selectedMode: mode === "stop" ? current.selectedMode : mode,
        },
      },
    });
    this.publish(true);
  };

  advanceForE2E(delta: number): void {
    this.update(delta);
  }

  getDiagnostics() {
    const state = this.getState();
    return {
      yardBuilt: state.processing.land.yardUnlocked,
      millBuilt: state.processing.land.millBuilt,
      bakeryBuilt: state.processing.land.bakeryBuilt,
      walletCoins: state.economy.walletCoins,
      playerCargo: { ...state.cargo.amounts },
      millInput: { ...state.processing.mill.input.amounts },
      millOutput: { ...state.processing.mill.output.amounts },
      millSelectedMode: state.processing.mill.selectedMode,
      millActiveRecipe:
        state.processing.mill.activeCycle?.recipeId ?? null,
      millRemainingTime:
        state.processing.mill.activeCycle?.remainingMs ?? 0,
      bakeryInput: { ...state.processing.bakery.input.amounts },
      bakeryOutput: { ...state.processing.bakery.output.amounts },
      bakerySelectedMode: state.processing.bakery.selectedMode,
      bakeryActiveRecipe:
        state.processing.bakery.activeCycle?.recipeId ?? null,
      bakeryRemainingTime:
        state.processing.bakery.activeCycle?.remainingMs ?? 0,
      lastManualInputResource: this.lastManualInputResource,
      lastManualOutputResource: this.lastManualOutputResource,
      constructionTransactionCount: this.constructionTransactionCount,
      activeTransferInteraction: this.activeTransferInteraction,
    };
  }

  destroy(): void {
    this.scene.game.events.off(
      GAME_EVENTS.processingAction,
      this.handlePanelAction,
      this,
    );
    this.view.destroy();
    this.workers.destroy();
  }
}
