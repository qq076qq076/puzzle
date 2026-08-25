import assert from "node:assert/strict";
import test from "node:test";

import { FANTASY_WALL_TEXTURE_KEYS, FANTASY_WALL_TEXTURES } from "../src/data/wall-art.js";
import { getDungeonWallTexture } from "../src/systems/wall-texture.js";

test("fantasy horizontal, vertical, and corner models use distinct supplied tiles", () => {
  const roles = Object.keys(FANTASY_WALL_TEXTURES);
  const textures = roles.map((role) => getDungeonWallTexture(false, 0, 0, 32, 32, role));
  assert.equal(roles.length, 8);
  assert.equal(new Set(textures).size, roles.length);
  assert.deepEqual(textures.sort(), [...FANTASY_WALL_TEXTURE_KEYS].sort());
  assert.equal(getDungeonWallTexture(false, 200, 76, 200, 32), FANTASY_WALL_TEXTURES["horizontal-top"]);
  assert.equal(getDungeonWallTexture(false, 40, 300, 32, 180), FANTASY_WALL_TEXTURES["vertical-left"]);
});

test("machine rooms retain their machine wall art", () => {
  assert.equal(getDungeonWallTexture(true, 120, 140, 80, 32), "wall-machine");
});
