import assert from "node:assert/strict";
import test from "node:test";

import { moveMenuSelection } from "../src/ui/menu-selection.js";

test("pause menu selection moves and wraps in both directions", () => {
  assert.equal(moveMenuSelection(0, 1, 2), 1);
  assert.equal(moveMenuSelection(1, 1, 2), 0);
  assert.equal(moveMenuSelection(0, -1, 2), 1);
});

test("pause menu selection handles empty and invalid input", () => {
  assert.equal(moveMenuSelection(0, 1, 0), -1);
  assert.equal(moveMenuSelection(Number.NaN, 0, 2), 0);
});
