import assert from "node:assert/strict";
import test from "node:test";

import { getImpactProfile, releaseCombatHitStop, triggerCombatImpact, updateCombatHitStop } from "../src/systems/combat-feedback.js";

function makeScene() {
  return {
    paused: 0,
    resumed: 0,
    shakes: [],
    flashes: [],
    physics: { world: { pause() { this.owner.paused += 1; }, resume() { this.owner.resumed += 1; }, owner: null } },
    cameras: { main: { shake(...args) { this.owner.shakes.push(args); }, flash(...args) { this.owner.flashes.push(args); }, owner: null } },
  };
}

test("combat impact pauses physics briefly and stronger hits have more weight", () => {
  const scene = makeScene();
  scene.physics.world.owner = scene;
  scene.cameras.main.owner = scene;
  assert.ok(getImpactProfile("kill").hitStopMs > getImpactProfile("hit").hitStopMs);
  triggerCombatImpact(scene, "hit");
  assert.equal(scene.paused, 1);
  assert.equal(scene.shakes.length, 1);
  assert.equal(updateCombatHitStop(scene, 20), true);
  assert.equal(updateCombatHitStop(scene, 30), false);
  assert.equal(scene.resumed, 1);
});

test("damage adds a brief flash and hit stop can always be released", () => {
  const scene = makeScene();
  scene.physics.world.owner = scene;
  scene.cameras.main.owner = scene;
  triggerCombatImpact(scene, "damage");
  assert.equal(scene.flashes.length, 1);
  releaseCombatHitStop(scene);
  assert.equal(scene.combatHitStopRemaining, 0);
  assert.equal(scene.resumed, 1);
});
