import assert from "node:assert/strict";
import test from "node:test";

import { hasCrossedExit } from "../src/systems/room-transition.js";

test("a right-side exit changes rooms only after crossing its door line", () => {
  const room = { exitSide: "right", exitTrigger: [930, 290] };
  assert.equal(hasCrossedExit({ x: 876, y: 290 }, room), false);
  assert.equal(hasCrossedExit({ x: 920, y: 290 }, room), false);
  assert.equal(hasCrossedExit({ x: 930, y: 290 }, room), true);
  assert.equal(hasCrossedExit({ x: 940, y: 350 }, room), false);
});

test("exit crossing supports the opposite doorway directions", () => {
  assert.equal(hasCrossedExit({ x: 30, y: 290 }, { exitSide: "left", exitTrigger: [30, 290] }), true);
  assert.equal(hasCrossedExit({ x: 480, y: 80 }, { exitSide: "up", exitTrigger: [480, 80] }), true);
  assert.equal(hasCrossedExit({ x: 480, y: 510 }, { exitSide: "down", exitTrigger: [480, 510] }), true);
});
