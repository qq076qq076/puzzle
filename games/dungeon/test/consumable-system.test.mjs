import assert from "node:assert/strict";
import test from "node:test";

import { useEmergencyPotion } from "../src/systems/consumable-system.js";

test("emergency potion heals, decrements inventory, and reports the result", () => {
  const player = { health: 72, maxHealth: 100, consumables: 2 };
  assert.deepEqual(useEmergencyPotion(player), {
    used: true,
    healed: 28,
    remaining: 1,
    message: "使用緊急藥瓶 · 恢復 28 HP",
  });
  assert.deepEqual(player, { health: 100, maxHealth: 100, consumables: 1 });
});

test("potion failures keep the inventory and explain why", () => {
  const empty = { health: 50, maxHealth: 100, consumables: 0 };
  assert.equal(useEmergencyPotion(empty).reason, "empty");
  assert.equal(empty.consumables, 0);

  const full = { health: 100, maxHealth: 100, consumables: 1 };
  assert.equal(useEmergencyPotion(full).reason, "full_health");
  assert.equal(full.consumables, 1);
});
