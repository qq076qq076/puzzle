import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { DECORATIONS, DEVICE_PLACEMENTS, DEVICES, HELPERS, SPECIES } from "../src/config/game-config.js";

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

test("fish species have intentional display scales", () => {
  const scales = Object.fromEntries(SPECIES.map((item) => [item.id, item.displayScale]));
  for (const [id, scale] of Object.entries(scales)) assert.ok(scale >= 0.6 && scale <= 1.6, `${id} has an unreasonable scale`);
  assert.ok(scales.stingray > scales.guppy);
  assert.ok(scales.arowana > scales.clownfish);
  assert.equal(Math.max(...Object.values(scales)), scales.stingray);
});

test("every helper moves and every device has a valid functional placement", () => {
  for (const helper of HELPERS) assert.ok(helper.movementSpeed > 0, `${helper.id} must move`);
  for (const device of DEVICES) {
    const placement = DEVICE_PLACEMENTS[device.id];
    assert.ok(placement, `${device.id} has no placement`);
    assert.ok(placement.x > 0 && placement.x < 1);
    assert.ok(placement.y > 0 && placement.y < 1);
    assert.ok(placement.scale > 0);
  }
  assert.ok(DEVICE_PLACEMENTS["bubble-stone"].y > DEVICE_PLACEMENTS["basic-feeder"].y);
  assert.ok(DEVICE_PLACEMENTS["hang-on-filter"].x < DEVICE_PLACEMENTS["warm-lamp"].x);
});

function pngSize(url) {
  const buffer = readFileSync(url);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
