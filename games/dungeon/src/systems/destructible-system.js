import { playEnvironmentAnimation } from "./actor-animations.js";

const DROP_TEXTURES = Object.freeze({
  gold: "reward-icon-coins",
  heal: "reward-icon-heal",
  potion: "reward-icon-potion",
});

export function rollBottleDrop(rng) {
  if (!rng || rng.next() >= 0.62) return null;
  const roll = rng.next();
  if (roll < 0.55) return { type: "gold", amount: rng.int(5, 14) };
  if (roll < 0.82) return { type: "heal", amount: rng.int(10, 18) };
  return { type: "potion", amount: 1 };
}

export function createBreakableBottle(scene, plan, scale = 4) {
  const bottle = {
    id: plan.id,
    x: plan.x,
    y: plan.y,
    drop: plan.drop ? { ...plan.drop } : null,
    active: true,
    node: scene.add.image(plan.x, plan.y, plan.texture || "bottle-1").setScale(scale).setDepth(4),
  };
  return bottle;
}

function createPickup(scene, bottle) {
  if (!bottle.drop) return null;
  const pickup = {
    x: bottle.x,
    y: bottle.y,
    drop: { ...bottle.drop },
    active: true,
    node: scene.add.image(bottle.x, bottle.y, DROP_TEXTURES[bottle.drop.type]).setScale(3).setDepth(12),
  };
  scene.tweens?.add({ targets: pickup.node, y: bottle.y - 5, duration: 420, yoyo: true, repeat: -1 });
  if (!scene.pickups) scene.pickups = [];
  scene.pickups.push(pickup);
  return pickup;
}

export function breakBottle(scene, bottle) {
  if (!bottle?.active) return { broken: false, drop: null };
  bottle.active = false;
  bottle.node?.destroy();
  const effect = scene.add.sprite(bottle.x, bottle.y, "bottle-break-effect", 0).setScale(0.68).setDepth(20);
  effect.once("animationcomplete-bottle-break", () => effect.destroy());
  if (!playEnvironmentAnimation(effect, "bottle-break")) effect.destroy();
  scene.audio?.beep("hit");
  return { broken: true, drop: createPickup(scene, bottle) };
}

export function resolveBottleHits(player, bottles) {
  if (!player?.attackHitWindow || !bottles?.length) return 0;
  const facing = player.attackFacing || player.facing;
  const halfArc = (player.attackArcDeg * Math.PI) / 360;
  let hits = 0;
  bottles.forEach((bottle) => {
    if (!bottle.active) return;
    const dx = bottle.x - player.x;
    const dy = bottle.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001 || distance > player.attackRange) return;
    const dot = Math.max(-1, Math.min(1, facing.x * (dx / distance) + facing.y * (dy / distance)));
    if (Math.acos(dot) > halfArc) return;
    if (breakBottle(player.scene, bottle).broken) hits += 1;
  });
  return hits;
}

export function applyBottleDrop(player, drop) {
  if (!player || !drop) return { collected: false, message: "" };
  if (drop.type === "gold") {
    player.gold = (player.gold || 0) + drop.amount;
    return { collected: true, message: `瓶中金幣 +${drop.amount}` };
  }
  if (drop.type === "potion") {
    player.consumables = (player.consumables || 0) + 1;
    return { collected: true, message: "取得緊急藥瓶" };
  }
  if (drop.type === "heal") {
    if (player.health >= player.maxHealth) return { collected: false, message: "生命已滿" };
    const before = player.health;
    player.health = Math.min(player.maxHealth, player.health + drop.amount);
    return { collected: true, message: `恢復 ${player.health - before} 生命` };
  }
  return { collected: false, message: "" };
}

export function updateBottlePickups(scene, player, pickupRadius = 30) {
  if (!scene.pickups?.length || !player) return 0;
  let collected = 0;
  scene.pickups = scene.pickups.filter((pickup) => {
    if (!pickup.active || Math.hypot(player.x - pickup.x, player.y - pickup.y) > pickupRadius) return pickup.active;
    const result = applyBottleDrop(player, pickup.drop);
    if (!result.collected) return true;
    pickup.active = false;
    pickup.node?.destroy();
    scene.showStatus?.(result.message);
    scene.audio?.beep("reward");
    collected += 1;
    return false;
  });
  return collected;
}
