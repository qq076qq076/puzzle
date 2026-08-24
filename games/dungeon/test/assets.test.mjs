import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { ACTOR_ASSETS, PROVIDED_ASSETS } from "../src/data/assets.js";
import { getActorOrientation } from "../src/systems/actor-animations.js";

const assetsRoot = fileURLToPath(new URL("../assets/", import.meta.url));
const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

function resolveAsset(relativePath) {
  assert.match(relativePath, /^\.\//, `asset path must be relative to assets/: ${relativePath}`);
  return path.resolve(assetsRoot, relativePath.slice(2));
}

function readPngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", "asset must be a PNG file");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function readJavaScriptTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const values = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readJavaScriptTree(entryPath);
    if (!entry.name.endsWith(".js")) return [];
    return [await readFile(entryPath, "utf8")];
  }));
  return values.flat();
}

test("all runtime CraftPix assets exist in the checked-in source packs", async () => {
  assert.equal(PROVIDED_ASSETS.localFilesAvailable, true);
  assert.match(PROVIDED_ASSETS.images["provided-shadow"], /Shadow\.png$/);
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

test("world effects are mapped to supplied CraftPix files without generated fallbacks", async () => {
  const spritesheets = new Map(PROVIDED_ASSETS.spritesheets.map((definition) => [definition.key, definition.path]));
  assert.match(spritesheets.get("trap"), /Spikes\.png$/);
  assert.match(spritesheets.get("spawn-marker"), /Portal1_Start\.png$/);
  assert.match(spritesheets.get("hit-spark"), /D_Blood\.png$/);
  assert.match(spritesheets.get("player-attack-effect"), /3 Effects\/1_1\.png$/);
  assert.match(PROVIDED_ASSETS.images["enemy-projectile"], /Projectiles\/10\.png$/);
  assert.match(PROVIDED_ASSETS.images["laser-projectile"], /Projectiles\/15\.png$/);
  assert.match(spritesheets.get("player-weapon-swing"), /Weapons\/7\.png$/);
  for (let index = 1; index <= 4; index += 1) {
    assert.match(PROVIDED_ASSETS.images[`bottle-${index}`], new RegExp(`/Other/${index + 4}\\.png$`));
  }
  assert.match(spritesheets.get("bottle-break-effect"), /8 Other\/Dust\.png$/);
  assert.match(PROVIDED_ASSETS.credits.runtimePolicy, /generated fallback textures are disabled/i);

  const source = (await readJavaScriptTree(sourceRoot)).join("\n");
  assert.doesNotMatch(source, /generateTexture|slash-effect|texture-factory/);
});

test("player and fantasy enemies provide directional movement and attacks", () => {
  for (const actorId of ["player", "rat", "goblin_bat", "goblin_dagger", "plague_mage"]) {
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
  assert.equal(getActorOrientation("robot_gunner", { x: -1, y: 0 }).flipX, true);
});
