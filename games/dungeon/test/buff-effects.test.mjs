import assert from "node:assert/strict";
import test from "node:test";

import { applyMachineResonanceHit, getBleedTickDamage, previewComboHit } from "../src/systems/buff-effects.js";

test("combo drive boosts exactly the third consecutive distinct target", () => {
  const player = { comboDrive: true, comboHits: 0, comboTargetId: null };
  for (const targetId of ["rat-a", "rat-b"]) Object.assign(player, previewComboHit(player, targetId));
  const third = previewComboHit(player, "goblin-c");
  assert.equal(third.multiplier, 1.35);
  assert.equal(third.triggered, true);
  assert.equal(third.comboHits, 0);
});

test("repeating the same combo target restarts progress", () => {
  const player = { comboDrive: true, comboHits: 2, comboTargetId: "same" };
  assert.deepEqual(previewComboHit(player, "same"), {
    comboHits: 1,
    comboTargetId: "same",
    multiplier: 1,
    triggered: false,
  });
});

test("bleeding edge stack damage is used by each bleed tick", () => {
  assert.equal(getBleedTickDamage({ bleedDamage: 6 }), 6);
  assert.equal(getBleedTickDamage({}), 3);
});

test("machine resonance marks first and reduces cooldown on later hits", () => {
  const player = { machineResonanceStacks: 2, attackCooldownRemaining: 450 };
  const enemy = { definition: { machine: true }, machineMarkedRemaining: 0 };
  assert.equal(applyMachineResonanceHit(player, enemy), false);
  assert.equal(enemy.machineMarkedRemaining, 3000);
  assert.equal(player.attackCooldownRemaining, 450);
  assert.equal(applyMachineResonanceHit(player, enemy), true);
  assert.equal(player.attackCooldownRemaining, 315);
});
