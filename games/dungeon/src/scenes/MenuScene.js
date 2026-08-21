import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.cameras.main.setBackgroundColor("#090b13");
    this.add
      .text(480, 190, "DUNGEON", {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: "52px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 250, "IRON BELOW", {
        color: "#dfb84f",
        fontFamily: "monospace",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 340, "按 Enter 開始第一地層", {
        color: "#bbb8c4",
        fontFamily: "monospace",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 380, "鍵盤操作原型 · 素材介面待接入", {
        color: "#666879",
        fontFamily: "monospace",
        fontSize: "12px",
      })
      .setOrigin(0.5);

    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("Room"));
  }
}
