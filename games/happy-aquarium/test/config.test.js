import test from "node:test";
import assert from "node:assert/strict";

import { DECORATIONS, DEVICES, HELPERS, SPECIES } from "../src/config/game-config.js";

test("every ownership prerequisite references a known catalog item", () => {
  const items = [...SPECIES, ...HELPERS, ...DEVICES, ...DECORATIONS];
  const ids = new Set(items.map((item) => item.id));
  assert.equal(ids.size, items.length);

  for (const item of items) {
    assert.equal(Array.isArray(item.requires), true, `${item.id} must define requires`);
    for (const requiredId of item.requires) {
      assert.equal(ids.has(requiredId), true, `${item.id} requires unknown item ${requiredId}`);
      assert.notEqual(requiredId, item.id);
    }
  }
});
