import Phaser from "phaser";
import {
  catalog,
  decorationTextureKey,
  deviceTextureKey,
  fishTextureKey,
  helperTextureKey,
  manifest,
  objectTextureKey,
  runtimeUrl,
  uiTextureKey,
} from "../asset-registry.js";

export class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    for (const species of manifest.species) {
      this.load.spritesheet(fishTextureKey(species.id), runtimeUrl(`fish/${species.id}/${species.id}-states.png`), { frameWidth: 64, frameHeight: 64 });
    }
    for (const helper of catalog.helpers) {
      for (const state of helper.states) this.load.spritesheet(helperTextureKey(helper.id, state), runtimeUrl(`helpers/${helper.id}/${helper.id}-${state}.png`), { frameWidth: 64, frameHeight: 64 });
    }
    for (const device of catalog.devices) {
      for (const state of device.states) this.load.spritesheet(deviceTextureKey(device.id, state), runtimeUrl(`devices/${device.id}/${device.id}-${state}.png`), { frameWidth: 64, frameHeight: 64 });
    }
    for (const id of catalog.objects) this.load.spritesheet(objectTextureKey(id), runtimeUrl(`objects/${id}.png`), { frameWidth: 64, frameHeight: 64 });
    for (const id of catalog.decorations) this.load.spritesheet(decorationTextureKey(id), runtimeUrl(`decorations/${id}-animated.png`), { frameWidth: 64, frameHeight: 64 });
    for (const id of catalog.ui) this.load.image(uiTextureKey(id), runtimeUrl(`ui/${id}.png`));
    this.load.on("loaderror", (file) => console.warn("[Aquarium] Asset failed", file.key));
  }

  create() {
    this.createMissingTexture();
    this.createAnimations();
    this.scene.start("aquarium");
  }

  createAnimations() {
    for (const species of manifest.species) {
      const texture = fishTextureKey(species.id);
      for (const [state, definition] of Object.entries(manifest.states)) {
        if (state === "idle") continue;
        const key = `${texture}:${state}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texture, { start: definition.row * 4, end: definition.row * 4 + definition.frames - 1 }),
          frameRate: definition.fps,
          repeat: definition.mode === "loop" ? -1 : 0,
        });
      }
    }
    for (const helper of catalog.helpers) {
      for (const state of helper.states) createStripAnimation(this, helperTextureKey(helper.id, state), state === "idle" ? 1 : 4, state === "hungry" ? 5 : 8);
    }
    for (const device of catalog.devices) for (const state of device.states) createStripAnimation(this, deviceTextureKey(device.id, state), 4, 7);
    for (const id of catalog.objects) createStripAnimation(this, objectTextureKey(id), 4, 8);
    for (const id of catalog.decorations) createStripAnimation(this, decorationTextureKey(id), 3, 4);
  }

  createMissingTexture() {
    if (this.textures.exists("__AQUARIUM_MISSING")) return;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xff4d85).fillRoundedRect(4, 16, 56, 32, 12);
    graphics.fillStyle(0xffffff).fillCircle(46, 28, 4);
    graphics.generateTexture("__AQUARIUM_MISSING", 64, 64);
    graphics.destroy();
  }
}

function createStripAnimation(scene, texture, frames, fps) {
  if (!scene.textures.exists(texture) || scene.anims.exists(`${texture}:play`)) return;
  scene.anims.create({ key: `${texture}:play`, frames: scene.anims.generateFrameNumbers(texture, { start: 0, end: frames - 1 }), frameRate: fps, repeat: -1 });
}
