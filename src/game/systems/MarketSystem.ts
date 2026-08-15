import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { Customer } from "../entities/Customer";
import { MarketStall } from "../entities/MarketStall";
import { collectTillCoin } from "../logic/economy";
import { restockMarketOne } from "../logic/inventory";
import { sellWheatToCustomer } from "../logic/market";
import { canFrontBuy, canSpawn } from "../logic/customerQueue";
import type { Farmer } from "../entities/Farmer";
import type { GameState } from "../state/GameState";
import { palette } from "../art/palette";

export class MarketSystem {
  private stall: MarketStall;
  private customers: Customer[] = [];
  private queue: Customer[] = [];
  private nextId = 0;
  private spawnTimer = 1200;
  private restockTimer = 0;
  private purchaseTimer = 0;
  private cashTimer = 0;
  private readonly entrance = new Phaser.Math.Vector2(1960, 900);
  private readonly exit = new Phaser.Math.Vector2(1980, 600);
  private readonly queueSlots = [
    new Phaser.Math.Vector2(1590, 830),
    new Phaser.Math.Vector2(1590, 920),
    new Phaser.Math.Vector2(1590, 1010),
    new Phaser.Math.Vector2(1590, 1100),
  ];
  constructor(
    private scene: Phaser.Scene,
    private farmer: Farmer,
    private getState: () => GameState,
    private setState: (state: GameState) => void,
    private tutorial: (stage: number) => void,
  ) {
    this.stall = new MarketStall(scene, 1640, 690);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }
  update(delta: number): void {
    this.updateRestock(delta);
    this.updateCustomers(delta);
    this.updateCash(delta);
    const s = this.getState();
    this.stall.updateDisplay(s.inventory.market, s.economy.tillCoins);
  }
  private updateRestock(delta: number): void {
    this.restockTimer = Math.max(0, this.restockTimer - delta);
    const s = this.getState();
    if (s.inventory.carried > 0) {
      this.restockTimer = GAME_CONFIG.marketRestockIntervalMs;
      return;
    }
    if (
      this.restockTimer > 0 ||
      s.inventory.barn <= 0 ||
      s.inventory.market >= s.inventory.marketCapacity
    )
      return;
    const inventory = restockMarketOne(s.inventory);
    if (inventory === s.inventory) return;
    this.setState({ ...s, inventory });
    this.restockTimer = GAME_CONFIG.marketRestockIntervalMs;
    this.transferDot(
      1510,
      500,
      this.stall.shelfPoint().x,
      this.stall.shelfPoint().y,
      palette.wheat,
    );
    this.tutorial(4);
  }
  private updateCustomers(delta: number): void {
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = GAME_CONFIG.customerSpawnIntervalMs;
      if (
        canSpawn(this.customers.length, GAME_CONFIG.maxActiveCustomers) &&
        this.queue.length +
          this.customers.filter((c) => c.phase === "entering").length <
          GAME_CONFIG.customerQueueCapacity
      ) {
        const c = new Customer(
          this.scene,
          this.nextId++,
          this.entrance.x,
          this.entrance.y,
        );
        this.customers.push(c);
      }
    }
    for (const c of this.customers) {
      if (c.phase === "entering") {
        const slot = this.queueSlots[Math.min(this.queue.length, 3)];
        if (slot && c.moveToward(slot, delta)) {
          this.queue.push(c);
          c.phase = this.queue.length === 1 ? "buying" : "queueing";
        }
      } else if (c.phase === "queueing" || c.phase === "buying") {
        const index = this.queue.indexOf(c);
        const slot = this.queueSlots[index];
        if (slot) c.moveToward(slot, delta);
      } else c.moveToward(this.exit, delta);
    }
    const front = this.queue[0];
    const state = this.getState();
    if (front) {
      const atFront =
        front.phase === "buying" &&
        Phaser.Math.Distance.Between(
          front.x,
          front.y,
          this.queueSlots[0]?.x ?? 0,
          this.queueSlots[0]?.y ?? 0,
        ) < 8;
      front.showOutOfStock(atFront && state.inventory.market === 0);
      if (
        atFront &&
        canFrontBuy(
          this.queue.map((c) => ({
            id: c.id,
            phase: c.phase,
            purchased: c.purchased,
          })),
          state.inventory.market,
        )
      ) {
        this.purchaseTimer += delta;
        if (this.purchaseTimer >= GAME_CONFIG.customerPurchaseDurationMs)
          this.completeSale(front);
      } else this.purchaseTimer = 0;
    }
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      if (
        c?.phase === "leaving" &&
        Phaser.Math.Distance.Between(c.x, c.y, this.exit.x, this.exit.y) < 8
      ) {
        c.destroy();
        this.customers.splice(i, 1);
      }
    }
  }
  private completeSale(customer: Customer): void {
    const s = this.getState();
    const result = sellWheatToCustomer(
      { inventory: s.inventory, economy: s.economy },
      customer.purchased,
    );
    if (!result.sold) return;
    customer.purchased = true;
    customer.giveBag();
    customer.showOutOfStock(false);
    customer.phase = "leaving";
    this.queue.shift();
    for (let i = 0; i < this.queue.length; i++)
      if (this.queue[i]) this.queue[i]!.phase = i === 0 ? "buying" : "queueing";
    this.purchaseTimer = 0;
    this.setState({
      ...s,
      inventory: result.state.inventory,
      economy: result.state.economy,
      firstSaleCompleted: true,
    });
    const shelf = this.stall.shelfPoint(),
      till = this.stall.tillPoint();
    this.transferDot(
      shelf.x,
      shelf.y,
      customer.x,
      customer.y - 40,
      palette.wheat,
    );
    this.transferDot(customer.x, customer.y - 55, till.x, till.y, palette.coin);
    this.tutorial(5);
  }
  private updateCash(delta: number): void {
    const s = this.getState();
    const near =
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        GAME_CONFIG.cash.x,
        GAME_CONFIG.cash.y,
      ) <= GAME_CONFIG.cash.radius;
    if (!near || s.economy.tillCoins <= 0) {
      this.cashTimer = 0;
      return;
    }
    this.cashTimer += delta;
    if (this.cashTimer < GAME_CONFIG.cashPickupIntervalMs) return;
    this.cashTimer -= GAME_CONFIG.cashPickupIntervalMs;
    const economy = collectTillCoin(s.economy);
    this.setState({ ...s, economy, firstCashCollected: true });
    const till = this.stall.tillPoint();
    this.transferDot(
      till.x,
      till.y,
      this.farmer.x,
      this.farmer.y - 50,
      palette.coin,
    );
    this.tutorial(6);
  }
  private transferDot(
    x: number,
    y: number,
    toX: number,
    toY: number,
    color: number,
  ): void {
    const dot = this.scene.add
      .circle(x, y, 9, color)
      .setStrokeStyle(2, palette.outline)
      .setDepth(8000);
    this.scene.tweens.add({
      targets: dot,
      x: toX,
      y: toY,
      scale: 0.55,
      duration: 320,
      onComplete: () => dot.destroy(),
    });
  }
  private destroy(): void {
    for (const customer of this.customers) customer.destroy();
    this.customers = [];
    this.queue = [];
  }
}
