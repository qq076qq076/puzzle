import test from "node:test";
import assert from "node:assert/strict";

import {
  fallingFoodY,
  fishSellPrice,
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

test("food falls slowly from its click point and stops at the sand", () => {
  const food = { y: 0.25, createdAt: 1_000 };
  assert.equal(fallingFoodY(food, 1_000), 150);
  assert.equal(fallingFoodY(food, 3_000), 198);
  assert.equal(fallingFoodY(food, 30_000), 520);
});
