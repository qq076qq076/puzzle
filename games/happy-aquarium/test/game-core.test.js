import test from "node:test";
import assert from "node:assert/strict";

import { GameCore } from "../src/core/game-core.js";
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
    fish("full", 95),
  ];
  state.tutorial.step = "complete";
  const core = new GameCore(state);

  const first = core.dispatch("FEED", { x: 0.4, y: 0.4 }, "feed-1", START);
  const second = core.dispatch("FEED", { x: 0.6, y: 0.4 }, "feed-2", START);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.state.tank.foods.length, 2);
  assert.equal(second.state.tank.fishes.find((item) => item.id === "hungry").satiety, 10);
  assert.equal(second.state.tank.fishes.find((item) => item.id === "full").satiety, 95);

  const eaten = core.dispatch("EAT_FOOD", { foodId: first.state.tank.foods[0].id, fishId: "hungry" }, "eat-1", START);
  assert.equal(eaten.ok, true);
  assert.equal(eaten.state.tank.foods.length, 1);
  assert.equal(eaten.state.tank.fishes.find((item) => item.id === "hungry").satiety, 25);
  assert.equal(eaten.state.tank.fishes.find((item) => item.id === "full").satiety, 95);
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

  const migrated = normalizeState(legacy, START);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.player, { coins: 300, gems: 3 });
  assert.equal("fishLimit" in migrated.tank, false);
  assert.equal("lastFeedAt" in migrated.tank, false);
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
