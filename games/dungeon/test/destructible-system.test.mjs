import assert from "node:assert/strict";
import test from "node:test";

import { applyBottleDrop, rollBottleDrop } from "../src/systems/destructible-system.js";

function makeRng(values, integer = 9) {
  let index = 0;
  return {
    next() {
      return values[index++] ?? 0;
    },
    int() {
      return integer;
    },
  };
}

test("bottles can be empty or contain gold, healing, and potions", () => {
  assert.equal(rollBottleDrop(makeRng([0.9])), null);
  assert.deepEqual(rollBottleDrop(makeRng([0.2, 0.3], 11)), { type: "gold", amount: 11 });
  assert.deepEqual(rollBottleDrop(makeRng([0.2, 0.7], 14)), { type: "heal", amount: 14 });
  assert.deepEqual(rollBottleDrop(makeRng([0.2, 0.95])), { type: "potion", amount: 1 });
});

test("bottle drops update player inventory and health", () => {
  const player = { gold: 0, consumables: 0, health: 50, maxHealth: 100 };
  assert.equal(applyBottleDrop(player, { type: "gold", amount: 8 }).collected, true);
  assert.equal(player.gold, 8);
  assert.equal(applyBottleDrop(player, { type: "potion", amount: 1 }).collected, true);
  assert.equal(player.consumables, 1);
  assert.equal(applyBottleDrop(player, { type: "heal", amount: 15 }).collected, true);
  assert.equal(player.health, 65);
  player.health = 100;
  assert.equal(applyBottleDrop(player, { type: "heal", amount: 15 }).collected, false);
});
