import Phaser from "phaser";

function makeTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function createEnvironmentTextures(scene) {
  makeTexture(scene, "room-floor-fantasy", 32, 32, (g) => {
    g.fillStyle(0x3a3444, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x594c5c, 0.55);
    g.strokeRect(0.5, 0.5, 31, 31);
    g.fillStyle(0x5b4b54, 0.65);
    g.fillRect(6, 8, 3, 1);
    g.fillRect(23, 24, 4, 1);
  });
  makeTexture(scene, "room-floor-machine", 32, 32, (g) => {
    g.fillStyle(0x252f40, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(1, 0x52647b, 0.6);
    g.strokeRect(0.5, 0.5, 31, 31);
    g.fillStyle(0x6b7c92, 0.4);
    g.fillRect(3, 5, 8, 2);
    g.fillRect(20, 22, 6, 2);
  });
  makeTexture(scene, "wall-fantasy", 32, 32, (g) => {
    g.fillStyle(0x171522, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x5d4d59, 1);
    g.fillRect(0, 0, 32, 5);
    g.fillStyle(0x30283a, 1);
    g.fillRect(0, 5, 32, 27);
    g.lineStyle(1, 0x6d5963, 0.65);
    g.lineBetween(0, 17, 32, 17);
    g.lineBetween(0, 28, 32, 28);
  });
  makeTexture(scene, "wall-machine", 32, 32, (g) => {
    g.fillStyle(0x101923, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x41556d, 1);
    g.fillRect(0, 0, 32, 5);
    g.fillStyle(0x26364a, 1);
    g.fillRect(0, 5, 32, 27);
    g.lineStyle(1, 0x71859c, 0.62);
    g.lineBetween(0, 15, 32, 15);
    g.lineBetween(0, 27, 32, 27);
  });
  makeTexture(scene, "door-closed", 48, 96, (g) => {
    g.fillStyle(0x241d29, 1);
    g.fillRect(4, 2, 40, 92);
    g.fillStyle(0xa44c51, 1);
    g.fillRect(8, 8, 32, 80);
    g.fillStyle(0xf1c15b, 1);
    g.fillRect(21, 15, 6, 66);
    g.fillStyle(0x482d3a, 1);
    g.fillRect(14, 18, 5, 60);
    g.fillRect(29, 18, 5, 60);
  });
  makeTexture(scene, "door-open", 48, 96, (g) => {
    g.fillStyle(0x151520, 1);
    g.fillRect(4, 2, 40, 92);
    g.lineStyle(3, 0xdfb84f, 1);
    g.strokeRect(7, 5, 34, 86);
    g.fillStyle(0x070a11, 1);
    g.fillRect(14, 10, 20, 76);
  });
  makeTexture(scene, "portal", 64, 64, (g) => {
    g.fillStyle(0x171629, 0.9);
    g.fillCircle(32, 32, 26);
    g.lineStyle(4, 0x9a76d1, 0.95);
    g.strokeCircle(32, 32, 24);
    g.lineStyle(2, 0xe2c8ff, 0.8);
    g.strokeCircle(32, 32, 15);
    g.fillStyle(0x5d4c9d, 0.7);
    g.fillCircle(32, 32, 8);
  });
  makeTexture(scene, "trap", 54, 54, (g) => {
    g.fillStyle(0x482b35, 0.28);
    g.fillCircle(27, 27, 25);
    g.lineStyle(3, 0xc15c59, 0.9);
    g.strokeCircle(27, 27, 22);
    g.lineBetween(14, 14, 40, 40);
    g.lineBetween(40, 14, 14, 40);
  });
  makeTexture(scene, "spawn-marker", 42, 42, (g) => {
    g.lineStyle(2, 0xdfb84f, 0.8);
    g.strokeCircle(21, 21, 17);
    g.lineBetween(21, 7, 21, 35);
    g.lineBetween(7, 21, 35, 21);
  });
  makeTexture(scene, "reward-chest", 64, 64, (g) => {
    g.fillStyle(0x6f4937, 1);
    g.fillRect(8, 23, 48, 31);
    g.fillStyle(0xa87845, 1);
    g.fillRect(8, 18, 48, 15);
    g.fillStyle(0xdfb84f, 1);
    g.fillRect(29, 27, 7, 14);
    g.fillRect(14, 19, 36, 3);
    g.lineStyle(2, 0x2c2030, 1);
    g.strokeRect(8, 18, 48, 36);
  });
  makeTexture(scene, "reward-console", 64, 64, (g) => {
    g.fillStyle(0x26384e, 1);
    g.fillRect(8, 10, 48, 46);
    g.fillStyle(0x6cb7c6, 1);
    g.fillRect(16, 18, 32, 14);
    g.fillStyle(0x1b2435, 1);
    g.fillRect(18, 22, 28, 5);
    g.fillStyle(0xdfb84f, 1);
    g.fillRect(15, 40, 10, 7);
    g.fillRect(29, 40, 10, 7);
    g.fillRect(43, 40, 6, 7);
  });
  makeTexture(scene, "hit-spark", 32, 32, (g) => {
    g.lineStyle(3, 0xf6d36c, 1);
    g.lineBetween(16, 2, 16, 30);
    g.lineBetween(2, 16, 30, 16);
    g.lineStyle(2, 0xfff4ba, 0.85);
    g.lineBetween(6, 6, 26, 26);
    g.lineBetween(26, 6, 6, 26);
  });
  makeTexture(scene, "slash-effect", 64, 64, (g) => {
    g.lineStyle(4, 0xf6d36c, 0.95);
    g.beginPath();
    g.arc(32, 32, 25, Phaser.Math.DegToRad(-62), Phaser.Math.DegToRad(62), false);
    g.strokePath();
    g.lineStyle(2, 0xfff4ba, 0.9);
    g.beginPath();
    g.arc(32, 32, 19, Phaser.Math.DegToRad(-58), Phaser.Math.DegToRad(58), false);
    g.strokePath();
  });

  makeFallbackActor(scene, "provided-player", 0x9aa2c1, 0xdfb84f);
  makeFallbackActor(scene, "provided-rat", 0xa87561, 0xe8be85);
  makeFallbackActor(scene, "provided-goblin-bat", 0x6eae67, 0xdfb84f);
  makeFallbackActor(scene, "provided-goblin-dagger", 0x7d7898, 0xc68bd7);
  makeFallbackActor(scene, "provided-steel-spider", 0x7187ad, 0x8fd1e8);
  makeFallbackActor(scene, "provided-spider-guard", 0x9b5960, 0xffbf6b);
  makeFallbackActor(scene, "provided-boss", 0x9b5960, 0xdfb84f, 2);
}

function makeFallbackActor(scene, key, bodyColor, accentColor, sizeMultiplier = 1) {
  makeTexture(scene, key, 16 * sizeMultiplier, 16 * sizeMultiplier, (g) => {
    const size = 16 * sizeMultiplier;
    g.fillStyle(bodyColor, 1);
    g.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
    g.fillStyle(accentColor, 1);
    g.fillRect(size * 0.35, size * 0.35, size * 0.3, size * 0.2);
  });
}

export function createSlashTexture(scene) {
  createEnvironmentTextures(scene);
}
