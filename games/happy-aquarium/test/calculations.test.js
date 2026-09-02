import test from "node:test";
import assert from "node:assert/strict";

import {
  environmentComfort,
  fallingDropY,
  fallingFoodY,
  fishSellPrice,
  fishHappiness,
  stageFromGrowth,
} from "../src/core/calculations.js";

test("growth stages and sale multipliers are deterministic", () => {
  assert.equal(stageFromGrowth(9.99), "egg");
  assert.equal(stageFromGrowth(10), "fry");
  assert.equal(stageFromGrowth(45), "juvenile");
  assert.equal(stageFromGrowth(100), "adult");
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "juvenile", health: "healthy" }), 60);
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "adult", health: "sick", variant: "shiny" }), 100);
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "egg", health: "healthy" }), 0);
});

test("matching habitat decorations raise comfort and happiness", () => {
  const fish = { speciesId: "clownfish", stage: "adult", health: "healthy", satiety: 100, familiarity: 50, habitatPreference: "corals" };
  const bare = { tank: { cleanliness: 100, decorations: [] } };
  const decorated = { tank: { cleanliness: 100, decorations: [{ catalogId: "pink-branch-coral" }] } };
  assert.ok(environmentComfort(decorated, fish) > environmentComfort(bare, fish));
  assert.ok(fishHappiness(decorated, fish) > fishHappiness(bare, fish));
  assert.equal(fishHappiness(decorated, { ...fish, health: "sick" }), 45);
});

test("coins sink more slowly and stop above the sand", () => {
  const coin = { y: 0.4, createdAt: 1_000 };
  assert.equal(fallingDropY(coin, 1_000, { speed: 16, floor: 510 }), 240);
  assert.equal(fallingDropY(coin, 3_000, { speed: 16, floor: 510 }), 272);
  assert.equal(fallingDropY(coin, 30_000, { speed: 16, floor: 510 }), 510);
});

test("food falls slowly from its click point and stops at the sand", () => {
  const food = { y: 0.25, createdAt: 1_000 };
  assert.equal(fallingFoodY(food, 1_000), 150);
  assert.equal(fallingFoodY(food, 3_000), 198);
  assert.equal(fallingFoodY(food, 30_000), 520);
});
