import assert from "node:assert/strict";
import test from "node:test";

import { MONSTERS } from "../src/data/monsters.js";
import { createEnemyDashMotion } from "../src/systems/enemy-attack.js";

test("dagger goblin proactively starts a telegraphed dash from medium range", () => {
  const dagger = MONSTERS.goblin_dagger;
  assert.equal(dagger.attackKind, "dash");
  assert.equal(dagger.attackRange, 88);
  assert.equal(dagger.windupMs, 220);

  const motion = createEnemyDashMotion(dagger, 60, 80);
  assert.deepEqual(motion, {
    velocityX: 180,
    velocityY: 240,
    durationMs: 180,
    hitRange: 38,
    knockbackDistance: 18,
  });
});

test("non-dash attacks and overlapping targets do not create dash motion", () => {
  assert.equal(createEnemyDashMotion(MONSTERS.goblin_bat, 10, 0), null);
  assert.equal(createEnemyDashMotion(MONSTERS.goblin_dagger, 0, 0), null);
});
