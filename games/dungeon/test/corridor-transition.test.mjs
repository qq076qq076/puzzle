import assert from "node:assert/strict";
import test from "node:test";

import { hasReachedCorridorExit } from "../src/systems/corridor-transition.js";

test("corridor transition requires crossing the exit line inside the doorway", () => {
  const exit = [800, 300];
  assert.equal(hasReachedCorridorExit({ x: 799, y: 300 }, exit), false);
  assert.equal(hasReachedCorridorExit({ x: 800, y: 300 }, exit), true);
  assert.equal(hasReachedCorridorExit({ x: 820, y: 353 }, exit), false);
});
