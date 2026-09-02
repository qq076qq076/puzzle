import test from "node:test";
import assert from "node:assert/strict";

import { GameCore } from "../src/core/game-core.js";
import { foodSatietyGain } from "../src/core/calculations.js";
import { createFreshState, normalizeState } from "../src/core/state.js";

const START = Date.UTC(2026, 0, 1);

test("buying the tutorial guppy is atomic and idempotent", () => {
  const core = new GameCore(createFreshState(START));
  const bought = core.dispatch("BUY_EGG", { speciesId: "guppy" }, "buy-1", START);

  assert.equal(bought.ok, true);
  assert.equal(bought.state.player.coins, 285);
  assert.deepEqual(bought.state.player, { coins: 285, gems: 3 });
  assert.equal(bought.state.tank.fishes.length, 1);
  assert.equal(bought.state.tank.fishes[0].tutorialEgg, true);
  assert.equal(bought.state.tutorial.step, "hatch-first-egg");

  const duplicate = core.dispatch("BUY_EGG", { speciesId: "guppy" }, "buy-1", START);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.tank.fishes.length, 1);
  assert.equal(duplicate.state.player.coins, 285);
});

test("failed purchases never spend coins or enter the transaction ring", () => {
  const state = createFreshState(START);
  state.player.coins = 0;
  const core = new GameCore(state);
  const result = core.dispatch("BUY_EGG", { speciesId: "guppy" }, "poor", START);

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "NOT_ENOUGH_COINS");
  assert.equal(result.state.player.coins, 0);
  assert.deepEqual(result.state.transactions.recentIds, []);
});

test("food has no cooldown and only the fish that eats it recovers satiety", () => {
  const state = createFreshState(START);
  state.tank.fishes = [
    fish("hungry", 10),
    fish("full", 50),
  ];
  state.tutorial.step = "complete";
  const core = new GameCore(state);

  const first = core.dispatch("FEED", { x: 0.4, y: 0.4 }, "feed-1", START);
  const second = core.dispatch("FEED", { x: 0.6, y: 0.4 }, "feed-2", START);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.state.tank.foods.length, 2);
  assert.equal(second.state.tank.fishes.find((item) => item.id === "hungry").satiety, 10);
  assert.equal(second.state.tank.fishes.find((item) => item.id === "full").satiety, 50);

  const eaten = core.dispatch("EAT_FOOD", { foodId: first.state.tank.foods[0].id, fishId: "hungry" }, "eat-1", START);
  assert.equal(eaten.ok, true);
  assert.equal(eaten.state.tank.foods.length, 1);
  assert.equal(eaten.state.tank.fishes.find((item) => item.id === "hungry").satiety, 10 + foodSatietyGain("basic-food", "guppy"));
  assert.equal(eaten.state.tank.fishes.find((item) => item.id === "full").satiety, 50);

  const refused = core.dispatch("EAT_FOOD", { foodId: eaten.state.tank.foods[0].id, fishId: "full" }, "eat-full", START);
  assert.equal(refused.ok, false);
  assert.equal(refused.errorCode, "FISH_CANNOT_EAT");
  assert.equal(refused.state.tank.foods.length, 1);
});

test("purchased premium food is selected, consumed on drop, and restores by stomach capacity", () => {
  const state = createFreshState(START);
  state.tank.fishes = [fish("small", 10, "goby"), fish("large", 10, "stingray")];
  state.tutorial.step = "complete";
  const core = new GameCore(state);

  const bought = core.dispatch("BUY_CONSUMABLE", { itemId: "nutritious-food" }, "buy-food", START);
  assert.equal(bought.ok, true);
  assert.equal(bought.state.player.coins, 275);
  assert.equal(bought.state.inventory.fishFoods["nutritious-food"], 1);
  assert.equal(core.dispatch("SELECT_FOOD", { foodTypeId: "nutritious-food" }, "select-food", START).ok, true);

  const dropped = core.dispatch("FEED", { x: 0.4, y: 0.4 }, "drop-premium", START);
  assert.equal(dropped.state.tank.foods[0].foodTypeId, "nutritious-food");
  assert.equal(dropped.state.inventory.fishFoods["nutritious-food"], 0);
  assert.equal(dropped.state.inventory.selectedFishFoodId, "basic-food");

  const smallFed = core.dispatch("EAT_FOOD", { foodId: dropped.state.tank.foods[0].id, fishId: "small" }, "small-eats", START);
  assert.equal(smallFed.state.tank.fishes.find((item) => item.id === "small").satiety, 10 + foodSatietyGain("nutritious-food", "goby"));
  assert.ok(foodSatietyGain("nutritious-food", "goby") > foodSatietyGain("nutritious-food", "stingray"));
});

test("medicine can be purchased and consumed to cure a sick fish", () => {
  const state = createFreshState(START);
  state.inventory.medicines = 0;
  state.tank.fishes = [{ ...fish("sick", 5), health: "sick", sickSince: START - 1_000 }];
  const core = new GameCore(state);

  const bought = core.dispatch("BUY_CONSUMABLE", { itemId: "medicine" }, "buy-medicine", START);
  assert.equal(bought.ok, true);
  assert.equal(bought.state.player.coins, 200);
  assert.equal(bought.state.inventory.medicines, 1);
  const cured = core.dispatch("USE_MEDICINE", { fishId: "sick" }, "use-medicine", START);
  assert.equal(cured.ok, true);
  assert.equal(cured.state.inventory.medicines, 0);
  assert.equal(cured.state.tank.fishes[0].health, "healthy");
});

test("collecting a fish coin credits it exactly once", () => {
  const state = createFreshState(START);
  state.tank.coinDrops.push({ id: "coin-1", fishId: "fish-1", value: 3, expiresAt: Date.now() + 60_000 });
  const core = new GameCore(state);

  const collected = core.dispatch("COLLECT_COIN", { coinId: "coin-1" }, "collect-1", START);
  assert.equal(collected.ok, true);
  assert.equal(collected.state.player.coins, 303);
  assert.equal(collected.state.tank.coinDrops.length, 0);

  const duplicate = core.dispatch("COLLECT_COIN", { coinId: "coin-1" }, "collect-1", START);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.player.coins, 303);
});

test("coin drops use the fish live position supplied by the scene", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...fish("moving", 80), nextCoinAt: START + 1_000 });
  const core = new GameCore(state);

  core.tick(START + 1_000, { moving: { x: 0.27, y: 0.43, heading: "left" } });
  const snapshot = core.snapshot();
  assert.deepEqual(snapshot.tank.fishes[0].position, { x: 0.27, y: 0.43 });
  assert.equal(snapshot.tank.fishes[0].heading, "left");
  assert.equal(snapshot.tank.coinDrops.length, 1);
  assert.equal(snapshot.tank.coinDrops[0].x, 0.27);
  assert.equal(snapshot.tank.coinDrops[0].y, 0.43);
  assert.equal(snapshot.tank.coinDrops[0].value, 4);
});

test("development mode unlocks free items and creates adult fish", () => {
  const state = createFreshState(START);
  state.player.coins = 0;
  const core = new GameCore(state, { devMode: true });

  const fishResult = core.dispatch("BUY_EGG", { speciesId: "stingray" }, "dev-fish", START);
  assert.equal(fishResult.ok, true);
  assert.equal(fishResult.state.player.coins, 0);
  assert.equal(fishResult.state.tank.fishes[0].stage, "adult");
  assert.equal(fishResult.state.tank.fishes[0].growth, 100);
  assert.equal(fishResult.state.tank.fishes[0].satiety, 100);

  for (let index = 0; index < 11; index += 1) {
    const result = core.dispatch("BUY_DECORATION", { decorationId: "coral-gate" }, `dev-decor-${index}`, START);
    assert.equal(result.ok, true);
  }
  assert.equal(core.snapshot().tank.decorations.length, 11);
  assert.equal(core.snapshot().player.coins, 0);
});

test("decorations can be moved and their normalized position is clamped", () => {
  const core = new GameCore(createFreshState(START), { devMode: true });
  const bought = core.dispatch("BUY_DECORATION", { decorationId: "starfish" }, "buy-decor", START);
  const instanceId = bought.events.find((event) => event.type === "decorationAdded").instanceId;

  const moved = core.dispatch("MOVE_DECORATION", { instanceId, x: 1.4, y: 0.42 }, "move-decor", START);
  assert.equal(moved.ok, true);
  assert.deepEqual(moved.state.tank.decorations[0], {
    id: instanceId,
    catalogId: "starfish",
    x: 0.94,
    y: 0.42,
    rotation: 0,
    scale: 1.45,
  });
});

test("decoration and device display scales are customizable and clamped", () => {
  const core = new GameCore(createFreshState(START), { devMode: true });
  const decoration = core.dispatch("BUY_DECORATION", { decorationId: "starfish" }, "scale-buy-decor", START);
  const decorationId = decoration.events.find((event) => event.type === "decorationAdded").instanceId;
  const resizedDecoration = core.dispatch("RESIZE_DECORATION", { instanceId: decorationId, scale: 9 }, "scale-decor", START);
  assert.equal(resizedDecoration.state.tank.decorations[0].scale, 2.5);

  core.dispatch("BUY_DEVICE", { deviceId: "bubble-stone" }, "scale-buy-device", START);
  const deviceId = core.snapshot().tank.devices.instances[0].id;
  const resizedDevice = core.dispatch("RESIZE_DEVICE", { instanceId: deviceId, scale: 0.1 }, "scale-device", START);
  assert.equal(resizedDevice.state.tank.devices.instances[0].scale, 0.75);
});

test("ownership prerequisites replace levels and fish count never blocks purchases", () => {
  const state = createFreshState(START);
  state.player.coins = 10_000;
  state.tank.fishes = Array.from({ length: 120 }, (_, index) => fish(`goby-${index}`, 80, "goby"));
  const core = new GameCore(state);

  const locked = core.dispatch("BUY_EGG", { speciesId: "anglerfish" }, "locked", START);
  assert.equal(locked.ok, false);
  assert.equal(locked.errorCode, "REQUIREMENTS_LOCKED");

  const guppy = core.dispatch("BUY_EGG", { speciesId: "guppy" }, "guppy", START);
  const anglerfish = core.dispatch("BUY_EGG", { speciesId: "anglerfish" }, "angler", START);
  assert.equal(guppy.ok, true);
  assert.equal(anglerfish.ok, true);
  assert.equal(anglerfish.state.tank.fishes.length, 122);
});

test("legacy level, experience, capacity, and feed cooldown fields are removed during migration", () => {
  const legacy = createFreshState(START);
  legacy.schemaVersion = 1;
  legacy.player.level = 50;
  legacy.player.exp = 999;
  legacy.tank.fishLimit = 15;
  legacy.tank.lastFeedAt = START;
  legacy.tank.foods = [{ id: "legacy-food", x: 0.5, y: 0.5, createdAt: START, expiresAt: START + 10_000 }];
  legacy.inventory.selectedFishFoodId = "gourmet-food";

  const migrated = normalizeState(legacy, START);
  assert.equal(migrated.schemaVersion, 4);
  assert.deepEqual(migrated.player, { coins: 300, gems: 3 });
  assert.equal("fishLimit" in migrated.tank, false);
  assert.equal("lastFeedAt" in migrated.tank, false);
  assert.deepEqual(migrated.tank.coinDrops, []);
  assert.equal(migrated.tank.foods[0].foodTypeId, "basic-food");
  assert.deepEqual(migrated.inventory.fishFoods, { "nutritious-food": 0, "gourmet-food": 0 });
  assert.equal(migrated.inventory.selectedFishFoodId, "basic-food");
});

function fish(id, satiety, speciesId = "guppy") {
  return {
    id,
    speciesId,
    name: id,
    acquiredAt: START,
    acquisitionType: "shop",
    acquisitionCost: 45,
    stage: "adult",
    growth: 100,
    satiety,
    variant: null,
    health: "healthy",
    sickSince: 0,
    diedAt: 0,
    lastDiseaseCheckAt: START,
    starvingSince: 0,
    mateCooldownUntil: 0,
    skills: [],
    paidPerformancesOnDay: 0,
    behaviorSeed: 1,
    position: { x: 0.5, y: 0.5 },
    heading: "right",
  };
}
