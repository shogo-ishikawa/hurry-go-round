import Phaser from "phaser";
import type { Farmer } from "../entities/Farmer";
import { CollectionCourierEntity } from "../entities/CollectionCourierEntity";
import { INTERACTIONS, type InteractionId } from "../logic/facilities";
import {
  COLLECTION_BARN_POINT,
  COLLECTION_FACILITIES,
  type CollectionFacilityId,
} from "../config/collectionFacilities";
import {
  advanceCollectionConstruction,
  buildCollectionFacility,
  COLLECTION_SOURCES,
  depositPlayerResourceBatch,
  executeCollectionCommand,
  getCollectionFacilityAvailability,
  loadCourierOne,
  selectCollectionSource,
  selectCourierDestination,
  shouldCourierDepart,
  unloadCourierToBarnOne,
  unloadCourierToIntakeOne,
  withdrawPlayerResourceBatch,
  type CollectionCommand,
} from "../logic/collectionNetwork";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import { CollectionFacilityView } from "./CollectionFacilityView";

const total = (amounts: GameState["barn"]): number =>
  Object.values(amounts).reduce((sum, value) => sum + value, 0);

export class CollectionNetworkSystem {
  private readonly view: CollectionFacilityView;
  private readonly courier: CollectionCourierEntity;
  private construction = {
    facilityId: null as Exclude<CollectionFacilityId, "processing-intake"> | null,
    holdMs: 0,
    armed: true,
    lastAvailabilitySignature: "",
  };
  private readonly transferArmed = new Map<InteractionId, boolean>();
  private runtimeMs = 0;
  private panelInRange = false;
  private commandCount = 0;
  private changedCommandCount = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly farmer: Farmer,
    private readonly getState: () => GameState,
    private readonly setState: (state: GameState) => void,
    private readonly actionKey: Phaser.Input.Keyboard.Key,
    private readonly spaceKey: Phaser.Input.Keyboard.Key,
  ) {
    this.view = new CollectionFacilityView(scene);
    const hub = COLLECTION_FACILITIES.hub.courierPickupPoint;
    this.courier = new CollectionCourierEntity(scene, hub.x, hub.y);
    scene.game.events.on(
      GAME_EVENTS.collectionAction,
      this.handlePanelAction,
      this,
    );
  }

  update(delta: number): void {
    this.view.update(this.getState());
    this.updateConstruction(delta);
    this.updatePlayerTransfer(delta);
    this.updatePanel();
    this.updateCourier(delta);
  }

  advanceForE2E(deltaMs: number, stepMs = 50): void {
    let remaining = Math.max(0, Math.min(180000, Math.floor(deltaMs)));
    const step = Math.max(1, Math.min(250, Math.floor(stepMs)));
    while (remaining > 0) {
      const delta = Math.min(step, remaining);
      this.update(delta);
      remaining -= delta;
    }
  }

  getDiagnostics() {
    const state = this.getState();
    const network = state.collectionNetwork;
    const facilities = Object.fromEntries(
      (["hub", "wheat", "corn", "egg", "processing-intake"] as const).map(
        (id) => {
          const availability = getCollectionFacilityAvailability(id, state);
          return [
            id,
            {
              visible: availability.visible,
              built: availability.built,
              state: availability.state,
              missingPrerequisites: [...availability.missingPrerequisites],
            },
          ];
        },
      ),
    );

    return {
      walletCoins: state.economy.walletCoins,
      hubBuilt: network.hubBuilt,
      facilities,
      boxes: {
        wheat: {
          built: network.boxes.wheat.built,
          amount: network.boxes.wheat.amounts.wheat,
        },
        corn: {
          built: network.boxes.corn.built,
          amount: network.boxes.corn.amounts.corn,
        },
        egg: {
          built: network.boxes.egg.built,
          amount: network.boxes.egg.amounts.egg,
        },
      },
      cargo: { ...state.cargo.amounts },
      cargoCapacity: state.cargo.capacity,
      construction: { ...this.construction },
      barn: { ...state.barn },
      processingIntake: { ...network.processingIntake.amounts },
      routingMode: network.routingMode,
      courier: { ...network.courier, carried: { ...network.courier.carried } },
      lastServedSourceId: network.lastServedSourceId,
      commandCount: this.commandCount,
      changedCommandCount: this.changedCommandCount,
      courierPosition: { ...this.courier.position },
    };
  }

  private inside(id: InteractionId): boolean {
    const interaction = INTERACTIONS.find((value) => value.id === id);
    if (!interaction) throw new Error(`Missing interaction ${id}`);
    return (
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        interaction.center.x,
        interaction.center.y,
      ) <= interaction.radius
    );
  }

  private publish(priority = false): void {
    this.scene.game.events.emit(GAME_EVENTS.state, this.getState());
    this.scene.game.events.emit(
      GAME_EVENTS.dirty,
      priority ? "priority" : undefined,
    );
  }

  private updateConstruction(delta: number): void {
    let facility: Exclude<CollectionFacilityId, "processing-intake"> | null =
      null;
    for (const id of ["hub", "wheat", "corn", "egg"] as const) {
      const interaction = COLLECTION_FACILITIES[id].buildInteractionId;
      if (interaction && this.inside(interaction)) {
        facility = id;
        break;
      }
    }

    if (!facility) {
      this.construction = {
        facilityId: null,
        holdMs: 0,
        armed: true,
        lastAvailabilitySignature: "",
      };
      return;
    }

    const state = this.getState();
    const availability = getCollectionFacilityAvailability(facility, state);

    // The hub build pad and management-panel interaction intentionally share
    // one world location. Do not consume E/Space for construction after the
    // hub is built (or while construction is unavailable), because the same E
    // press must remain available to open the management panel.
    const explicitActivation =
      availability.available &&
      (Phaser.Input.Keyboard.JustDown(this.actionKey) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey));

    const step = advanceCollectionConstruction(
      this.construction,
      facility,
      state,
      delta,
      explicitActivation,
    );
    this.construction = step.runtime;

    if (!step.availability.available) {
      const message = step.availability.built
        ? "建設済みです"
        : step.availability.missingPrerequisites.length
          ? `${step.availability.definition.publicName}\n前提条件を満たすと建設できます`
          : `${step.availability.definition.publicName}\nあと${step.availability.missingCoins}コイン必要です`;
      this.scene.game.events.emit(GAME_EVENTS.hint, message);
      return;
    }

    this.scene.game.events.emit(
      GAME_EVENTS.hint,
      `${step.availability.definition.publicName}　${step.availability.definition.cost}コイン　${Math.round(this.construction.holdMs / 12)}%`,
    );
    if (!step.execute) return;

    const result = buildCollectionFacility(this.getState(), facility);
    this.scene.game.events.emit(GAME_EVENTS.collectionResult, result);
    this.scene.game.events.emit(GAME_EVENTS.hint, result.message);
    if (result.changed) {
      this.setState(result.state);
      this.publish(result.prioritySaveRequested);
    }
  }

  private updatePlayerTransfer(_delta: number): void {
    const candidates: Array<{
      id: InteractionId;
      source: (typeof COLLECTION_SOURCES)[number];
      direction: "deposit" | "withdraw";
      distance: number;
    }> = [];

    for (const source of COLLECTION_SOURCES) {
      const definition = COLLECTION_FACILITIES[source];
      for (const [direction, id] of [
        ["deposit", definition.depositInteractionId],
        ["withdraw", definition.withdrawInteractionId],
      ] as const) {
        if (!id) continue;
        const interaction = INTERACTIONS.find((value) => value.id === id);
        if (!interaction) throw new Error(`Missing interaction ${id}`);
        const distance = Phaser.Math.Distance.Between(
          this.farmer.x,
          this.farmer.y,
          interaction.center.x,
          interaction.center.y,
        );
        if (distance <= interaction.radius) {
          candidates.push({ id, source, direction, distance });
        } else {
          this.transferArmed.set(id, true);
        }
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const active = candidates[0];
    if (!active || this.transferArmed.get(active.id) === false) return;

    this.transferArmed.set(active.id, false);
    const state = this.getState();
    const box = state.collectionNetwork.boxes[active.source];
    if (!box.built) return;

    if (active.direction === "deposit") {
      const result = depositPlayerResourceBatch(
        state.cargo.amounts,
        active.source,
        box,
      );
      if (!result.changed) return;
      const cargo = { ...state.cargo, amounts: result.cargo };
      this.setState({
        ...state,
        cargo,
        collectionNetwork: {
          ...state.collectionNetwork,
          boxes: {
            ...state.collectionNetwork.boxes,
            [active.source]: result.box,
          },
        },
      });
      this.finishPlayerTransfer(
        active.source,
        active.direction,
        result.moved,
        cargo,
      );
      return;
    }

    const result = withdrawPlayerResourceBatch(
      state.cargo,
      active.source,
      box,
    );
    if (!result.changed) return;
    this.setState({
      ...state,
      cargo: result.cargo,
      collectionNetwork: {
        ...state.collectionNetwork,
        boxes: {
          ...state.collectionNetwork.boxes,
          [active.source]: result.box,
        },
      },
    });
    this.finishPlayerTransfer(
      active.source,
      active.direction,
      result.moved,
      result.cargo,
    );
  }

  private finishPlayerTransfer(
    source: (typeof COLLECTION_SOURCES)[number],
    direction: "deposit" | "withdraw",
    moved: number,
    cargo: GameState["cargo"],
  ): void {
    this.farmer.setCargo(cargo.amounts, cargo.capacity);
    this.view.showTransfer(source, direction, moved);
    const name =
      source === "wheat"
        ? "麦"
        : source === "corn"
          ? "とうもろこし"
          : "たまご";
    this.scene.game.events.emit(
      GAME_EVENTS.hint,
      `${name}を${moved}個${direction === "deposit" ? "預けました" : "取り出しました"}`,
    );
    this.publish(true);
  }

  private updateCourier(delta: number): void {
    let state = this.getState();
    let network = state.collectionNetwork;
    let courier = network.courier;

    this.courier.setVisible(courier.hired);
    this.courier.setLoad(courier.carried, courier.capacity);
    if (!courier.hired) return;

    network = {
      ...network,
      sourceAgesMs: {
        ...network.sourceAgesMs,
        wheat:
          network.sourceAgesMs.wheat +
          (network.boxes.wheat.amounts.wheat > 0 ? delta : 0),
        corn:
          network.sourceAgesMs.corn +
          (network.boxes.corn.amounts.corn > 0 ? delta : 0),
        egg:
          network.sourceAgesMs.egg +
          (network.boxes.egg.amounts.egg > 0 ? delta : 0),
      },
    };

    this.runtimeMs -= delta;
    const target =
      courier.stage === "moving-to-source" && courier.sourceId
        ? COLLECTION_FACILITIES[courier.sourceId].courierPickupPoint
        : courier.stage === "moving-to-processing"
          ? COLLECTION_FACILITIES["processing-intake"].courierPickupPoint
          : courier.stage === "moving-to-barn"
            ? COLLECTION_BARN_POINT
            : courier.stage === "returning-to-hub"
              ? COLLECTION_FACILITIES.hub.courierPickupPoint
              : null;

    if (target) {
      const position = this.courier.position;
      const speed = ((90 + courier.level * 18) * delta) / 1000;
      const distance = Phaser.Math.Distance.Between(
        position.x,
        position.y,
        target.x,
        target.y,
      );
      const ratio = Math.min(1, speed / Math.max(1, distance));
      this.courier.setPosition(
        Phaser.Math.Linear(position.x, target.x, ratio),
        Phaser.Math.Linear(position.y, target.y, ratio),
      );
      if (distance < 12) {
        courier = {
          ...courier,
          stage:
            courier.stage === "moving-to-source"
              ? "loading"
              : courier.stage === "moving-to-processing"
                ? "unloading-processing"
                : courier.stage === "moving-to-barn"
                  ? "unloading-barn"
                  : "select-source",
        };
      }
    }

    if (this.runtimeMs <= 0) {
      this.runtimeMs = Math.max(90, 260 - courier.level * 45);
      if (
        courier.stage === "idle-at-hub" ||
        courier.stage === "select-source"
      ) {
        const source = selectCollectionSource(
          network.boxes,
          network.sourceAgesMs,
          {},
          courier.sourceRoundRobinIndex,
        );
        courier = source
          ? { ...courier, sourceId: source, stage: "moving-to-source" }
          : { ...courier, stage: "idle-at-hub" };
      } else if (courier.stage === "loading" && courier.sourceId) {
        const source = courier.sourceId;
        const loaded = loadCourierOne(
          network.boxes[source],
          courier,
          source,
        );
        if (loaded.changed) {
          network = {
            ...network,
            boxes: { ...network.boxes, [source]: loaded.box },
          };
          courier = loaded.courier;
        }
        const carried = total(courier.carried);
        const remaining = network.boxes[source].amounts[source];
        if (
          shouldCourierDepart(
            carried,
            courier.capacity,
            remaining,
            courier.waitMs,
          )
        ) {
          courier = { ...courier, stage: "select-destination" };
        } else {
          courier = { ...courier, stage: "waiting-for-batch", waitMs: 0 };
        }
      } else if (courier.stage === "waiting-for-batch") {
        courier = {
          ...courier,
          waitMs: courier.waitMs + Math.max(90, 260 - courier.level * 45),
          stage:
            courier.sourceId &&
            network.boxes[courier.sourceId].amounts[courier.sourceId] > 0
              ? "loading"
              : "select-destination",
        };
      } else if (courier.stage === "select-destination") {
        const resource = COLLECTION_SOURCES.find(
          (value) => courier.carried[value] > 0,
        );
        if (resource) {
          const key = resource === "egg" ? "bakery" : "mill";
          const machine = state.processing[key];
          const destination = selectCourierDestination(
            resource,
            network.routingMode,
            {
              intakeAmount: total(network.processingIntake.amounts),
              intakeCapacity: network.processingIntake.capacity,
              millBuilt: state.processing.land.millBuilt,
              bakeryBuilt: state.processing.land.bakeryBuilt,
              processingEnabled: machine.enabled,
              machineInputHasSpace:
                total(machine.input.amounts) < machine.input.capacity,
              needed: true,
            },
          );
          courier = {
            ...courier,
            destinationId: destination,
            stage:
              destination === "barn"
                ? "moving-to-barn"
                : "moving-to-processing",
          };
        }
      } else if (courier.stage === "unloading-processing") {
        const unloaded = unloadCourierToIntakeOne(
          courier,
          network.processingIntake,
        );
        if (unloaded.changed) {
          courier = unloaded.courier;
          network = { ...network, processingIntake: unloaded.intake };
        } else {
          courier = {
            ...courier,
            destinationId: "barn",
            stage: "moving-to-barn",
          };
        }
        if (total(courier.carried) === 0) {
          courier = this.finishRoute(courier, network);
        }
      } else if (courier.stage === "unloading-barn") {
        const unloaded = unloadCourierToBarnOne(courier, state.barn);
        if (unloaded.changed) {
          courier = unloaded.courier;
          state = { ...state, barn: unloaded.destination };
        }
        if (total(courier.carried) === 0) {
          courier = this.finishRoute(courier, network);
        }
      }
    }

    this.setState({
      ...state,
      collectionNetwork: { ...network, courier },
    });
  }

  private finishRoute(
    courier: GameState["collectionNetwork"]["courier"],
    network: GameState["collectionNetwork"],
  ): typeof courier {
    const source = courier.sourceId;
    if (source) {
      network.sourceAgesMs = { ...network.sourceAgesMs, [source]: 0 };
      network.lastServedSourceId = source;
    }
    return {
      ...courier,
      stage: "returning-to-hub",
      destinationId: null,
      sourceId: null,
      waitMs: 0,
      sourceRoundRobinIndex: (courier.sourceRoundRobinIndex + 1) % 3,
    };
  }

  private updatePanel(): void {
    const visible =
      this.getState().collectionNetwork.hubBuilt &&
      this.inside("open-collection-panel");
    if (visible !== this.panelInRange) {
      this.panelInRange = visible;
      this.scene.game.events.emit(GAME_EVENTS.collectionRange, visible);
    }
    if (visible && Phaser.Input.Keyboard.JustDown(this.actionKey)) {
      this.scene.game.events.emit(GAME_EVENTS.collectionOpen);
    }
  }

  private handlePanelAction = (command: CollectionCommand): void => {
    this.commandCount += 1;
    const result = executeCollectionCommand(this.getState(), command);
    if (result.changed) {
      this.changedCommandCount += 1;
      this.setState(result.state);
      this.publish(result.prioritySaveRequested);
    }
    this.scene.game.events.emit(GAME_EVENTS.collectionResult, result);
  };

  destroy(): void {
    this.scene.game.events.off(
      GAME_EVENTS.collectionAction,
      this.handlePanelAction,
      this,
    );
    this.view.destroy();
    this.courier.destroy();
  }
}
