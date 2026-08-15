import Phaser from "phaser";
import { palette } from "../art/palette";
export class HarvestWorker extends Phaser.GameObjects.Container {
  private cargo: Phaser.GameObjects.Graphics;
  private status: Phaser.GameObjects.Text;
  private phase = 0;
  private shown = -1;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(0, 2, 48, 17, palette.shadow, 0.25);
    const art = scene.add
      .graphics()
      .lineStyle(3, palette.outline)
      .fillStyle(palette.soilDark)
      .fillRoundedRect(-18, -42, 36, 43, 12)
      .strokeRoundedRect(-18, -42, 36, 43, 12)
      .fillStyle(0xe7a86f)
      .fillCircle(0, -62, 19)
      .strokeCircle(0, -62, 19)
      .fillStyle(palette.grassDark)
      .fillRoundedRect(-22, -85, 44, 18, 8)
      .strokeRoundedRect(-22, -85, 44, 18, 8)
      .fillStyle(palette.creamDark)
      .fillRoundedRect(-24, -40, 10, 28, 5)
      .fillRoundedRect(14, -40, 10, 28, 5);
    const cargo = scene.add.graphics();
    const status = scene.add
      .text(0, -115, "", {
        fontFamily: "system-ui",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#49382e",
        backgroundColor: "#fff4d8dd",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    super(scene, x, y, [shadow, art, cargo, status]);
    this.cargo = cargo;
    this.status = status;
    scene.add.existing(this);
    this.setDepth(y + 60);
  }
  setCargo(n: number): void {
    if (n === this.shown) return;
    this.shown = n;
    const g = this.cargo.clear();
    for (let i = 0; i < n; i++)
      g.lineStyle(2, palette.outline)
        .fillStyle(palette.wheat)
        .fillRoundedRect(18, -45 - i * 12, 24, 11, 3)
        .strokeRoundedRect(18, -45 - i * 12, 24, 11, 3);
  }
  setStatus(s: string): void {
    if (this.status.text !== s) this.status.setText(s);
  }
  moveToward(
    p: { x: number; y: number },
    delta: number,
    speed: number,
  ): boolean {
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (d < 5) {
      this.setPosition(p.x, p.y);
      return true;
    }
    const step = Math.min(d, (speed * delta) / 1000);
    this.x += ((p.x - this.x) / d) * step;
    this.y += ((p.y - this.y) / d) * step;
    this.phase += delta;
    this.rotation = Math.sin(this.phase * 0.012) * 0.025;
    this.setDepth(this.y + 60);
    return false;
  }
}
