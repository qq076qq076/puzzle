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

test("hatched fish periodically drop collectible coins only while online", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({
    ...movingFish("fish-coin", 80),
    acquiredAt: START,
    nextCoinAt: START + 30_000,
  });

  const report = simulate(state, START + 30_000);
  assert.equal(report.coinsDropped, 1);
  assert.equal(state.tank.coinDrops.length, 1);
  assert.equal(state.tank.coinDrops[0].value, 4);
  assert.equal(state.tank.coinDrops[0].x, 0.5);
  assert.equal(state.tank.coinDrops[0].y, 0.5);

  const offline = createFreshState(START);
  offline.tank.fishes.push({ ...movingFish("offline-fish", 80), acquiredAt: START, nextCoinAt: START + 30_000 });
  const offlineReport = simulate(offline, START + 30_000, { offline: true });
  assert.equal(offlineReport.coinsDropped, 0);
  assert.equal(offline.tank.coinDrops.length, 0);
});

test("periodic coin value is ten percent of the catalog purchase price", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("stingray-coin", 80), speciesId: "stingray", acquiredAt: START, nextCoinAt: START + 30_000 });

  simulate(state, START + 30_000);
  assert.equal(state.tank.coinDrops[0].value, 2_000);
});

test("fish without a catalog purchase price do not create periodic coins", () => {
  const state = createFreshState(START);
  state.tank.fishes.push({ ...movingFish("mermaid-coin", 80), speciesId: "rainbow-mermaid", acquiredAt: START, nextCoinAt: START + 30_000 });

  simulate(state, START + 30_000);
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
  state.tank.fishes.push({ ...movingFish("offline-collected", 80), acquiredAt: START, nextCoinAt: START + 30_000 });

  const report = simulate(state, START + 90_000, { offline: true });
  assert.equal(report.coinDropsCollected, 3);
  assert.equal(report.coinsCollected, 12);
  assert.equal(state.player.coins, 312);
  assert.equal(state.tank.coinDrops.length, 0);

  const duplicate = simulate(state, START + 90_000, { offline: true });
  assert.equal(duplicate.coinsCollected, 0);
  assert.equal(state.player.coins, 312);
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

test("one food claim can only be consumed by one fish", () => {
  const fishes = [
    movingFish("fish-1", 20),
    movingFish("fish-2", 30),
  ];
  const agents = fishes.map(createAgent);
  const fishById = new Map(fishes.map((fish) => [fish.id, fish]));
  const foods = [{ id: "food-1", x: 500, y: 300, claimedBy: null, consumed: false }];

  const consumed = stepAgents(agents, fishById, foods, 1 / 60);
  assert.equal(consumed.length, 1);
  assert.equal(consumed[0].foodId, "food-1");
  assert.equal(new Set(consumed.map((item) => item.fishId)).size, 1);
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
  };
}
