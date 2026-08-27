import test from "node:test";
import assert from "node:assert/strict";

import {
  fishSellPrice,
  levelFishCapacity,
  requiredExp,
  stageFromGrowth,
} from "../src/core/calculations.js";

test("level and capacity formulas match the specification", () => {
  assert.equal(requiredExp(1), 110);
  assert.equal(requiredExp(5), 750);
  assert.equal(requiredExp(20), 6000);
  assert.equal(levelFishCapacity(1), 15);
  assert.equal(levelFishCapacity(50, 4), 59);
});

test("growth stages and sale multipliers are deterministic", () => {
  assert.equal(stageFromGrowth(9.99), "egg");
  assert.equal(stageFromGrowth(10), "fry");
  assert.equal(stageFromGrowth(45), "juvenile");
  assert.equal(stageFromGrowth(100), "adult");
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "juvenile", health: "healthy" }), 60);
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "adult", health: "sick", variant: "shiny" }), 100);
  assert.equal(fishSellPrice({ speciesId: "guppy", stage: "egg", health: "healthy" }), 0);
});
