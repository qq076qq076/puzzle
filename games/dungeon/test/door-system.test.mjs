import assert from "node:assert/strict";
import test from "node:test";

import { constrainActorToClosedDoor } from "../src/systems/door-system.js";

function makeActor(x) {
  const actor = {
    active: true,
    x,
    y: 290,
    body: {
      halfWidth: 6,
      reset(nextX, nextY) {
        actor.x = nextX;
        actor.y = nextY;
      },
    },
  };
  return actor;
}

function makeDoor(side, isOpen = false) {
  return {
    x: side === "left" ? 40 : 920,
    side,
    isOpen,
    blocker: { body: { halfWidth: 16 } },
  };
}

test("closed side doors keep actors on the room side of the blocker", () => {
  const leftActor = makeActor(32);
  assert.equal(constrainActorToClosedDoor(leftActor, makeDoor("left")), true);
  assert.equal(leftActor.x, 62);

  const rightActor = makeActor(940);
  assert.equal(constrainActorToClosedDoor(rightActor, makeDoor("right")), true);
  assert.equal(rightActor.x, 898);
});

test("open doors do not constrain actors crossing the doorway", () => {
  const actor = makeActor(32);
  assert.equal(constrainActorToClosedDoor(actor, makeDoor("left", true)), false);
  assert.equal(actor.x, 32);
});
