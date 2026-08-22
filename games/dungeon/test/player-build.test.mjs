import assert from "node:assert/strict";
import test from "node:test";

import { applyPlayerBuild, capturePlayerBuild, normalizeRunBuild } from "../src/systems/player-build.js";

function makePlayer() {
  return {
    maxHealth: 100,
    health: 100,
    gold: 0,
    consumables: 0,
    trophy: false,
    lifestealTriggers: 5,
    attackDamage: 20,
    attackRange: 88,
    attackArcDeg: 100,
    attackCooldownMs: 450,
    moveSpeed: 192,
    buffs: [],
    buffStacks: {},
  };
}

test("run build normalization copies mutable values and fills defaults", () => {
  const source = { buffs: ["sharp_edge"], health: 75 };
  const normalized = normalizeRunBuild(source);
  assert.deepEqual(normalized, { buffs: ["sharp_edge"], health: 75, gold: 0, consumables: 0, trophy: false });
  assert.notEqual(normalized.buffs, source.buffs);
});

test("player build applies buffs and round-trips corridor state", () => {
  const player = makePlayer();
  applyPlayerBuild(player, { buffs: ["sharp_edge"], health: 72, gold: 13, consumables: 2, trophy: true }, { resetRoomTriggers: true });
  assert.equal(player.attackDamage, 24);
  assert.equal(player.health, 72);
  assert.equal(player.lifestealTriggers, 0);
  assert.deepEqual(capturePlayerBuild(player), {
    buffs: ["sharp_edge"],
    health: 72,
    gold: 13,
    consumables: 2,
    trophy: true,
  });
});
