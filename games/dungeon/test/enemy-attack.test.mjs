import assert from "node:assert/strict";
import test from "node:test";

import { MONSTERS } from "../src/data/monsters.js";
import { createEnemyDashMotion, getEnemyAttackActiveMs, getEnemyEffectiveAttackRange, getEnemyInitialCooldownMs } from "../src/systems/enemy-attack.js";

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

test("every monster attack keeps a visible active animation window", () => {
  Object.values(MONSTERS).forEach((monster) => {
    assert.ok(getEnemyAttackActiveMs(monster) >= 180, `${monster.id} attack window`);
  });
  assert.equal(getEnemyAttackActiveMs(MONSTERS.goblin_bat), 220);
});

test("numeric and string spawn ids always produce a finite initial attack cooldown", () => {
  for (const sequence of [0, 3, "0-0", "4-9", "boss-2", "corridor-3-1"]) {
    const cooldown = getEnemyInitialCooldownMs(sequence);
    assert.equal(Number.isFinite(cooldown), true, String(sequence));
    assert.ok(cooldown >= 600 && cooldown <= 1050);
  }
  assert.equal(getEnemyInitialCooldownMs("0-0"), getEnemyInitialCooldownMs("0-0"));
});

test("enlarged melee monsters can attack from their physical collision boundary", () => {
  assert.ok(getEnemyEffectiveAttackRange(MONSTERS.rat) > MONSTERS.rat.attackRange);
  assert.ok(getEnemyEffectiveAttackRange(MONSTERS.goblin_bat) > MONSTERS.goblin_bat.attackRange);
  assert.equal(getEnemyEffectiveAttackRange(MONSTERS.goblin_dagger), MONSTERS.goblin_dagger.attackRange);
  assert.equal(getEnemyEffectiveAttackRange(MONSTERS.plague_mage), MONSTERS.plague_mage.attackRange);
});
