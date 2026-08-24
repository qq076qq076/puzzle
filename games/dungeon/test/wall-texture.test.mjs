import assert from "node:assert/strict";
import test from "node:test";

import { FANTASY_WALL_TEXTURE_KEYS } from "../src/data/wall-art.js";
import { getDungeonWallTexture } from "../src/systems/wall-texture.js";

test("generated fantasy walls use only supplied dungeon wall variants", () => {
  const observed = new Set();
  for (let y = 0; y < 20; y += 1) {
    for (let x = 0; x < 20; x += 1) observed.add(getDungeonWallTexture(false, x, y, 32, 32));
  }
  assert.deepEqual([...observed].sort(), [...FANTASY_WALL_TEXTURE_KEYS].sort());
});

test("machine rooms retain their machine wall art", () => {
  assert.equal(getDungeonWallTexture(true, 120, 140, 80, 32), "wall-machine");
});
