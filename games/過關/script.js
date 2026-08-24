import { LoadingScene } from "./shared/loading-scene.js";
import { Level01Scene } from "./levels/level-01.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-shell",
  backgroundColor: "#000000",
  render: { antialias: true, roundPixels: false },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  input: { activePointers: 3 },
  scene: [LoadingScene, Level01Scene]
});

game.registry.set("nextLevelScene", "Level01Scene");
game.canvas?.setAttribute("aria-label", "過關遊戲畫面");
game.canvas?.setAttribute("role", "img");
game.scene.start("LoadingScene");
