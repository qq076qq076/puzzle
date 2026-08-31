import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

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

test("every decoration and collectible coin has a runtime animation strip", () => {
  const decorationDirectory = new URL("../assets/runtime/decorations/", import.meta.url);
  const animated = readdirSync(decorationDirectory).filter((name) => name.endsWith("-animated.png"));
  assert.equal(animated.length, 30);
  for (const name of animated) assert.deepEqual(pngSize(new URL(name, decorationDirectory)), [192, 64], name);
  assert.deepEqual(pngSize(new URL("../assets/runtime/objects/coin-spin.png", import.meta.url)), [256, 64]);
});

function pngSize(url) {
  const buffer = readFileSync(url);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
