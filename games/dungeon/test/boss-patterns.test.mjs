import assert from "node:assert/strict";
import test from "node:test";

import { BOSS_ATTACKS, BOSS_PHASE_PATTERNS, BOSS_PHASE_TRANSITION_MS, getBossAttack, getBossVolleyOffsets } from "../src/data/boss-patterns.js";

test("boss phases rotate through distinct attack sets", () => {
  assert.deepEqual(BOSS_PHASE_PATTERNS[1], ["combo", "volley", "charge"]);
  assert.ok(BOSS_PHASE_PATTERNS[2].includes("summon"));
  assert.ok(BOSS_PHASE_PATTERNS[3].includes("mine"));
  assert.equal(getBossAttack(2, 1).kind, "summon");
});

test("every boss attack leaves a long melee counter window", () => {
  Object.values(BOSS_ATTACKS).forEach((attack) => {
    assert.ok(attack.windupMs >= 500);
    assert.ok(attack.recoverMs >= 900);
    assert.ok(attack.cooldownMs >= 1400);
  });
  assert.ok(BOSS_PHASE_TRANSITION_MS >= 1500);
});

test("boss projectile fan widens by phase without losing its center shot", () => {
  assert.deepEqual(getBossVolleyOffsets(1), [-0.3, 0, 0.3]);
  assert.equal(getBossVolleyOffsets(2).length, 5);
  assert.equal(getBossVolleyOffsets(3).length, 7);
  assert.ok(getBossVolleyOffsets(3).includes(0));
});
