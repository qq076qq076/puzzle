import test from "node:test";
import assert from "node:assert/strict";
import { PROVIDED_ASSETS } from "../src/data/assets.js";
import { BUFFS } from "../src/data/buffs.js";
import { REWARDS } from "../src/data/rewards.js";
import { applyReward, getRewardCategoryLabel, getRewardChoices, getUsableRewardIds, isRewardAvailable } from "../src/systems/reward-system.js";

function makePlayer() {
  return {
    attackDamage: 20,
    attackRange: 88,
    attackArcDeg: 100,
    attackCooldownMs: 450,
    moveSpeed: 192,
    maxHealth: 100,
    health: 40,
    damageReduction: 0,
    knockbackMultiplier: 1,
    bleedDamage: 0,
    lifestealAmount: 0,
    machineResonanceStacks: 0,
    machineDamageMultiplier: 1,
    buffs: [],
    buffStacks: {},
    gold: 0,
    consumables: 0,
  };
}

test("reward types update the run build", () => {
  const player = makePlayer();
  assert.equal(applyReward(player, "minor_heal").amount, 20);
  assert.equal(player.health, 60);
  assert.equal(applyReward(player, "emergency_vial").amount, 35);
  assert.equal(player.consumables, 1);
  assert.equal(applyReward(player, "gold_cache").amount, 25);
  assert.equal(player.gold, 25);
});

test("reward categories distinguish passive, instant, and active consumables", () => {
  assert.equal(getRewardCategoryLabel("sharp_edge"), "被動 Buff · 取得即生效");
  assert.equal(getRewardCategoryLabel("minor_heal"), "立即生效");
  assert.equal(getRewardCategoryLabel("emergency_vial"), "消耗品 · Q／POTION 使用");
});

test("a maxed buff converts to gold and unusable choices fall back", () => {
  const player = makePlayer();
  for (let index = 0; index < 5; index += 1) assert.equal(applyReward(player, "sharp_edge").applied, true);
  const converted = applyReward(player, "sharp_edge");
  assert.equal(converted.converted, true);
  assert.equal(player.gold, 10);
  assert.deepEqual(getUsableRewardIds(player, ["sharp_edge"]), []);
  assert.deepEqual(getRewardChoices(player, ["sharp_edge"]), ["gold_cache", "emergency_vial", "minor_heal"]);
});

test("full-health players are not offered a zero-effect instant heal", () => {
  const player = makePlayer();
  player.health = player.maxHealth;
  assert.equal(isRewardAvailable(player, "minor_heal"), false);
  const choices = getRewardChoices(player, ["minor_heal"]);
  assert.equal(choices.length, 3);
  assert.equal(choices.includes("minor_heal"), false);
});

test("boss trophy is a fixed completion reward", () => {
  const player = makePlayer();
  const result = applyReward(player, "boss_trophy");
  assert.equal(result.type, "trophy");
  assert.equal(player.trophy, true);
});

test("every selectable reward has a supplied CraftPix icon", () => {
  for (const reward of [...Object.values(BUFFS), ...Object.values(REWARDS)]) {
    assert.ok(reward.icon, `${reward.id} must define an icon`);
    assert.ok(PROVIDED_ASSETS.images[reward.icon], `${reward.id} icon must exist in the asset manifest`);
    assert.match(PROVIDED_ASSETS.images[reward.icon], /^\.\/(roguelike-game-kit-pixel-art|shoot)\//);
  }
});
