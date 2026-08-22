import Phaser from "phaser";
import "../style.css";
import { gameConfig } from "./config.js";
import { BootScene } from "./scenes/BootScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { RoomScene } from "./scenes/RoomScene.js";
import { CorridorScene } from "./scenes/CorridorScene.js";
import { setupOrientationGuard } from "./ui/orientation-lock.js";

setupOrientationGuard();

const config = {
  ...gameConfig,
  scene: [BootScene, PreloadScene, MenuScene, RoomScene, CorridorScene],
};

new Phaser.Game(config);
