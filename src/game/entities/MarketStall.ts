import Phaser from "phaser";
import { palette } from "../art/palette";
import type { ResourceAmounts } from "../config/resourceDefinitions";
export class MarketStall extends Phaser.GameObjects.Container {
  private stockArt: Phaser.GameObjects.Graphics;
  private cashArt: Phaser.GameObjects.Graphics;
  private multiplier: Phaser.GameObjects.Text;
  private displayedStock = "";
  private displayedTill = -1;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(14, 42, 330, 100, palette.shadow, 0.24);
    const art = scene.add.graphics();
    const stock = scene.add.graphics();
    const cash = scene.add.graphics();
    art
      .lineStyle(5, palette.outline)
      .fillStyle(palette.path)
      .fillRoundedRect(-155, -25, 310, 100, 16)
      .strokeRoundedRect(-155, -25, 310, 100, 16);
    art
      .fillStyle(palette.cream)
      .fillRoundedRect(-175, -150, 350, 75, 20)
      .strokeRoundedRect(-175, -150, 350, 75, 20);
    for (let i = 0; i < 5; i++)
      art
        .fillStyle(i % 2 ? palette.barn : palette.cream)
        .fillRect(-170 + i * 68, -145, 68, 65);
    art
      .fillStyle(palette.soilDark)
      .fillRoundedRect(-130, -68, 180, 55, 10)
      .strokeRoundedRect(-130, -68, 180, 55, 10);
    art
      .fillStyle(palette.creamDark)
      .fillRoundedRect(75, -55, 70, 55, 10)
      .strokeRoundedRect(75, -55, 70, 55, 10);
    const title = scene.add.text(-145, -190, "農場市場", {
      fontFamily: "system-ui",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#49382e",
    });
    const multiplier = scene.add.text(94, -48, "", {
      fontFamily: "system-ui",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#49382e",
    });
    super(scene, x, y, [shadow, art, stock, cash, title, multiplier]);
    this.stockArt = stock;
    this.cashArt = cash;
    this.multiplier = multiplier;
    scene.add.existing(this);
    this.setDepth(y + 90);
    this.updateDisplay({ wheat: 0, corn: 0, egg: 0 }, 0);
  }
  updateDisplay(stock: ResourceAmounts, till: number): void {
    const stockKey = `${stock.wheat}/${stock.corn}/${stock.egg}`;
    if (stockKey === this.displayedStock && till === this.displayedTill) return;
    this.displayedStock = stockKey;
    this.displayedTill = till;
    const s = this.stockArt.clear();
    const resources = ["wheat", "corn", "egg"] as const;
    for (let section = 0; section < resources.length; section++) for (let i = 0; i < 8; i++) {
      const resource = resources[section]!, x = -112 + (i % 4) * 20 + section * 78, y = -54 + Math.floor(i / 4) * 25;
      s.lineStyle(2, palette.outline, 0.5)
        .fillStyle(palette.soilDark, 0.22)
        .fillRoundedRect(x - 8, y - 8, 16, 16, 4).strokeRoundedRect(x - 8, y - 8, 16, 16, 4);
      if (i < stock[resource]) { const color = resource === "corn" ? 0xf2c84b : resource === "egg" ? palette.cream : palette.wheat; s.fillStyle(color).fillEllipse(x, y, 12, resource === "egg" ? 15 : 10).lineStyle(1, palette.outline).strokeEllipse(x, y, 12, resource === "egg" ? 15 : 10); }
    }
    const c = this.cashArt.clear();
    c.lineStyle(2, palette.outline, 0.5)
      .fillStyle(palette.creamDark)
      .fillEllipse(110, -18, 64, 22)
      .strokeEllipse(110, -18, 64, 22);
    const shown = Math.min(12, till);
    for (let i = 0; i < shown; i++)
      c.lineStyle(2, palette.coinDark)
        .fillStyle(palette.coin)
        .fillEllipse(88 + (i % 4) * 14, -22 - Math.floor(i / 4) * 7, 18, 8)
        .strokeEllipse(88 + (i % 4) * 14, -22 - Math.floor(i / 4) * 7, 18, 8);
    this.multiplier.setText(till > 12 ? `×${till}` : "");
  }
  shelfPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x - 50, this.y - 50);
  }
  tillPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x + 110, this.y - 20);
  }
}
