import assert from "node:assert/strict";
import test from "node:test";

import { canClaimCorridorChest, claimCorridorChest, getCorridorTrapPhase } from "../src/systems/corridor-events.js";

test("corridor traps expose warning before their active damage window", () => {
  assert.equal(getCorridorTrapPhase(1500), "idle");
  assert.equal(getCorridorTrapPhase(1600), "warning");
  assert.equal(getCorridorTrapPhase(2150), "active");
  assert.equal(getCorridorTrapPhase(2570), "idle");
});

test("nearby corridor chests grant their reward exactly once", () => {
  const player = { x: 10, y: 10, gold: 3, consumables: 0 };
  const chest = { x: 20, y: 10, active: true, reward: { type: "gold", amount: 17 } };
  assert.equal(canClaimCorridorChest(player, chest), true);
  assert.deepEqual(claimCorridorChest(player, chest), { claimed: true, type: "gold", amount: 17, message: "寶箱：金幣 +17" });
  assert.equal(player.gold, 20);
  assert.equal(claimCorridorChest(player, chest).claimed, false);
});

test("corridor chests can grant usable potions", () => {
  const player = { x: 0, y: 0, gold: 0, consumables: 1 };
  const chest = { x: 0, y: 0, active: true, reward: { type: "potion", amount: 1 } };
  assert.equal(claimCorridorChest(player, chest).claimed, true);
  assert.equal(player.consumables, 2);
});
