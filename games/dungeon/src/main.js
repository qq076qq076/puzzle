import Phaser from "phaser";
import { gameConfig } from "./config.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { RoomScene } from "./scenes/RoomScene.js";
import { BossScene } from "./scenes/BossScene.js";
import { setupOrientationGuard } from "./ui/orientation-lock.js";

setupOrientationGuard();

const config = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, MenuScene, RoomScene, BossScene],
};

new Phaser.Game(config);
