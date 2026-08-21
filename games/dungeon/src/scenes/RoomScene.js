import Phaser from "phaser";

export class RoomScene extends Phaser.Scene {
  constructor() {
    super("Room");
  }

  create() {
    this.cameras.main.setBackgroundColor("#11131d");
    this.add
      .text(480, 248, "ROOM SYSTEM READY", {
        color: "#dfb84f",
        fontFamily: "monospace",
        fontSize: "22px",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 286, "下一階段：玩家移動與近戰控制", {
        color: "#aaa8b5",
        fontFamily: "monospace",
        fontSize: "13px",
      })
      .setOrigin(0.5);
  }
}
