import test from "node:test";
import assert from "node:assert/strict";
import { applyReward, getUsableRewardIds } from "../src/systems/reward-system.js";

function makePlayer() {
  return {
    attackDamage: 20,
    attackRange: 72,
    attackArcDeg: 100,
    attackCooldownMs: 450,
    moveSpeed: 192,
    maxHealth: 100,
    health: 40,
    damageReduction: 0,
    knockbackMultiplier: 1,
    bleedDamage: 0,
    lifestealAmount: 0,
    machineResonanceStacks: 0,
    machineDamageMultiplier: 1,
    buffs: [],
    buffStacks: {},
    gold: 0,
    consumables: 0,
  };
}

test("reward types update the run build", () => {
  const player = makePlayer();
  assert.equal(applyReward(player, "minor_heal").amount, 20);
  assert.equal(player.health, 60);
  assert.equal(applyReward(player, "emergency_vial").amount, 35);
  assert.equal(player.consumables, 1);
  assert.equal(applyReward(player, "gold_cache").amount, 25);
  assert.equal(player.gold, 25);
});

test("a maxed buff converts to gold and unusable choices fall back", () => {
  const player = makePlayer();
  for (let index = 0; index < 5; index += 1) assert.equal(applyReward(player, "sharp_edge").applied, true);
  const converted = applyReward(player, "sharp_edge");
  assert.equal(converted.converted, true);
  assert.equal(player.gold, 10);
  assert.deepEqual(getUsableRewardIds(player, ["sharp_edge"]), ["minor_heal", "gold_cache", "emergency_vial"]);
});

test("boss trophy is a fixed completion reward", () => {
  const player = makePlayer();
  const result = applyReward(player, "boss_trophy");
  assert.equal(result.type, "trophy");
  assert.equal(player.trophy, true);
});
