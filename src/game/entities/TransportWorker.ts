import Phaser from "phaser";
import { palette } from "../art/palette";
export class TransportWorker extends Phaser.GameObjects.Container {
  private cargo: Phaser.GameObjects.Graphics;
  private status: Phaser.GameObjects.Text;
  private shown = -1;
  private phase = 0;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(5, 5, 78, 22, palette.shadow, 0.25);
    const art = scene.add
      .graphics()
      .lineStyle(3, palette.outline)
      .fillStyle(palette.sky)
      .fillRoundedRect(-18, -43, 36, 43, 12)
      .strokeRoundedRect(-18, -43, 36, 43, 12)
      .fillStyle(0xd99b70)
      .fillCircle(0, -62, 19)
      .strokeCircle(0, -62, 19)
      .fillStyle(palette.teal)
      .fillRoundedRect(-24, -84, 48, 17, 7)
      .strokeRoundedRect(-24, -84, 48, 17, 7)
      .fillStyle(palette.path)
      .fillRoundedRect(25, -38, 48, 48, 8)
      .strokeRoundedRect(25, -38, 48, 48, 8)
      .fillStyle(palette.outline)
      .fillCircle(34, 14, 10)
      .fillCircle(65, 14, 10);
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
    for (let i = 0; i < n; i++) {
      const x = 32 + (i % 3) * 14,
        y = -24 - Math.floor(i / 3) * 14;
      g.lineStyle(2, palette.outline)
        .fillStyle(palette.wheat)
        .fillRoundedRect(x, y, 13, 11, 3)
        .strokeRoundedRect(x, y, 13, 11, 3);
    }
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
    const q = Math.min(d, (speed * delta) / 1000);
    this.x += ((p.x - this.x) / d) * q;
    this.y += ((p.y - this.y) / d) * q;
    this.phase += delta;
    this.rotation = Math.sin(this.phase * 0.014) * 0.02;
    this.setDepth(this.y + 60);
    return false;
  }
}
