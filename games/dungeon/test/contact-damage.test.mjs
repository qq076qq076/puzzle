import assert from "node:assert/strict";
import test from "node:test";

import { tickContactDamage, tryContactDamage } from "../src/systems/contact-damage.js";

function makeCombatants(overrides = {}) {
  const received = [];
  const attacker = {
    active: true,
    x: 20,
    y: 30,
    state: "chase",
    spawnProtectionRemaining: 0,
    contactDamageCooldownRemaining: 0,
    definition: { name: "測試怪物", damage: 10, contactDamage: 6, contactCooldownMs: 800 },
    scene: { showStatus: () => {} },
    ...overrides.attacker,
  };
  const player = {
    active: true,
    x: 44,
    y: 18,
    health: 100,
    takeDamage: (amount, context) => {
      received.push({ amount, context });
      return true;
    },
    ...overrides.player,
  };
  return { attacker, player, received };
}

test("enemy contact deals configured damage and starts its own cooldown", () => {
  const { attacker, player, received } = makeCombatants();
  assert.equal(tryContactDamage(attacker, player), true);
  assert.deepEqual(received, [{
    amount: 6,
    context: {
      knockback: { x: 24, y: -12, distance: 14, durationMs: 100 },
    },
  }]);
  assert.equal(attacker.contactDamageCooldownRemaining, 800);
  assert.equal(tryContactDamage(attacker, player), false);
});

test("contact damage is disabled during spawn protection and player invulnerability", () => {
  const protectedEnemy = makeCombatants({ attacker: { spawnProtectionRemaining: 1 } });
  assert.equal(tryContactDamage(protectedEnemy.attacker, protectedEnemy.player), false);

  const invulnerablePlayer = makeCombatants({ player: { takeDamage: () => false } });
  assert.equal(tryContactDamage(invulnerablePlayer.attacker, invulnerablePlayer.player), false);
  assert.equal(invulnerablePlayer.attacker.contactDamageCooldownRemaining, 0);
});

test("dash and boss charge attacks do not also deal contact damage", () => {
  for (const state of ["attack", "charge"]) {
    const { attacker, player, received } = makeCombatants({ attacker: { state } });
    assert.equal(tryContactDamage(attacker, player), false);
    assert.deepEqual(received, []);
  }
});

test("contact cooldown ticks down without becoming negative", () => {
  const { attacker } = makeCombatants({ attacker: { contactDamageCooldownRemaining: 500 } });
  tickContactDamage(attacker, 180);
  assert.equal(attacker.contactDamageCooldownRemaining, 320);
  tickContactDamage(attacker, 1000);
  assert.equal(attacker.contactDamageCooldownRemaining, 0);
});

test("contact damage yields to an imminent deliberate attack", () => {
  const { attacker, player, received } = makeCombatants({
    attacker: { attackCooldownRemaining: 500, definition: { name: "測試怪物", damage: 10, contactDamage: 6, contactCooldownMs: 800, windupMs: 400 } },
  });
  attacker.attackCooldownRemaining = attacker.definition.windupMs + 100;
  assert.equal(tryContactDamage(attacker, player), false);
  assert.deepEqual(received, []);

  attacker.attackCooldownRemaining = attacker.definition.windupMs + 400;
  assert.equal(tryContactDamage(attacker, player), true);
  assert.equal(received.length, 1);
});
