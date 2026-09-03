import test from "node:test";
import assert from "node:assert/strict";

import { createAgent, createHelperAgent, stepAgents, stepHelperAgent } from "../src/core/animal-ai.js";
import { simulate } from "../src/core/simulation.js";
import { createFreshState } from "../src/core/state.js";

const START = Date.UTC(2026, 0, 1);

test("the first tutorial egg hatches after one minute", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({
    id: "egg-1",
    speciesId: "guppy",
    stage: "egg",
    growth: 0,
    satiety: 0,
    health: "healthy",
    tutorialEgg: true,
    lastDiseaseCheckAt: START,
  });

  const report = simulate(state, START + 60_000);
  assert.equal(report.hatched, 1);
  assert.equal(state.tank.fishes[0].stage, "fry");
  assert.equal(state.tank.fishes[0].growth, 10);
  assert.equal(state.tank.fishes[0].satiety, 80);
});

test("offline simulation is capped at seven days", () => {
  const state = createFreshState(START);
  const report = simulate(state, START + 30 * 24 * 3_600_000, { offline: true });
  assert.equal(report.elapsedMs, 7 * 24 * 3_600_000);
  assert.equal(state.lastProcessedAt, START + 30 * 24 * 3_600_000);
});

test("a happy fish earns coins on its persisted variable interval", () => {
  const state = createFreshState(START);
  state.tank.fishes.push(movingFish("fish-coin", 100));

  const early = simulate(state, START + 44_000);
  assert.equal(early.coinsDropped, 0);
  const report = simulate(state, START + 45_000);
  assert.equal(report.coinsDropped, 1);
  assert.equal(state.tank.coinDrops.length, 1);
  assert.equal(state.tank.coinDrops[0].value, 4);
  assert.equal(state.tank.coinDrops[0].x, 0.5);
  assert.equal(state.tank.coinDrops[0].y, 0.5);

  const offline = createFreshState(START);
  offline.tank.fishes.push(movingFish("offline-fish", 100));
  const offlineReport = simulate(offline, START + 45_000, { offline: true });
  assert.equal(offlineReport.coinsDropped, 0);
  assert.equal(offline.tank.coinDrops.length, 0);
  assert.equal(offline.tank.fishes[0].pendingOfflineCoin, true);
});

test("happiness coin value is ten percent of the catalog purchase price", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("stingray-coin", 100), speciesId: "stingray" });

  simulate(state, START + 45_000);
  assert.equal(state.tank.coinDrops[0].value, 2_000);
});

test("low happiness pauses accumulated coin progress without resetting it", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("paused-fish", 20), happinessProgressMs: 30_000 });

  simulate(state, START + 30_000);
  assert.equal(state.tank.fishes[0].happinessProgressMs, 30_000);
  assert.equal(state.tank.coinDrops.length, 0);
});

test("fish without a catalog purchase price do not create happiness coins", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("mermaid-coin", 100), speciesId: "rainbow-mermaid" });

  simulate(state, START + 90_000);
  assert.equal(state.tank.coinDrops.length, 0);
});

test("coin hermit crab automatically collects online coin drops", () => {
  const state = createFreshState(START);
  state.tank.helpers.push({ id: "collector", kind: "coin-hermit-crab", satiety: 100 });
  state.tank.coinDrops.push({ id: "coin-existing", value: 75, expiresAt: START + 60_000 });

  const report = simulate(state, START + 1_000);
  assert.equal(state.player.coins, 375);
  assert.equal(state.tank.coinDrops.length, 0);
  assert.equal(report.coinsCollected, 75);
  assert.equal(report.coinDropsCollected, 1);
});

test("coin hermit crab calculates offline income without duplicate payouts", () => {
  const state = createFreshState(START);
  state.tank.helpers.push({ id: "collector", kind: "coin-hermit-crab", satiety: 100 });
  state.tank.fishes.push(movingFish("offline-collected", 100));

  const report = simulate(state, START + 45_000, { offline: true });
  assert.equal(report.coinDropsCollected, 1);
  assert.equal(report.coinsCollected, 4);
  assert.equal(state.player.coins, 304);
  assert.equal(state.tank.coinDrops.length, 0);

  const duplicate = simulate(state, START + 45_000, { offline: true });
  assert.equal(duplicate.coinsCollected, 0);
  assert.equal(state.player.coins, 304);
});

test("without a collector only one offline happiness reward waits", () => {
  const state = createFreshState(START);
  state.tank.fishes.push(movingFish("offline-pending", 100));
  simulate(state, START + 20 * 60_000, { offline: true });
  assert.equal(state.tank.fishes[0].pendingOfflineCoin, true);
  assert.equal(state.tank.fishes[0].coinsEarnedToday, 1);
  assert.equal(state.tank.fishes[0].happinessProgressMs, 0);
  simulate(state, START + 20 * 60_000 + 1_000);
  assert.equal(state.tank.coinDrops.length, 1);
});

test("each fish respects the daily happiness coin cap", () => {
  const state = createFreshState(START);
  state.tank.helpers.push({ id: "collector", kind: "coin-hermit-crab", satiety: 100 });
  state.tank.fishes.push(movingFish("daily-cap", 100));
  simulate(state, START + 20 * 60_000);
  assert.equal(state.tank.fishes[0].coinsEarnedToday, 12);
  assert.equal(state.player.coins, 348);
});

test("offline time pauses an existing fish disease countdown", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("sick-offline", 80), health: "sick", sickSince: START - 23 * 3_600_000 });
  simulate(state, START + 2 * 3_600_000, { offline: true });
  assert.equal(state.tank.fishes[0].health, "sick");
  simulate(state, START + 3 * 3_600_000);
  assert.equal(state.tank.fishes[0].health, "dead");
});

test("animal steering remains finite and inside the aquarium", () => {
  const fish = {
    id: "fish-1",
    speciesId: "guppy",
    stage: "adult",
    health: "healthy",
    satiety: 80,
    behaviorSeed: 42,
    position: { x: 0.5, y: 0.5 },
    heading: "right",
  };
  const agent = createAgent(fish);
  const agents = [agent];
  const fishById = new Map([[fish.id, fish]]);
  for (let i = 0; i < 2_000; i += 1) stepAgents(agents, fishById, 1 / 60);

  assert.equal(Number.isFinite(agent.x) && Number.isFinite(agent.y), true);
  assert.ok(agent.x >= 40 && agent.x <= 960);
  assert.ok(agent.y >= 75 && agent.y <= 550);
  assert.ok(Math.hypot(agent.vx, agent.vy) <= 70.001);
});

test("only fish below fifty satiety pursue and eat food", () => {
  const fish = movingFish("threshold-fish", 50);
  const agent = createAgent(fish);
  const fishById = new Map([[fish.id, fish]]);
  const food = { id: "threshold-food", x: agent.x, y: agent.y, claimedBy: null, consumed: false };

  assert.deepEqual(stepAgents([agent], fishById, [food], 0), []);
  assert.equal(agent.foodTargetId, null);
  assert.equal(food.consumed, false);

  fish.satiety = 49;
  assert.deepEqual(stepAgents([agent], fishById, [food], 0), [{ foodId: "threshold-food", fishId: "threshold-fish" }]);
  assert.equal(food.consumed, true);

  const secondFood = { id: "second-food", x: agent.x, y: agent.y, claimedBy: null, consumed: false };
  assert.deepEqual(stepAgents([agent], fishById, [secondFood], 0), []);
  assert.equal(secondFood.consumed, false);
});

test("the closest arriving fish consumes an overlapping food exactly once", () => {
  const fishes = [
    movingFish("far-fish", 20),
    movingFish("near-fish", 30),
  ];
  const agents = fishes.map(createAgent);
  agents[0].x = 483;
  agents[1].x = 499;
  const fishById = new Map(fishes.map((fish) => [fish.id, fish]));
  const foods = [{ id: "food-1", x: 500, y: 300, claimedBy: null, consumed: false }];

  const consumed = stepAgents(agents, fishById, foods, 0);
  assert.deepEqual(consumed, [{ foodId: "food-1", fishId: "near-fish" }]);
  assert.equal(foods[0].consumed, true);
});

test("helpers patrol the aquarium floor and turn at the edges", () => {
  const agent = createHelperAgent({ behaviorSeed: 2, position: { x: 0.94, y: 0.86 } });
  const startX = agent.x;
  for (let index = 0; index < 180; index += 1) stepHelperAgent(agent, 24, 1 / 60, index / 60);
  assert.notEqual(agent.x, startX);
  assert.ok(agent.x >= 55 && agent.x <= 945);
  assert.ok(agent.y >= 508 && agent.y <= 516);
  assert.equal(agent.direction, -1);
});

function movingFish(id, satiety) {
  return {
    id,
    speciesId: "guppy",
    stage: "adult",
    health: "healthy",
    satiety,
    behaviorSeed: 42,
    position: { x: 0.5, y: 0.5 },
    heading: "right",
    personalityId: "playful",
    preferredFoodTypeId: "basic-food",
    habitatPreference: "plants",
    sizePotential: 1,
    happiness: 0,
    happinessProgressMs: 0,
    nextHappinessCoinMs: 45_000,
    coinDayKey: "",
    coinsEarnedToday: 0,
    pendingOfflineCoin: false,
  };
}
