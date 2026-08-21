import test from "node:test";
import assert from "node:assert/strict";
import { applyBuff } from "../src/systems/buff-system.js";

test("buff application updates player build and records the id", () => {
  const player = {
    attackDamage: 20,
    moveSpeed: 190,
    maxHealth: 100,
    health: 70,
    attackRange: 72,
    attackArcDeg: 100,
    damageReduction: 0,
    bleedDamage: 0,
    machineDamageMultiplier: 1,
    buffs: [],
  };
  assert.equal(applyBuff(player, "sharp_edge"), true);
  assert.equal(applyBuff(player, "vital_core"), true);
  assert.equal(player.attackDamage, 24);
  assert.equal(player.maxHealth, 120);
  assert.equal(player.health, 90);
  assert.deepEqual(player.buffs, ["sharp_edge", "vital_core"]);
});

test("unknown buff ids are rejected without changing the player", () => {
  const player = { buffs: [], attackDamage: 20 };
  assert.equal(applyBuff(player, "missing"), false);
  assert.deepEqual(player, { buffs: [], attackDamage: 20 });
});
