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
