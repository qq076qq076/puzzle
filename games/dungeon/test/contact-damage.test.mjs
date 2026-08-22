import assert from "node:assert/strict";
import test from "node:test";

import { tickContactDamage, tryContactDamage } from "../src/systems/contact-damage.js";

function makeCombatants(overrides = {}) {
  const received = [];
  const attacker = {
    active: true,
    state: "chase",
    spawnProtectionRemaining: 0,
    contactDamageCooldownRemaining: 0,
    definition: { name: "測試怪物", damage: 10, contactDamage: 6, contactCooldownMs: 800 },
    scene: { showStatus: () => {} },
    ...overrides.attacker,
  };
  const player = {
    active: true,
    health: 100,
    takeDamage: (amount) => {
      received.push(amount);
      return true;
    },
    ...overrides.player,
  };
  return { attacker, player, received };
}

test("enemy contact deals configured damage and starts its own cooldown", () => {
  const { attacker, player, received } = makeCombatants();
  assert.equal(tryContactDamage(attacker, player), true);
  assert.deepEqual(received, [6]);
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

test("contact cooldown ticks down without becoming negative", () => {
  const { attacker } = makeCombatants({ attacker: { contactDamageCooldownRemaining: 500 } });
  tickContactDamage(attacker, 180);
  assert.equal(attacker.contactDamageCooldownRemaining, 320);
  tickContactDamage(attacker, 1000);
  assert.equal(attacker.contactDamageCooldownRemaining, 0);
});
