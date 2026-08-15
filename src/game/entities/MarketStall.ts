import Phaser from "phaser";
import { palette } from "../art/palette";

export class MarketStall extends Phaser.GameObjects.Container {
  private stockArt: Phaser.GameObjects.Graphics;
  private cashArt: Phaser.GameObjects.Graphics;
  private multiplier: Phaser.GameObjects.Text;
  private displayedStock = -1;
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
    for (let index = 0; index < 5; index += 1) {
      art
        .fillStyle(index % 2 ? palette.barn : palette.cream)
        .fillRect(-170 + index * 68, -145, 68, 65);
    }
    art
      .fillStyle(palette.soilDark)
      .fillRoundedRect(-130, -68, 180, 55, 10)
      .strokeRoundedRect(-130, -68, 180, 55, 10);
    art
      .fillStyle(palette.creamDark)
      .fillRoundedRect(75, -55, 70, 55, 10)
      .strokeRoundedRect(75, -55, 70, 55, 10);

    const title = scene.add.text(-145, -190, "農場直売所", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#49382e",
    });
    const shelfLabel = scene.add
      .text(-40, -100, "商品棚", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#fff4d8",
        backgroundColor: "#49382ed0",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    const tillLabel = scene.add
      .text(110, -96, "売上", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#49382e",
        backgroundColor: "#fff4d8e8",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    const multiplier = scene.add.text(94, -48, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#49382e",
    });

    super(scene, x, y, [
      shadow,
      art,
      stock,
      cash,
      title,
      shelfLabel,
      tillLabel,
      multiplier,
    ]);
    this.stockArt = stock;
    this.cashArt = cash;
    this.multiplier = multiplier;
    scene.add.existing(this);
    this.setDepth(y + 90);
    this.updateDisplay(0, 0);
  }

  updateDisplay(stock: number, till: number): void {
    if (stock === this.displayedStock && till === this.displayedTill) return;
    this.displayedStock = stock;
    this.displayedTill = till;

    const stockGraphics = this.stockArt.clear();
    for (let index = 0; index < 8; index += 1) {
      const x = -112 + (index % 4) * 42;
      const y = -54 + Math.floor(index / 4) * 25;
      stockGraphics
        .lineStyle(2, palette.outline, 0.5)
        .fillStyle(palette.soilDark, 0.22)
        .fillRoundedRect(x - 13, y - 9, 26, 18, 5)
        .strokeRoundedRect(x - 13, y - 9, 26, 18, 5);
      if (index < stock) {
        stockGraphics
          .fillStyle(palette.wheat)
          .fillEllipse(x, y, 19, 13)
          .lineStyle(2, palette.wheatLight)
          .lineBetween(x, y - 6, x + 5, y - 17);
      }
    }

    const cashGraphics = this.cashArt.clear();
    cashGraphics
      .lineStyle(2, palette.outline, 0.5)
      .fillStyle(palette.creamDark)
      .fillEllipse(110, -18, 64, 22)
      .strokeEllipse(110, -18, 64, 22);
    const shown = Math.min(12, till);
    for (let index = 0; index < shown; index += 1) {
      cashGraphics
        .lineStyle(2, palette.coinDark)
        .fillStyle(palette.coin)
        .fillEllipse(
          88 + (index % 4) * 14,
          -22 - Math.floor(index / 4) * 7,
          18,
          8,
        )
        .strokeEllipse(
          88 + (index % 4) * 14,
          -22 - Math.floor(index / 4) * 7,
          18,
          8,
        );
    }
    this.multiplier.setText(till > 12 ? `×${till}` : "");
  }

  shelfPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x - 50, this.y - 50);
  }

  tillPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x + 110, this.y - 20);
  }
}
