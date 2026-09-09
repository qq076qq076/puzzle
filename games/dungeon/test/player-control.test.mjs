import assert from "node:assert/strict";
import test from "node:test";

import {
  canDodgeCancelAttack,
  getAssistedAttackFacing,
  getAttackMoveMultiplier,
  getMoveIntent,
} from "../src/systems/player-control.js";

test("movement preserves analog stick strength while normalizing keyboard diagonals", () => {
  assert.deepEqual(getMoveIntent(0, 0), { x: 0, y: 0, magnitude: 0 });
  assert.deepEqual(getMoveIntent(0.3, 0.4), { x: 0.6, y: 0.8, magnitude: 0.5 });
  const diagonal = getMoveIntent(1, 1);
  assert.equal(diagonal.magnitude, 1);
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 0.0001);
  assert.ok(Math.abs(diagonal.y - Math.SQRT1_2) < 0.0001);
});

test("an attack gains weight without locking movement completely", () => {
  assert.equal(getAttackMoveMultiplier({ attackRemaining: 0 }), 1);
  assert.equal(getAttackMoveMultiplier({ attackRemaining: 100, attackHitResolved: false }), 0.48);
  assert.equal(getAttackMoveMultiplier({ attackRemaining: 100, attackHitResolved: true }), 0.72);
  assert.equal(canDodgeCancelAttack({ attackRemaining: 100, attackHitResolved: false }), false);
  assert.equal(canDodgeCancelAttack({ attackRemaining: 100, attackHitResolved: true }), true);
});

test("melee aim assist only selects a nearby target in a reasonable forward cone", () => {
  const player = { x: 100, y: 100, attackRange: 88, facing: { x: 1, y: 0 } };
  const front = { x: 160, y: 118, health: 10, active: true };
  const behind = { x: 55, y: 100, health: 10, active: true };
  const facing = getAssistedAttackFacing(player, [behind, front]);
  assert.ok(facing.x > 0.9);
  assert.ok(facing.y > 0);
  assert.deepEqual(getAssistedAttackFacing(player, [behind]), { x: 1, y: 0 });
});
