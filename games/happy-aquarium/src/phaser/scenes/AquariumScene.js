import Phaser from "phaser";
import { ASSET_INSETS, COIN_FALL_SPEED_PX, DEVICE_PLACEMENTS, FOOD_FALL_SPEED_PX, GAME_HEIGHT, GAME_WIDTH, HELPERS, SPECIES_BY_ID, STAGE_SCALE } from "../../config/game-config.js";
import { createAgent, createHelperAgent, stepAgents, stepHelperAgent } from "../../core/animal-ai.js";
import { fallingDropY, fallingFoodY } from "../../core/calculations.js";
import { isDeviceActive } from "../../core/simulation.js";
import {
  decorationTextureKey,
  deviceTextureKey,
  fishTextureKey,
  helperTextureKey,
  objectTextureKey,
} from "../asset-registry.js";

export class AquariumScene extends Phaser.Scene {
  constructor() { super("aquarium"); }

  create() {
    this.core = this.registry.get("core");
    this.ui = this.registry.get("ui");
    this.snapshot = this.core.snapshot();
    this.fishViews = new Map();
    this.helperViews = new Map();
    this.decorationViews = new Map();
    this.deviceViews = new Map();
    this.foodViews = new Map();
    this.coinViews = new Map();
    this.accumulator = 0;
    this.lastTickAt = 0;
    this.buildTank();
    this.input.on("pointerdown", this.handleTankPointer, this);
    this.unsubscribe = this.core.subscribe((snapshot, events) => this.receiveSnapshot(snapshot, events));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", this.handleTankPointer, this);
      this.unsubscribe?.();
    });
  }

  buildTank() {
    const background = this.add.graphics().setDepth(-100);
    background.fillGradientStyle(0x0fa5c8, 0x0a87b2, 0x075d82, 0x064768, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.fillStyle(0xe4cf91, 1).fillRect(0, 530, GAME_WIDTH, 70);
    background.fillStyle(0xc4a96b, 0.55).fillEllipse(500, 548, 980, 42);
    background.lineStyle(8, 0xbaf3ff, 0.48).strokeRoundedRect(18, 24, 964, 552, 30);
    background.lineStyle(2, 0xffffff, 0.26).lineBetween(30, 72, 970, 72);
    for (let index = 0; index < 6; index += 1) {
      const light = this.add.rectangle(120 + index * 180, 210, 70, 520, 0xcaf8ff, 0.045).setAngle(-10).setDepth(-90);
      this.tweens.add({ targets: light, x: light.x + 45, alpha: { from: 0.025, to: 0.08 }, duration: 4200 + index * 300, yoyo: true, repeat: -1 });
    }
    this.bubbles = this.add.group();
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnAmbientBubble() });
  }

  receiveSnapshot(snapshot, events) {
    this.snapshot = snapshot;
    this.syncDecorations();
    this.syncDevices();
    this.syncHelpers();
    this.syncFish();
    this.syncFoods();
    this.syncCoins();
    this.syncAlgae();
    for (const event of events) this.playEvent(event);
  }

  syncFish() {
    const ids = new Set(this.snapshot.tank.fishes.map((fish) => fish.id));
    for (const [id, view] of this.fishViews) {
      if (!ids.has(id)) {
        view.sprite.destroy();
        this.fishViews.delete(id);
      }
    }
    for (const fish of this.snapshot.tank.fishes) {
      let view = this.fishViews.get(fish.id);
      const kind = fish.stage === "egg" ? "egg" : "fish";
      if (!view || view.kind !== kind) {
        view?.sprite.destroy();
        const texture = kind === "egg" ? objectTextureKey("fish-egg-hatch") : fishTextureKey(fish.speciesId);
        const sprite = this.add.sprite((fish.position?.x ?? 0.5) * GAME_WIDTH, (fish.position?.y ?? 0.5) * GAME_HEIGHT, this.textures.exists(texture) ? texture : "__AQUARIUM_MISSING");
        sprite.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.ui.selectFish(fish.id));
        view = { kind, sprite, agent: createAgent(fish), animation: "" };
        this.fishViews.set(fish.id, view);
      }
      view.fish = fish;
      const scale = kind === "egg" ? 0.8 : (STAGE_SCALE[fish.stage] || 1) * (SPECIES_BY_ID[fish.speciesId]?.displayScale || 1);
      view.sprite.setScale(scale).setAlpha(fish.health === "sick" ? 0.72 : 1);
      if (kind === "egg") {
        view.sprite.setFrame(Math.min(3, Math.floor(fish.growth / 2.5)));
      } else {
        const state = fish.health === "dead" ? "death" : fish.health === "sick" ? "sick" : fish.satiety < 25 ? "hungry" : "swim";
        const key = `${fishTextureKey(fish.speciesId)}:${state}`;
        if (view.animation !== key) {
          view.sprite.play(key, true);
          view.animation = key;
        }
      }
    }
  }

  syncHelpers() {
    const ids = new Set(this.snapshot.tank.helpers.map((item) => item.id));
    for (const [id, view] of this.helperViews) if (!ids.has(id)) { view.sprite.destroy(); this.helperViews.delete(id); }
    this.snapshot.tank.helpers.forEach((helper) => {
      const state = helper.satiety <= 0 ? "hungry" : "work";
      const texture = helperTextureKey(helper.kind, state);
      let view = this.helperViews.get(helper.id);
      if (!view) {
        const agent = createHelperAgent(helper);
        const sprite = this.add.sprite(agent.x, agent.y, texture).setDepth(470).setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", () => this.ui.selectHelper(helper.id));
        view = { sprite, agent, helper };
        this.helperViews.set(helper.id, view);
      }
      view.helper = helper;
      if (view.sprite.texture.key !== texture) view.sprite.setTexture(texture);
      applySpriteInset(view.sprite, ASSET_INSETS.helpers[`${helper.kind}-${state}`]);
      view.sprite.play(`${texture}:play`, true);
    });
  }

  syncDecorations() {
    const ids = new Set(this.snapshot.tank.decorations.map((item) => item.id));
    for (const [id, sprite] of this.decorationViews) if (!ids.has(id)) { sprite.destroy(); this.decorationViews.delete(id); }
    for (const decoration of this.snapshot.tank.decorations) {
      let sprite = this.decorationViews.get(decoration.id);
      if (!sprite) {
        const texture = decorationTextureKey(decoration.catalogId);
        sprite = this.add.sprite(decoration.x * GAME_WIDTH, decoration.y * GAME_HEIGHT, this.textures.exists(texture) ? texture : "__AQUARIUM_MISSING").setScale(1.18);
        applySpriteInset(sprite, ASSET_INSETS.decorations[decoration.catalogId]);
        if (this.anims.exists(`${texture}:play`)) sprite.play(`${texture}:play`, true);
        this.decorationViews.set(decoration.id, sprite);
      }
      sprite.setPosition(decoration.x * GAME_WIDTH, decoration.y * GAME_HEIGHT).setDepth(240 + decoration.y * 150);
    }
  }

  syncDevices() {
    const installed = Object.values(this.snapshot.tank.devices.slots).filter(Boolean);
    const ids = new Set(installed);
    for (const [id, sprite] of this.deviceViews) if (!ids.has(id)) { sprite.destroy(); this.deviceViews.delete(id); }
    installed.forEach((id) => {
      const device = this.snapshot.tank.devices.instances.find((item) => item.id === id);
      if (!device) return;
      const active = isDeviceActive(this.snapshot, device.catalogId);
      const empty = device.catalogId.includes("feeder") && device.state.ammo <= 0;
      const expired = device.catalogId === "hang-on-filter" && !active;
      const state = empty ? "empty" : expired ? "expired" : active ? "active" : "off";
      const texture = deviceTextureKey(device.catalogId, state);
      const placement = DEVICE_PLACEMENTS[device.catalogId];
      let sprite = this.deviceViews.get(id);
      if (!sprite) {
        sprite = this.add.sprite(placement.x * GAME_WIDTH, placement.y * GAME_HEIGHT, this.textures.exists(texture) ? texture : "__AQUARIUM_MISSING").setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", () => this.ui.selectDevice(id));
        this.deviceViews.set(id, sprite);
      }
      sprite.setPosition(placement.x * GAME_WIDTH, placement.y * GAME_HEIGHT).setScale(placement.scale).setDepth(placement.depth);
      if (sprite.texture.key !== texture && this.textures.exists(texture)) sprite.setTexture(texture);
      applySpriteInset(sprite, ASSET_INSETS.devices[device.catalogId]);
      if (this.anims.exists(`${texture}:play`)) sprite.play(`${texture}:play`, true);
    });
  }

  syncAlgae() {
    const target = Math.min(10, Math.ceil((100 - this.snapshot.tank.cleanliness) / 10) + (this.snapshot.tutorial.step === "clean-first-algae" ? 1 : 0));
    this.algaeSpots ||= [];
    while (this.algaeSpots.length > target) this.algaeSpots.pop().destroy();
    while (this.algaeSpots.length < target) {
      const index = this.algaeSpots.length;
      const spot = this.add.circle(90 + (index * 173) % 820, 125 + (index * 97) % 330, 18 + (index % 3) * 5, 0x477f3b, 0.42).setDepth(480).setInteractive({ useHandCursor: true });
      spot.on("pointerdown", () => this.ui.runCommand("CLEAN"));
      this.algaeSpots.push(spot);
    }
  }

  syncFoods() {
    const ids = new Set(this.snapshot.tank.foods.map((food) => food.id));
    for (const [id, view] of this.foodViews) {
      if (!ids.has(id)) {
        view.sprite.destroy();
        this.foodViews.delete(id);
      }
    }
    for (const food of this.snapshot.tank.foods) {
      let view = this.foodViews.get(food.id);
      if (!view) {
        const sprite = this.add.sprite(food.x * GAME_WIDTH, food.y * GAME_HEIGHT, objectTextureKey("fish-food-fall")).setScale(0.55).setDepth(700);
        sprite.play(`${objectTextureKey("fish-food-fall")}:play`);
        view = { sprite, food, claimedBy: null, consumed: false };
        this.foodViews.set(food.id, view);
      }
      view.food = food;
      view.sprite.setPosition(food.x * GAME_WIDTH, foodDisplayY(food));
    }
  }

  syncCoins() {
    const ids = new Set(this.snapshot.tank.coinDrops.map((coin) => coin.id));
    for (const [id, view] of this.coinViews) {
      if (!ids.has(id)) {
        view.sprite.destroy();
        this.coinViews.delete(id);
      }
    }
    for (const coin of this.snapshot.tank.coinDrops) {
      let view = this.coinViews.get(coin.id);
      if (!view) {
        const texture = objectTextureKey("coin-spin");
        const sprite = this.add.sprite(coin.x * GAME_WIDTH, coinDisplayY(coin), texture).setScale(0.72).setDepth(760).setInteractive({ useHandCursor: true });
        sprite.play(`${texture}:play`);
        sprite.on("pointerdown", () => this.ui.runCommand("COLLECT_COIN", { coinId: coin.id }));
        view = { sprite, coin };
        this.coinViews.set(coin.id, view);
      }
      view.coin = coin;
      view.sprite.setPosition(coin.x * GAME_WIDTH, coinDisplayY(coin));
    }
  }

  handleTankPointer(pointer, currentlyOver = []) {
    if (currentlyOver.length > 0) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (world.x < 40 || world.x > 960 || world.y < 75 || world.y > 550) return;
    this.ui.runCommand("FEED", { x: world.x / GAME_WIDTH, y: world.y / GAME_HEIGHT });
  }

  update(time, delta) {
    const clamped = Math.min(delta, 100) / 1000;
    this.accumulator += clamped;
    const fishById = new Map(this.snapshot.tank.fishes.map((fish) => [fish.id, fish]));
    const agents = [...this.fishViews.values()].filter((view) => view.kind === "fish").map((view) => view.agent);
    for (const view of this.foodViews.values()) view.sprite.y = foodDisplayY(view.food);
    for (const view of this.coinViews.values()) view.sprite.y = coinDisplayY(view.coin);
    const foods = [...this.foodViews.entries()].map(([id, view]) => ({ id, x: view.sprite.x, y: view.sprite.y, claimedBy: view.claimedBy, consumed: view.consumed, view }));
    const consumed = [];
    let steps = 0;
    while (this.accumulator >= 1 / 60 && steps < 5) {
      consumed.push(...stepAgents(agents, fishById, foods, 1 / 60));
      this.accumulator -= 1 / 60;
      steps += 1;
    }
    for (const food of foods) {
      food.view.claimedBy = food.claimedBy;
      food.view.consumed = food.consumed;
    }
    for (const view of this.fishViews.values()) {
      if (view.kind === "egg") continue;
      if (view.fish.health === "dead") {
        view.sprite.y += (95 - view.sprite.y) * Math.min(1, clamped * 1.8);
        view.sprite.setAngle(180);
      } else {
        view.sprite.setPosition(view.agent.x, view.agent.y).setFlipX(view.agent.facing < 0).setAngle(view.fish.health === "sick" ? Math.sin(time / 500) * 12 : 0);
      }
      view.sprite.setDepth(100 + Math.floor(view.sprite.y));
    }
    for (const view of this.helperViews.values()) {
      const speed = HELPERS_BY_KIND[view.helper.kind] || 10;
      stepHelperAgent(view.agent, speed, clamped, time / 1000);
      view.sprite.setPosition(view.agent.x, view.agent.y).setFlipX(view.agent.direction < 0).setDepth(470);
    }
    for (const item of consumed) this.ui.runCommand("EAT_FOOD", item);
    if (time - this.lastTickAt >= 1000) {
      this.lastTickAt = time;
      const liveFishPositions = Object.fromEntries([...this.fishViews.entries()]
        .filter(([, view]) => view.kind === "fish")
        .map(([id, view]) => [id, { x: view.agent.x / GAME_WIDTH, y: view.agent.y / GAME_HEIGHT, heading: view.agent.facing < 0 ? "left" : "right" }]));
      this.core.tick(Date.now(), liveFishPositions);
    }
  }

  playEvent(event) {
    if (event.type === "foodEaten") this.playEating(event.fishId);
    if (event.type === "coinCollected") this.ui.toast(`+${event.value} 金幣`);
    if (event.type === "rewardOpened") this.ui.toast(event.message);
    if (["fishCured", "fishRevived", "fishGrew"].includes(event.type)) this.flash(0x9fffd0);
  }

  playEating(fishId) {
    const view = this.fishViews.get(fishId);
    if (!view || view.kind !== "fish") return;
    const key = `${fishTextureKey(view.fish.speciesId)}:eat`;
    if (!this.anims.exists(key)) return;
    view.sprite.play(key, true);
    view.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { view.animation = ""; });
  }

  flash(color) {
    const overlay = this.add.rectangle(500, 300, 1000, 600, color, 0).setDepth(1000);
    this.tweens.add({ targets: overlay, alpha: { from: 0.32, to: 0 }, duration: 650, onComplete: () => overlay.destroy() });
  }

  spawnAmbientBubble() {
    if (document.hidden || this.bubbles.getLength() > 50) return;
    const bubble = this.add.circle(60 + Math.random() * 880, 535, 3 + Math.random() * 5, 0xd7fbff, 0.35).setDepth(430);
    this.bubbles.add(bubble);
    this.tweens.add({ targets: bubble, y: 70, x: bubble.x + (Math.random() - 0.5) * 80, alpha: 0, duration: 5000 + Math.random() * 3500, onComplete: () => bubble.destroy() });
  }
}

const HELPERS_BY_KIND = Object.fromEntries(HELPERS.map((item) => [item.id, item.movementSpeed]));

function foodDisplayY(food, now = Date.now()) {
  return fallingFoodY(food, now, { gameHeight: GAME_HEIGHT, speed: FOOD_FALL_SPEED_PX, floor: 520 });
}

function coinDisplayY(coin, now = Date.now()) {
  return fallingDropY(coin, now, { gameHeight: GAME_HEIGHT, speed: COIN_FALL_SPEED_PX, floor: 510 });
}

function applySpriteInset(sprite, inset) {
  if (!inset) {
    sprite.setCrop();
    return;
  }
  const top = inset.top || 0;
  const bottom = inset.bottom || 0;
  sprite.setCrop(0, top, 64, Math.max(1, 64 - top - bottom));
}
