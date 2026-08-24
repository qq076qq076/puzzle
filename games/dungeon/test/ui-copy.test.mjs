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
