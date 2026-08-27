import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/game-config.js";
import { AquariumScene } from "./scenes/AquariumScene.js";
import { BootScene } from "./scenes/BootScene.js";

export function createPhaserConfig(core, ui) {
  return {
    type: Phaser.WEBGL,
    parent: "aquarium-stage",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#08799a",
    render: { antialias: true, smoothPixelArt: true, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    callbacks: {
      preBoot(game) {
        game.registry.set("core", core);
        game.registry.set("ui", ui);
      },
    },
    scene: [BootScene, AquariumScene],
  };
}
