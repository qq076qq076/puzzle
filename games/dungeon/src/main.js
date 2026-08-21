import Phaser from "phaser";
import { gameConfig } from "./config.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { setupOrientationGuard } from "./ui/orientation-lock.js";

setupOrientationGuard();

const config = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, MenuScene],
};

new Phaser.Game(config);
