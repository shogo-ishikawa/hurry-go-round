import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { Customer } from "../entities/Customer";
import { MarketStall } from "../entities/MarketStall";
import { collectAllTillCoins } from "../logic/economy";
import { getUnlockedCustomerResources, restockMarketResourceOne, sellRequestedResource } from "../logic/multiResourceMarket";
import { RESOURCE_IDS, type ResourceId } from "../config/resourceDefinitions";
import { canFrontBuy, canSpawn } from "../logic/customerQueue";
import type { Farmer } from "../entities/Farmer";
import { GAME_EVENTS, type GameState } from "../state/GameState";
import { palette } from "../art/palette";
import { UI_TEXT } from "../config/localization";
import { hasCustomerPatienceExpired, resetStockoutWait, startOrAdvanceStockoutWait } from "../logic/customerPatience";

export class MarketSystem {
  private stall: MarketStall;
  private customers: Customer[] = [];
  private queue: Customer[] = [];
  private nextId = 0;
  private spawnTimer = 1200;
  private restockTimer = 0;
  private purchaseTimer = 0;
  private cashArmed = true;
  private restockIndex = 0;
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
    this.stall.updateDisplay(s.market, s.economy.tillCoins);
  }
  private updateRestock(delta: number): void {
    this.restockTimer = Math.max(0, this.restockTimer - delta);
    const s = this.getState();
    if (this.restockTimer > 0) return;
    let chosen: ResourceId | null = null;
    for (let offset = 0; offset < RESOURCE_IDS.length; offset++) { const index = (this.restockIndex + offset) % RESOURCE_IDS.length; const resource = RESOURCE_IDS[index]!; if (s.barn[resource] > 0 && s.market[resource] < s.marketCapacity[resource]) { chosen = resource; this.restockIndex = (index + 1) % RESOURCE_IDS.length; break; } }
    if (!chosen) return;
    const result = restockMarketResourceOne(chosen, s.barn, s.market, s.marketCapacity);
    if (!result.changed) return;
    const inventory = chosen === "wheat" ? { ...s.inventory, barn: result.barn.wheat, market: result.market.wheat } : s.inventory;
    this.setState({ ...s, barn: result.barn, market: result.market, inventory });
    this.restockTimer = GAME_CONFIG.marketRestockIntervalMs;
    this.transferDot(
      1510,
      500,
      this.stall.shelfPoint().x,
      this.stall.shelfPoint().y,
      chosen === "corn" ? 0xf2c84b : chosen === "egg" ? palette.cream : palette.wheat,
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
        const available = getUnlockedCustomerResources(this.getState().landExpansion.eastCornFieldUnlocked, this.getState().landExpansion.southChickenCoopUnlocked);
        c.setRequestedResource(available[c.id % available.length] ?? "wheat");
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
      } else if (c.phase === "queueing" || c.phase === "buying" || c.phase === "waiting-stock") {
        const index = this.queue.indexOf(c);
        const slot = this.queueSlots[index];
        if (slot) c.moveToward(slot, delta);
      } else c.moveToward(this.exit, delta);
    }
    const front = this.queue[0];
    const state = this.getState();
    if (front) {
      const atFront =
        (front.phase === "buying" || front.phase === "waiting-stock") &&
        Phaser.Math.Distance.Between(
          front.x,
          front.y,
          this.queueSlots[0]?.x ?? 0,
          this.queueSlots[0]?.y ?? 0,
        ) < 8;
      const requestedStock = state.market[front.requestedResource];
      const stockout = atFront && requestedStock <= 0;
      front.showOutOfStock(stockout);
      front.patience = startOrAdvanceStockoutWait(front.patience, delta, { isFront: true, atPurchasePosition: atFront, stockAvailable: requestedStock > 0, purchased: front.purchased });
      if (stockout) { front.phase = "waiting-stock"; front.showPatience(1 - front.patience.stockoutWaitMs / front.patience.stockoutPatienceMs); }
      else if (front.phase === "waiting-stock") { front.phase = "buying"; front.patience = resetStockoutWait(front.patience); }
      if (stockout && hasCustomerPatienceExpired(front.patience)) { this.abandon(front); }
      if (
        atFront &&
        canFrontBuy(
          this.queue.map((c) => ({
            id: c.id,
            phase: c.phase,
            purchased: c.purchased,
          })),
          requestedStock,
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
        (c?.phase === "leaving" || c?.phase === "leaving-disappointed") &&
        Phaser.Math.Distance.Between(c.x, c.y, this.exit.x, this.exit.y) < 8
      ) {
        c.destroy();
        this.customers.splice(i, 1);
      }
    }
  }
  private abandon(customer: Customer): void {
    if (this.queue[0] !== customer || customer.purchased || customer.phase === "leaving-disappointed") return;
    const s = this.getState();
    this.queue.shift(); customer.phase = "leaving-disappointed"; customer.showOutOfStock(false); this.purchaseTimer = 0;
    for (let i = 0; i < this.queue.length; i++) this.queue[i]!.phase = i === 0 ? "buying" : "queueing";
    this.setState({ ...s, economy: { ...s.economy, customersLeftWithoutPurchase: (s.economy.customersLeftWithoutPurchase ?? 0) + 1 } });
    this.scene.game.events.emit("context-hint", UI_TEXT.messages.customerAbandoned);
  }
  private completeSale(customer: Customer): void {
    const s = this.getState();
    const result = sellRequestedResource(customer.requestedResource, s.market, s.economy.tillCoins, s.soldByResource, customer.purchased);
    if (!result.changed) return;
    customer.purchased = true;
    customer.giveBag(customer.requestedResource);
    customer.showOutOfStock(false);
    customer.phase = "leaving";
    this.queue.shift();
    for (let i = 0; i < this.queue.length; i++)
      if (this.queue[i]) this.queue[i]!.phase = i === 0 ? "buying" : "queueing";
    this.purchaseTimer = 0;
    this.setState({
      ...s,
      market: result.market,
      soldByResource: result.sold,
      inventory: customer.requestedResource === "wheat" ? { ...s.inventory, market: result.market.wheat } : s.inventory,
      economy: { ...s.economy, tillCoins: result.tillCoins, soldUnits: s.economy.soldUnits + 1, customersServed: s.economy.customersServed + 1 },
      firstSaleCompleted: true,
    });
    const shelf = this.stall.shelfPoint(),
      till = this.stall.tillPoint();
    this.transferDot(
      shelf.x,
      shelf.y,
      customer.x,
      customer.y - 40,
      customer.requestedResource === "corn" ? 0xf2c84b : customer.requestedResource === "egg" ? palette.cream : palette.wheat,
    );
    this.transferDot(customer.x, customer.y - 55, till.x, till.y, palette.coin);
    this.tutorial(5);
  }
  private updateCash(_delta: number): void {
    const s = this.getState();
    const near =
      Phaser.Math.Distance.Between(
        this.farmer.x,
        this.farmer.y,
        GAME_CONFIG.cash.x,
        GAME_CONFIG.cash.y,
      ) <= GAME_CONFIG.cash.radius;
    if (!near) { this.cashArmed=true; return; }
    if (s.economy.tillCoins <= 0) { this.cashArmed=true; return; }
    if(!this.cashArmed)return;
    this.cashArmed=false;
    const result = collectAllTillCoins(s.economy);
    if(!result.changed)return;
    this.setState({ ...s, economy:result.economy, firstCashCollected: true });
    const till = this.stall.tillPoint();
    this.transferDot(
      till.x,
      till.y,
      this.farmer.x,
      this.farmer.y - 50,
      palette.coin,
    );
    this.tutorial(6);
    this.scene.game.events.emit(GAME_EVENTS.hint,result.message);
    this.scene.game.events.emit(GAME_EVENTS.wallet);
    this.scene.game.events.emit(GAME_EVENTS.dirty,"priority");
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
