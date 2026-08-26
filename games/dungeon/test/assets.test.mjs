import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { ACTOR_ASSETS, PROVIDED_ASSETS } from "../src/data/assets.js";
import { PROP_GROUPS, ROOM_ANIMATED_TEXTURES, ROOM_BACKGROUND_TEXTURES, ROOM_DECORATION_TEXTURES } from "../src/data/room-decorations.js";
import { FANTASY_WALL_TEXTURE_KEYS } from "../src/data/wall-art.js";
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
  assert.match(PROVIDED_ASSETS.images["provided-shadow"], /player\/PNG\/Swordsman_lvl1\/Without_shadow\/shadow_single\.png$/);
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
    const rows = definition.sheetRows ?? 1;
    const textureFrameCount = definition.textureFrameCount ?? definition.frameCount;
    assert.equal(width, definition.frameWidth * (textureFrameCount / rows), `${definition.key} frame columns`);
    assert.equal(height, definition.frameHeight * rows, `${definition.key} frame rows`);
  }));
});

test("world effects are mapped to supplied CraftPix files without generated fallbacks", async () => {
  const spritesheets = new Map(PROVIDED_ASSETS.spritesheets.map((definition) => [definition.key, definition.path]));
  assert.match(spritesheets.get("trap"), /Spikes\.png$/);
  assert.match(spritesheets.get("spawn-marker"), /Portal1_Start\.png$/);
  assert.match(spritesheets.get("hit-spark"), /D_Blood\.png$/);
  assert.match(PROVIDED_ASSETS.images["enemy-projectile"], /Projectiles\/10\.png$/);
  assert.match(PROVIDED_ASSETS.images["laser-projectile"], /Projectiles\/15\.png$/);
  for (let index = 1; index <= 8; index += 1) {
    const frame = String(index).padStart(2, "0");
    const key = index === 1 ? "spell-projectile" : `spell-projectile-${frame}`;
    assert.match(PROVIDED_ASSETS.images[key], new RegExp(`water-and-fire-magic-sprite-vector-pack/Fire Ball/PNG/Fire Ball_Frame_${frame}\\.png$`));
  }
  const fireballAnimation = PROVIDED_ASSETS.environmentAnimations.find(({ key }) => key === "spell-projectile-flight");
  assert.equal(fireballAnimation.frames.length, 8);
  assert.equal(fireballAnimation.repeat, -1);
  assert.equal(spritesheets.has("player-attack-effect"), false);
  assert.equal(spritesheets.has("player-weapon-swing"), false);
  for (let index = 1; index <= 4; index += 1) {
    assert.match(PROVIDED_ASSETS.images[`bottle-${index}`], new RegExp(`/Other/${index + 4}\\.png$`));
  }
  assert.match(spritesheets.get("bottle-break-effect"), /8 Other\/Dust\.png$/);
  assert.match(PROVIDED_ASSETS.credits.runtimePolicy, /generated fallback textures are disabled/i);
  ROOM_DECORATION_TEXTURES.forEach((texture) => {
    assert.match(PROVIDED_ASSETS.images[texture], /roguelike-game-kit-pixel-art\/2 Dungeon Tileset\/2 Objects\//);
  });
  ROOM_ANIMATED_TEXTURES.forEach((texture) => {
    assert.match(spritesheets.get(texture), /roguelike-game-kit-pixel-art\/2 Dungeon Tileset\/3 Animated objects\//);
  });
  ROOM_BACKGROUND_TEXTURES.forEach((texture) => {
    assert.match(PROVIDED_ASSETS.images[texture], /roguelike-game-kit-pixel-art\/2 Dungeon Tileset\/1 Tiles\//);
  });
  assert.match(spritesheets.get("room-fire"), /roguelike-game-kit-pixel-art\/2 Dungeon Tileset\/3 Animated objects\/Fire1\.png$/);
  const roomFireAnimation = PROVIDED_ASSETS.environmentAnimations.find(({ key }) => key === "room-fire-idle");
  assert.equal(roomFireAnimation.texture, "room-fire");
  assert.equal(roomFireAnimation.frameCount, 8);
  assert.equal(roomFireAnimation.frameRate, 10);
  FANTASY_WALL_TEXTURE_KEYS.forEach((texture) => {
    assert.match(PROVIDED_ASSETS.images[texture], /roguelike-game-kit-pixel-art\/2 Dungeon Tileset\/1 Tiles\/Tile_/);
  });

  const source = (await readJavaScriptTree(sourceRoot)).join("\n");
  assert.doesNotMatch(source, /generateTexture|slash-effect|texture-factory/);
  const roomScene = await readFile(path.join(sourceRoot, "scenes/RoomScene.js"), "utf8");
  assert.match(roomScene, /add\.sprite\(x, y, "room-fire"\)/);
  assert.match(roomScene, /playEnvironmentAnimation\(flame, "room-fire-idle"\)/);
});

test("the complete usable dungeon object catalog and animated room features are registered", () => {
  assert.equal(PROP_GROUPS.blockages.length, 8);
  assert.equal(PROP_GROUPS.bookshelves.length, 12);
  assert.equal(PROP_GROUPS.shelfDecor.length, 40);
  assert.equal(PROP_GROUPS.boxes.length, 16);
  assert.equal(PROP_GROUPS.chairs.length, 14);
  assert.equal(PROP_GROUPS.other.length, 40);
  assert.equal(PROP_GROUPS.tables.length, 8);
  Object.values(PROP_GROUPS).flat().forEach((texture) => assert.ok(PROVIDED_ASSETS.images[texture]));

  const spritesheets = new Map(PROVIDED_ASSETS.spritesheets.map((definition) => [definition.key, definition]));
  for (const texture of ROOM_ANIMATED_TEXTURES) assert.ok(spritesheets.has(texture), texture);
  for (const direction of ["down", "side", "up"]) {
    assert.equal(spritesheets.get(`room-trapdoor-${direction}`).frameCount, 6);
    assert.equal(spritesheets.get(`room-big-door-${direction}`).frameCount, 4);
  }
});

test("player melee feedback uses supplied standing, moving, and dodge-chain attacks without a drawn sweep", async () => {
  const source = await readFile(path.join(sourceRoot, "entities/Player.js"), "utf8");
  assert.doesNotMatch(source, /add\.graphics\(\)|showAttackEffect|attackEffects/);
  assert.doesNotMatch(source, /player-weapon-swing|player-attack-effect|spawnProjectile/);
  assert.match(source, /this\.attackAnimationState = this\.dodgeChainRemaining > 0 \? "runAttack" : moving \? "walkAttack" : "attack"/);
  assert.match(source, /playActorAnimation\(this, this\.assetId, this\.attackAnimationState/);
});

test("player and fantasy enemies provide their supplied directional actions", () => {
  assert.deepEqual(Object.keys(ACTOR_ASSETS.player.states.idle).sort(), ["down", "left", "right", "up"]);
  assert.match(ACTOR_ASSETS.player.states.idle.down.path, /player\/PNG\/Swordsman_lvl1\/Without_shadow\/Swordsman_lvl1_Idle_without_shadow\.png$/);
  assert.match(ACTOR_ASSETS.player.states.walk.down.path, /Swordsman_lvl1_Walk_without_shadow\.png$/);
  assert.match(ACTOR_ASSETS.player.states.attack.down.path, /Swordsman_lvl1_attack_without_shadow\.png$/);
  assert.deepEqual(Object.keys(ACTOR_ASSETS.player.states).sort(), [
    "attack", "death", "hurt", "idle", "run", "runAttack", "walk", "walkAttack",
  ]);
  assert.equal(ACTOR_ASSETS.player.states.run.down.frameCount, 8);
  assert.equal(ACTOR_ASSETS.player.states.walkAttack.down.frameCount, 6);
  assert.equal(ACTOR_ASSETS.player.states.runAttack.down.frameCount, 8);
  assert.equal(ACTOR_ASSETS.player.states.hurt.down.frameCount, 5);
  assert.equal(ACTOR_ASSETS.player.states.death.down.frameCount, 7);
  assert.match(ACTOR_ASSETS.player_lvl2.states.idle.down.path, /Swordsman_lvl2\/Without_shadow\/Swordsman_lvl2_Idle_without_shadow\.png$/);
  assert.match(ACTOR_ASSETS.player_lvl3.states.death.down.path, /Swordsman_lvl3\/Without_shadow\/Swordsman_lvl3_Death_without_shadow\.png$/);
  for (const actorId of [
    "rat",
    "goblin_bat",
    "goblin_dagger",
    "plague_mage",
    "tomb_scout",
    "crypt_archer",
    "void_knight",
  ]) {
    const actor = ACTOR_ASSETS[actorId];
    for (const state of ["idle", "walk", "attack", "hurt", "death"]) {
      assert.deepEqual(Object.keys(actor.states[state]).sort(), ["down", "side", "up"], `${actorId} ${state}`);
    }
    assert.equal(actor.states.hurt.down.frameCount, 2, `${actorId} hurt frames`);
    assert.equal(actor.states.death.down.frameCount, 8, `${actorId} death frames`);
  }
});

test("fantasy enemies play supplied hurt and death animations during combat", async () => {
  const source = await readFile(path.join(sourceRoot, "entities/Enemy.js"), "utf8");
  assert.match(source, /playActorAnimation\(this, this\.assetId, "hurt"/);
  assert.match(source, /playActorAnimation\(deathVisual, this\.assetId, "death"/);
});

test("actor orientation follows each source sprite's modeled direction", () => {
  assert.equal(ACTOR_ASSETS.player.states.idle.down.start, 0);
  assert.equal(ACTOR_ASSETS.player.states.idle.left.start, 12);
  assert.equal(ACTOR_ASSETS.player.states.idle.right.start, 24);
  assert.equal(ACTOR_ASSETS.player.states.idle.up.start, 36);
  assert.deepEqual(getActorOrientation("player", { x: 1, y: 0 }), { direction: "right", flipX: false, rotation: 0 });
  assert.deepEqual(getActorOrientation("player", { x: -1, y: 0 }), { direction: "left", flipX: false, rotation: 0 });
  assert.equal(getActorOrientation("rat", { x: 1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("rat", { x: -1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("goblin_bat", { x: 1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("goblin_bat", { x: -1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("tomb_scout", { x: 1, y: 0 }).flipX, true);
  assert.equal(getActorOrientation("crypt_archer", { x: -1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("steel_spider", { x: 1, y: 0 }).rotation, Math.PI / 2);
  assert.equal(getActorOrientation("steel_spider", { x: 0, y: -1 }).rotation, Math.PI);
  assert.equal(getActorOrientation("robot_gunner", { x: -1, y: 0 }).flipX, false);
  assert.equal(getActorOrientation("robot_gunner", { x: 1, y: 0 }).flipX, true);
});
