import test from "node:test";
import assert from "node:assert/strict";

import { createAgent, stepAgents } from "../src/core/animal-ai.js";
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
  assert.equal(state.tank.coinDrops[0].value, 3);

  const offline = createFreshState(START);
  offline.tank.fishes.push({ ...movingFish("offline-fish", 80), acquiredAt: START, nextCoinAt: START + 30_000 });
  const offlineReport = simulate(offline, START + 30_000, { offline: true });
  assert.equal(offlineReport.coinsDropped, 0);
  assert.equal(offline.tank.coinDrops.length, 0);
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
