import assert from "node:assert/strict";
import test from "node:test";

import { closeSideDoor, constrainActorToClosedDoor, openSideDoor } from "../src/systems/door-system.js";

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

function makeAnimatedDoor() {
  const group = {
    children: new Set(),
    add(blocker) {
      this.children.add(blocker);
    },
    remove(blocker) {
      this.children.delete(blocker);
    },
    contains(blocker) {
      return this.children.has(blocker);
    },
  };
  const blocker = {
    body: { halfWidth: 16 },
    disableBody() {
      this.body.enabled = false;
      return this;
    },
    enableBody() {
      this.body.enabled = true;
      return this;
    },
    setVisible() { return this; },
    setDisplaySize() { return this; },
    refreshBody() { return this; },
  };
  const visual = {
    once(_event, callback) {
      this.callback = callback;
      return this;
    },
    setVisible() { return this; },
    setAlpha() { return this; },
    setFrame() { return this; },
    anims: {
      play() {},
      playReverse() {},
    },
  };
  group.add(blocker);
  return { x: 920, y: 290, side: "right", walls: group, blocker, visual, isOpen: false, isAnimating: false };
}

test("opening removes the static blocker and closing restores it", () => {
  const door = makeAnimatedDoor();
  assert.equal(openSideDoor(door), true);
  assert.equal(door.blocker.body.enabled, false);
  assert.equal(door.walls.contains(door.blocker), false);

  assert.equal(closeSideDoor(door), true);
  assert.equal(door.walls.contains(door.blocker), true);
  assert.equal(door.blocker.body.enabled, true);
});
