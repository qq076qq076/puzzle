import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { ACTOR_ASSETS, PROVIDED_ASSETS } from "../src/data/assets.js";
import { getActorOrientation } from "../src/systems/actor-animations.js";

const assetsRoot = fileURLToPath(new URL("../assets/", import.meta.url));

function resolveAsset(relativePath) {
  assert.match(relativePath, /^\.\//, `asset path must be relative to assets/: ${relativePath}`);
  return path.resolve(assetsRoot, relativePath.slice(2));
}

function readPngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", "asset must be a PNG file");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("all runtime CraftPix assets exist in the checked-in source packs", async () => {
  assert.equal(PROVIDED_ASSETS.localFilesAvailable, true);
  const files = [
    ...Object.values(PROVIDED_ASSETS.images),
    ...PROVIDED_ASSETS.spritesheets.map(({ path: assetPath }) => assetPath),
  ];

  await Promise.all(files.map(async (assetPath) => {
    const buffer = await readFile(resolveAsset(assetPath));
    assert.ok(buffer.length > 24, `${assetPath} must not be empty`);
    readPngDimensions(buffer);
  }));
});

test("spritesheet dimensions match the animation manifest", async () => {
  await Promise.all(PROVIDED_ASSETS.spritesheets.map(async (definition) => {
    const buffer = await readFile(resolveAsset(definition.path));
    const { width, height } = readPngDimensions(buffer);
    assert.equal(width, definition.frameWidth * definition.frameCount, `${definition.key} frame count`);
    assert.equal(height, definition.frameHeight, `${definition.key} frame height`);
  }));
});

test("player and fantasy enemies provide directional movement and attacks", () => {
  for (const actorId of ["player", "rat", "goblin_bat", "goblin_dagger", "spider_guard"]) {
    const actor = ACTOR_ASSETS[actorId];
    for (const state of ["idle", "walk", "attack"]) {
      assert.deepEqual(Object.keys(actor.states[state]).sort(), ["down", "side", "up"], `${actorId} ${state}`);
    }
  }
});

test("actor orientation follows each source sprite's modeled direction", () => {
  assert.equal(getActorOrientation("player", { x: 1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("player", { x: -1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("rat", { x: 1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("goblin_bat", { x: 1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("goblin_bat", { x: -1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("steel_spider", { x: 1, y: 0 }).rotation, -Math.PI / 2);
  assert.equal(getActorOrientation("steel_spider", { x: 0, y: -1 }).rotation, Math.PI);
});
