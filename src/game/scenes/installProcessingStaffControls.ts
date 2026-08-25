import Phaser from "phaser";
import {
  getProcessingWorkerHireCost,
  getProcessingWorkerTrainingCost,
  type ProcessingWorkerRole,
} from "../logic/processingWorkers";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import { UIScene } from "./UIScene";

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcessingStaffUiInternals {
  game: Phaser.Game;
  time: Phaser.Time.Clock;
  processingPage: number;
  lastState?: GameState;
  panelRect: PanelRect;
  overlay: Phaser.GameObjects.GameObject[];
  openProcessing: (pageOrResult?: number | string) => void;
  closeOverlay: () => void;
  addModalButton: (
    x: number,
    y: number,
    width: number,
    label: string,
    command: () => void,
    enabled?: boolean,
    reason?: string,
  ) => void;
  __hgrProcessingStaffControlsWrapped?: boolean;
}

interface PatchablePrototype {
  create(this: UIScene): void;
  __hgrProcessingStaffControlsInstalled?: boolean;
}

const staffDefinitions = [
  {
    role: "millOperator" as const,
    shortName: "製粉",
    machineBuilt: (state: GameState) => state.processing.land.millBuilt,
    worker: (state: GameState) => state.processing.millOperator,
  },
  {
    role: "baker" as const,
    shortName: "製パン",
    machineBuilt: (state: GameState) => state.processing.land.bakeryBuilt,
    worker: (state: GameState) => state.processing.baker,
  },
] as const;

function renderProcessingStaffControls(ui: ProcessingStaffUiInternals): void {
  if (ui.processingPage !== 5 || !ui.lastState || ui.overlay.length === 0) return;

  const state = ui.lastState;
  const gap = 8;
  const width = Math.max(112, Math.min(260, (ui.panelRect.width - 36 - gap) / 2));
  const y = ui.panelRect.y + ui.panelRect.height - 112;

  staffDefinitions.forEach((definition, index) => {
    const worker = definition.worker(state);
    const built = definition.machineBuilt(state);
    const cost = worker.hired
      ? getProcessingWorkerTrainingCost(definition.role, worker.level)
      : getProcessingWorkerHireCost(definition.role);
    const action: "hire" | "train" = worker.hired ? "train" : "hire";
    const label =
      cost === null
        ? `${definition.shortName} 最大`
        : `${definition.shortName} ${worker.hired ? "研修" : "雇用"} ${cost}`;
    const enabled = built && cost !== null && state.economy.walletCoins >= cost;
    const reason = !built
      ? "先に対応する設備を建設してください"
      : cost === null
        ? "最大レベルです"
        : state.economy.walletCoins < cost
          ? `あと ${cost - state.economy.walletCoins} コイン必要です`
          : undefined;
    const x =
      ui.panelRect.x +
      ui.panelRect.width / 2 +
      (index === 0 ? -(width + gap) / 2 : (width + gap) / 2);

    ui.addModalButton(
      x,
      y,
      width,
      label,
      () => {
        ui.game.events.emit(
          GAME_EVENTS.processingAction,
          definition.role satisfies ProcessingWorkerRole,
          action,
        );
        ui.closeOverlay();
        ui.time.delayedCall(0, () => ui.openProcessing(5));
      },
      enabled,
      reason,
    );
  });
}

const prototype = UIScene.prototype as unknown as PatchablePrototype;
if (!prototype.__hgrProcessingStaffControlsInstalled) {
  const originalCreate = prototype.create;
  prototype.create = function patchedCreate(this: UIScene): void {
    originalCreate.call(this);
    const ui = this as unknown as ProcessingStaffUiInternals;
    if (ui.__hgrProcessingStaffControlsWrapped) return;

    const originalOpenProcessing = ui.openProcessing;
    ui.game.events.off(GAME_EVENTS.processingOpen, originalOpenProcessing, this);

    const openProcessingWithStaffControls = (
      pageOrResult: number | string = "",
    ): void => {
      const overlayCountBefore = ui.overlay.length;
      originalOpenProcessing(pageOrResult);
      if (overlayCountBefore === 0 && ui.overlay.length > 0) {
        renderProcessingStaffControls(ui);
      }
    };

    ui.openProcessing = openProcessingWithStaffControls;
    ui.game.events.on(GAME_EVENTS.processingOpen, ui.openProcessing, this);
    ui.__hgrProcessingStaffControlsWrapped = true;
  };
  prototype.__hgrProcessingStaffControlsInstalled = true;
}
