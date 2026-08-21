import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  create() {
    this.cameras.main.setBackgroundColor("#090b13");
    this.add
      .text(480, 248, "LOADING DUNGEON", {
        color: "#dfb84f",
        fontFamily: "monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 282, "prototype boot", {
        color: "#77798a",
        fontFamily: "monospace",
        fontSize: "12px",
      })
      .setOrigin(0.5);
    this.time.delayedCall(250, () => this.scene.start("Menu"));
  }
}
