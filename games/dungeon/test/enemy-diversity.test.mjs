import assert from "node:assert/strict";
import test from "node:test";

import { MONSTERS, NORMAL_MONSTER_POOLS } from "../src/data/monsters.js";
import { getRangedMovement, isRangedAttack } from "../src/systems/enemy-behavior.js";
import { getEnemyProjectilePattern } from "../src/systems/projectile-patterns.js";

test("monster durability rises as movement speed falls", () => {
  const monsters = Object.values(MONSTERS).sort((first, second) => first.maxHealth - second.maxHealth);
  monsters.forEach((monster, index) => {
    if (index === 0) return;
    assert.ok(monster.speed <= monsters[index - 1].speed, `${monster.id} should not outrun a lower-health monster`);
  });
});

test("all regular monsters use the enlarged display scale", () => {
  for (const monster of Object.values(MONSTERS)) {
    assert.ok(monster.scale >= 2, `${monster.id} should render at the enlarged scale`);
  }
  assert.ok(MONSTERS.rat.scale > 2);
  assert.ok(MONSTERS.machine_guard.scale > MONSTERS.robot_gunner.scale);
});

test("mage and robot use distinct telegraphed ranged patterns", () => {
  assert.equal(isRangedAttack(MONSTERS.plague_mage.attackKind), true);
  assert.equal(MONSTERS.plague_mage.projectileTexture, "spell-projectile");
  assert.equal(MONSTERS.plague_mage.projectileAnimation, "spell-projectile-flight");
  assert.equal(MONSTERS.plague_mage.projectileScale, 0.09);
  assert.equal(getEnemyProjectilePattern(MONSTERS.plague_mage).length, 1);
  assert.equal(isRangedAttack(MONSTERS.robot_gunner.attackKind), true);
  assert.equal(getEnemyProjectilePattern(MONSTERS.robot_gunner).length, 3);
  assert.ok(NORMAL_MONSTER_POOLS[3].includes("plague_mage"));
  assert.ok(NORMAL_MONSTER_POOLS[3].includes("robot_gunner"));
});

test("the remaining fantasy character sheets appear as distinct monsters", () => {
  assert.equal(MONSTERS.tomb_scout.attackKind, "dash");
  assert.equal(MONSTERS.crypt_archer.attackKind, "ranged");
  assert.equal(MONSTERS.crypt_archer.projectileTexture, "fantasy-arrow");
  assert.equal(MONSTERS.void_knight.attackKind, "melee");
  assert.ok(NORMAL_MONSTER_POOLS.flat().includes("tomb_scout"));
  assert.ok(NORMAL_MONSTER_POOLS.flat().includes("crypt_archer"));
  assert.ok(NORMAL_MONSTER_POOLS.flat().includes("void_knight"));
});

test("mage fires a visible fireball and robot uses a laser projectile", () => {
  assert.equal(MONSTERS.plague_mage.attackKind, "spell");
  assert.equal(MONSTERS.plague_mage.projectileTexture, "spell-projectile");
  assert.equal(MONSTERS.plague_mage.projectileVisual, "fireball");
  assert.equal(MONSTERS.robot_gunner.attackKind, "laser");
  assert.equal(MONSTERS.robot_gunner.projectileTexture, "laser-projectile");
  assert.equal(MONSTERS.robot_gunner.projectileVisual, "laser");
});

test("ranged enemies retreat, strafe, and approach around their preferred range", () => {
  const definition = MONSTERS.robot_gunner;
  assert.equal(getRangedMovement(definition, 100, 0, 100).mode, "retreat");
  assert.equal(getRangedMovement(definition, 240, 0, 240).mode, "strafe");
  assert.equal(getRangedMovement(definition, 350, 0, 350).mode, "approach");
});
