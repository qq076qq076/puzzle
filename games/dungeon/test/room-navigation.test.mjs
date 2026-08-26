import assert from "node:assert/strict";
import test from "node:test";

import { keepActorOnRoomFloor } from "../src/systems/room-navigation.js";

function makeActor(x, y) {
  const actor = {
    active: true,
    x,
    y,
    velocity: { x: 0, y: 0 },
    knockbackRemaining: 50,
    body: {
      halfWidth: 12,
      halfHeight: 12,
      reset(nextX, nextY) {
        actor.x = nextX;
        actor.y = nextY;
      },
    },
    setVelocity(nextX, nextY) {
      this.velocity = { x: nextX, y: nextY };
    },
  };
  return actor;
}

test("wall recovery returns an actor to its immediately previous floor position", () => {
  const actor = makeActor(300, 300);
  const obstacles = [[400, 240, 64, 120]];
  assert.equal(keepActorOnRoomFloor(actor, obstacles), false);
  assert.deepEqual(actor.lastWalkableFloor, { x: 300, y: 300 });

  actor.x = 420;
  actor.y = 280;
  assert.equal(keepActorOnRoomFloor(actor, obstacles), true);
  assert.deepEqual({ x: actor.x, y: actor.y }, { x: 300, y: 300 });
  assert.equal(actor.knockbackRemaining, 0);
  assert.deepEqual(actor.velocity, { x: 0, y: 0 });
});

test("an actor without history recovers to nearby floor instead of a room entrance", () => {
  const actor = makeActor(50, 300);
  assert.equal(keepActorOnRoomFloor(actor, []), true);
  assert.ok(actor.x > 50);
  assert.ok(Math.hypot(actor.x - 50, actor.y - 300) <= 96);
  assert.notDeepEqual({ x: actor.x, y: actor.y }, { x: 92, y: 290 });
});
