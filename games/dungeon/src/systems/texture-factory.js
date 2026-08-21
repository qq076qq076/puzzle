import Phaser from "phaser";

function makeTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function createPrototypeTextures(scene) {
  makeTexture(scene, "player-prototype", 24, 28, (g) => {
    g.fillStyle(0x161926, 1);
    g.fillRect(4, 4, 16, 20);
    g.fillStyle(0xd8d4bb, 1);
    g.fillRect(6, 3, 12, 8);
    g.fillStyle(0x4f79a8, 1);
    g.fillRect(8, 7, 8, 3);
    g.fillStyle(0xb94d45, 1);
    g.fillRect(5, 13, 14, 7);
    g.fillStyle(0x6d83a0, 1);
    g.fillRect(5, 22, 5, 5);
    g.fillRect(14, 22, 5, 5);
  });

  makeTexture(scene, "room-floor-prototype", 32, 32, (g) => {
    g.fillStyle(0x232739, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x30354a, 0.55);
    g.strokeRect(0.5, 0.5, 31, 31);
    g.fillStyle(0x2b3042, 1);
    g.fillRect(3, 5, 2, 1);
    g.fillRect(21, 22, 3, 1);
  });

  makeTexture(scene, "room-wall-prototype", 32, 32, (g) => {
    g.fillStyle(0x111421, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x3b4054, 1);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x272c3e, 1);
    g.fillRect(0, 4, 32, 28);
    g.lineStyle(1, 0x4d536b, 0.65);
    g.lineBetween(0, 15, 32, 15);
    g.lineBetween(0, 27, 32, 27);
  });
}

export function createSlashTexture(scene) {
  if (scene.textures.exists("slash-prototype")) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.lineStyle(4, 0xf6d36c, 0.95);
  graphics.beginPath();
  graphics.arc(32, 32, 25, Phaser.Math.DegToRad(-62), Phaser.Math.DegToRad(62), false);
  graphics.strokePath();
  graphics.lineStyle(2, 0xfff4ba, 0.9);
  graphics.beginPath();
  graphics.arc(32, 32, 19, Phaser.Math.DegToRad(-58), Phaser.Math.DegToRad(58), false);
  graphics.strokePath();
  graphics.generateTexture("slash-prototype", 64, 64);
  graphics.destroy();
}
