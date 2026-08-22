import Phaser from "phaser";
import { PROVIDED_ASSETS } from "../data/assets.js";
import { registerCraftPixAnimations } from "../systems/actor-animations.js";
import { createEnvironmentTextures } from "../systems/texture-factory.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    this.cameras.main.setBackgroundColor("#090b13");
    this.add
      .text(480, 218, "LOADING DUNGEON", {
        color: "#dfb84f",
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.progressBar = this.add.rectangle(280, 270, 400, 12, 0x2d3346, 1).setOrigin(0, 0.5);
    this.progressFill = this.add.rectangle(280, 270, 0, 12, 0xdfb84f, 1).setOrigin(0, 0.5);
    this.progressText = this.add.text(480, 304, "讀取 CraftPix 素材…", {
      color: "#77798a",
      fontFamily: "monospace",
      fontSize: "12px",
    }).setOrigin(0.5);

    Object.entries(PROVIDED_ASSETS.images).forEach(([key, path]) => this.load.image(key, path));
    PROVIDED_ASSETS.spritesheets.forEach((definition) => {
      this.load.spritesheet(definition.key, definition.path, {
        frameWidth: definition.frameWidth,
        frameHeight: definition.frameHeight,
      });
    });
    this.load.on("progress", (value) => {
      this.progressFill.width = 400 * value;
      this.progressText.setText(`讀取 CraftPix 素材… ${Math.round(value * 100)}%`);
    });
    this.load.on("loaderror", (file) => {
      this.progressText.setText(`CraftPix 檔案未找到：${file.key}，使用像素備援圖形`);
    });
  }

  create() {
    createEnvironmentTextures(this);
    registerCraftPixAnimations(this);
    this.time.delayedCall(180, () => this.scene.start("Menu"));
  }
}
