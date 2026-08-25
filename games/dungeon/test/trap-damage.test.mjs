import assert from "node:assert/strict";
import test from "node:test";

import { resetTrapVictims, resolveActiveTrapHits } from "../src/systems/trap-damage.js";

function target(x, y, result = { hit: true }) {
  return {
    active: true,
    x,
    y,
    calls: [],
    takeDamage(amount) {
      this.calls.push(amount);
      return result;
    },
  };
}

test("an active floor spike damages the player and every nearby monster once per cycle", () => {
  const trap = { active: true, x: 100, y: 100, damagedActors: new Set() };
  const player = target(110, 100, true);
  const rat = target(90, 105);
  const distantMage = target(180, 100);
  const targets = [
    { actor: player, damage: 12, kind: "player" },
    { actor: rat, damage: 18, kind: "enemy" },
    { actor: distantMage, damage: 18, kind: "enemy" },
  ];

  assert.deepEqual(resolveActiveTrapHits(trap, targets).map(({ kind }) => kind), ["player", "enemy"]);
  assert.deepEqual(player.calls, [12]);
  assert.deepEqual(rat.calls, [18]);
  assert.deepEqual(distantMage.calls, []);
  assert.deepEqual(resolveActiveTrapHits(trap, targets), []);

  resetTrapVictims(trap);
  assert.equal(resolveActiveTrapHits(trap, targets).length, 2);
});

test("idle spikes and invulnerable actors are not recorded as victims", () => {
  const invulnerable = target(100, 100, false);
  const trap = { active: false, x: 100, y: 100, damagedActors: new Set() };
  const targets = [{ actor: invulnerable, damage: 12, kind: "player" }];
  assert.deepEqual(resolveActiveTrapHits(trap, targets), []);
  trap.active = true;
  assert.deepEqual(resolveActiveTrapHits(trap, targets), []);
  assert.equal(trap.damagedActors.has(invulnerable), false);
});
