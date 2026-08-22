import assert from "node:assert/strict";
import test from "node:test";

import { startKnockback, updateKnockback } from "../src/systems/knockback.js";

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
