import test from "node:test";
import assert from "node:assert/strict";

import { GameCore } from "../src/core/game-core.js";
import { createFreshState } from "../src/core/state.js";

const START = Date.UTC(2026, 0, 1);

test("buying the tutorial guppy is atomic and idempotent", () => {
  const core = new GameCore(createFreshState(START));
  const bought = core.dispatch("BUY_EGG", { speciesId: "guppy" }, "buy-1", START);

  assert.equal(bought.ok, true);
  assert.equal(bought.state.player.coins, 285);
  assert.equal(bought.state.player.exp, 13);
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

test("feeding targets the hungriest fish and enforces cooldown", () => {
  const state = createFreshState(START);
  state.tank.fishes = [
    fish("hungry", 10),
    fish("full", 95),
  ];
  state.tutorial.step = "complete";
  const core = new GameCore(state);

  const fed = core.dispatch("FEED", {}, "feed-1", START + 61_000);
  assert.equal(fed.ok, true);
  assert.ok(Math.abs(fed.state.tank.fishes.find((item) => item.id === "hungry").satiety - 24.8305555556) < 0.001);
  assert.equal(fed.state.tank.fishes.find((item) => item.id === "full").satiety, 100);

  const cooldown = core.dispatch("FEED", {}, "feed-2", START + 62_000);
  assert.equal(cooldown.ok, false);
  assert.equal(cooldown.errorCode, "FEED_COOLDOWN");
});

function fish(id, satiety) {
  return {
    id,
    speciesId: "guppy",
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
