import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSource(relativePath) {
  return readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");
}

test("the first floor starts with Space instead of Enter", async () => {
  const source = await readSource("scenes/MenuScene.js");
  assert.match(source, /keydown-SPACE/);
  assert.doesNotMatch(source, /keydown-ENTER|ENTER,N,M|Enter／N/);
});

test("removed HUD, pause, seed, and reward instructions stay hidden", async () => {
  const source = (await Promise.all([
    "ui/hud.js",
    "scenes/MenuScene.js",
    "scenes/RoomScene.js",
    "scenes/CorridorScene.js",
    "scenes/BossScene.js",
  ].map(readSource))).join("\n");

  for (const removedCopy of [
    "DODGE READY",
    "戰鬥計時與敵人 AI 已暫停",
    "已暫停",
    "RUN SEED",
    "Seed：",
    "←／→ 選擇獎勵",
  ]) {
    assert.equal(source.includes(removedCopy), false, `${removedCopy} must not be rendered`);
  }
  assert.doesNotMatch(source, /roomLabel:\s*[`\"]FLOOR 1/);
  assert.doesNotMatch(source, /第\s*\$\{[^}]*currentWave[^}]*\}[^\n]*波/);
});

test("combat HUD shows a health bar and only an icon for sound controls", async () => {
  const source = await readSource("ui/hud.js");
  assert.match(source, /healthBarBack/);
  assert.match(source, /healthBarFill/);
  assert.match(source, /🔊/);
  assert.match(source, /🔇/);
  assert.doesNotMatch(source, /status:\s*scene\.add\.text/);
  assert.doesNotMatch(source, /makeTouchOnlyButton\([^\n]+"(?:PAUSE|BUFFS|SOUND|MUTE)"/);
});

test("reward descriptions stay inside their card and use advanced wrapping", async () => {
  const source = await readSource("scenes/RoomScene.js");
  assert.match(source, /fixedWidth:\s*174/);
  assert.match(source, /wordWrap:\s*\{\s*width:\s*174,\s*useAdvancedWrap:\s*true\s*\}/);
});

test("room, corridor, and boss entrances render no instructional overlays", async () => {
  const sources = await Promise.all([
    "scenes/RoomScene.js",
    "scenes/CorridorScene.js",
    "scenes/BossScene.js",
  ].map(readSource));
  sources.forEach((source) => {
    assert.doesNotMatch(source, /introText|showHint\(/);
  });
});
