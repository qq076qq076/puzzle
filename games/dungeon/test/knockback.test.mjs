import assert from "node:assert/strict";
import test from "node:test";

import { constrainActorToBounds, startKnockback, updateKnockback } from "../src/systems/knockback.js";

function makeActor() {
  return {
    velocity: { x: 0, y: 0 },
    setVelocity(x, y) {
      this.velocity = { x, y };
    },
  };
}

test("knockback keeps a normalized impulse active for its configured duration", () => {
  const actor = makeActor();
  assert.equal(startKnockback(actor, { x: 3, y: 4, distance: 20, durationMs: 100 }), true);
  assert.equal(actor.knockbackRemaining, 100);
  assert.equal(Math.round(actor.velocity.x), 120);
  assert.equal(Math.round(actor.velocity.y), 160);

  actor.setVelocity(0, 0);
  assert.equal(updateKnockback(actor, 40), true);
  assert.equal(actor.knockbackRemaining, 60);
  assert.equal(Math.round(actor.velocity.x), 120);
  assert.equal(Math.round(actor.velocity.y), 160);
  assert.equal(updateKnockback(actor, 80), true);
  assert.equal(actor.knockbackRemaining, 0);
  assert.equal(updateKnockback(actor, 16), false);
});

test("knockback ignores missing directions and supports an explicit speed", () => {
  const actor = makeActor();
  assert.equal(startKnockback(actor, { x: 0, y: 0 }), false);
  assert.equal(startKnockback(actor, { x: -2, y: 0, speed: 90, durationMs: 80 }), true);
  assert.equal(actor.velocity.x, -90);
  assert.equal(actor.velocity.y, 0);
});

test("wall contact cancels knockback instead of reapplying velocity into the wall", () => {
  const actor = makeActor();
  actor.body = { blocked: { right: true }, touching: {} };
  startKnockback(actor, { x: 1, y: 0, distance: 20, durationMs: 100 });
  assert.equal(updateKnockback(actor, 16), true);
  assert.equal(actor.knockbackRemaining, 0);
  assert.deepEqual(actor.velocity, { x: 0, y: 0 });
});

test("actors outside arena bounds are reset inside and lose knockback", () => {
  const actor = makeActor();
  actor.active = true;
  actor.x = 950;
  actor.y = 40;
  actor.knockbackRemaining = 80;
  actor.body = {
    halfWidth: 10,
    halfHeight: 12,
    reset(x, y) {
      actor.x = x;
      actor.y = y;
    },
  };
  assert.equal(constrainActorToBounds(actor, { left: 56, right: 904, top: 92, bottom: 488 }), true);
  assert.deepEqual({ x: actor.x, y: actor.y }, { x: 894, y: 104 });
  assert.equal(actor.knockbackRemaining, 0);
});
