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

  makeTexture(scene, "enemy-rat-prototype", 24, 18, (g) => {
    g.fillStyle(0x9b7857, 1);
    g.fillRect(5, 5, 14, 9);
    g.fillRect(2, 8, 5, 5);
    g.fillStyle(0xd7a7a1, 1);
    g.fillRect(18, 9, 5, 2);
    g.fillStyle(0x151722, 1);
    g.fillRect(15, 7, 2, 2);
  });

  makeTexture(scene, "enemy-goblin-prototype", 24, 28, (g) => {
    g.fillStyle(0x65a15d, 1);
    g.fillRect(5, 4, 14, 13);
    g.fillStyle(0x252937, 1);
    g.fillRect(4, 15, 16, 8);
    g.fillStyle(0xeee0ac, 1);
    g.fillRect(7, 9, 3, 3);
    g.fillRect(14, 9, 3, 3);
    g.fillStyle(0x141620, 1);
    g.fillRect(7, 21, 5, 6);
    g.fillRect(14, 21, 5, 6);
  });

  makeTexture(scene, "enemy-spider-prototype", 32, 24, (g) => {
    g.fillStyle(0x8b91aa, 1);
    g.fillRect(9, 5, 14, 14);
    g.fillStyle(0x4a506b, 1);
    g.fillRect(12, 8, 8, 8);
    g.fillStyle(0xd9bc5f, 1);
    g.fillRect(14, 10, 4, 3);
    g.lineStyle(3, 0x626a88, 1);
    g.lineBetween(9, 8, 2, 2);
    g.lineBetween(9, 13, 1, 13);
    g.lineBetween(23, 8, 30, 2);
    g.lineBetween(23, 13, 31, 13);
    g.lineBetween(10, 18, 4, 23);
    g.lineBetween(22, 18, 28, 23);
  });

  makeTexture(scene, "boss-prototype", 64, 64, (g) => {
    g.fillStyle(0x28283b, 1);
    g.fillRect(12, 12, 40, 38);
    g.fillStyle(0x7c4d58, 1);
    g.fillRect(16, 14, 32, 22);
    g.fillStyle(0xe0d6ae, 1);
    g.fillRect(14, 8, 36, 10);
    g.fillRect(20, 4, 6, 8);
    g.fillRect(38, 4, 6, 8);
    g.fillStyle(0xe1bc54, 1);
    g.fillRect(27, 22, 10, 10);
    g.fillStyle(0x151622, 1);
    g.fillRect(20, 29, 7, 5);
    g.fillRect(37, 29, 7, 5);
    g.fillStyle(0x7786a7, 1);
    g.fillRect(8, 38, 12, 10);
    g.fillRect(44, 38, 12, 10);
    g.fillRect(15, 50, 10, 11);
    g.fillRect(39, 50, 10, 11);
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
