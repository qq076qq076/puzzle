import assert from "node:assert/strict";
import test from "node:test";

import { isCorridorAmbushCleared, shouldTriggerCorridorAmbush } from "../src/systems/corridor-ambush.js";

test("corridor ambush triggers only when an active player reaches its trigger", () => {
  const ambush = { state: "pending", trigger: [100, 120] };
  assert.equal(shouldTriggerCorridorAmbush(ambush, { active: true, x: 124, y: 120 }, 40), true);
  assert.equal(shouldTriggerCorridorAmbush(ambush, { active: true, x: 140, y: 120 }, 40), false);
  assert.equal(shouldTriggerCorridorAmbush({ ...ambush, state: "active" }, { active: true, x: 100, y: 120 }, 40), false);
});

test("corridor doors reopen only after every ambush spawn and enemy is gone", () => {
  const ambush = { state: "active" };
  assert.equal(isCorridorAmbushCleared(ambush, 1, []), false);
  assert.equal(isCorridorAmbushCleared(ambush, 0, [{ active: true }]), false);
  assert.equal(isCorridorAmbushCleared(ambush, 0, [{ active: false }]), true);
});
