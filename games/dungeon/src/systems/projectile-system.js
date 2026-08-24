import Phaser from "phaser";
import { getEnemyProjectilePattern } from "./projectile-patterns.js";

const MAX_PROJECTILES = 32;

export function spawnProjectile(scene, source, target, options = {}) {
  if (!scene.projectiles) scene.projectiles = [];
  if (scene.projectiles.length >= MAX_PROJECTILES) return false;
  const angle = options.angle ?? Math.atan2(target.y - source.y, target.x - source.x);
  const speed = options.speed ?? 210;
  const spawnOffset = options.spawnOffset ?? 18;
  const projectile = {
    x: source.x + Math.cos(angle) * spawnOffset,
    y: source.y + Math.sin(angle) * spawnOffset,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    remaining: options.lifeMs ?? 2400,
    damage: options.damage ?? 12,
    radius: options.radius ?? 8,
    visual: options.visual ?? "bullet",
    node: scene.add
      .image(source.x + Math.cos(angle) * spawnOffset, source.y + Math.sin(angle) * spawnOffset, options.texture ?? "enemy-projectile")
      .setScale(options.scale ?? 1.7)
      .setRotation(angle + (options.rotationOffset ?? -Math.PI / 4))
      .setDepth(7),
  };
  if (options.tint) projectile.node.setTint(options.tint);
  if (["fireball", "laser"].includes(projectile.visual)) projectile.node.setBlendMode(Phaser.BlendModes.ADD);
  scene.projectiles.push(projectile);
  return true;
}

export function spawnEnemyProjectilePattern(scene, source, target, definition) {
  const baseAngle = Math.atan2(target.y - source.y, target.x - source.x);
  const options = {
    damage: definition.projectileDamage,
    speed: definition.projectileSpeed,
    texture: definition.projectileTexture,
    scale: definition.projectileScale,
    radius: definition.projectileRadius,
    visual: definition.projectileVisual,
    rotationOffset: definition.projectileRotationOffset,
    tint: definition.projectileTint,
  };
  getEnemyProjectilePattern(definition).forEach(({ angleOffset, delayMs }) => {
    const fire = () => {
      if (source.active && target.active) spawnProjectile(scene, source, target, { ...options, angle: baseAngle + angleOffset });
    };
    if (delayMs > 0) scene.time.delayedCall(delayMs, fire);
    else fire();
  });
}

export function updateProjectiles(scene, player, delta) {
  if (!scene.projectiles) return;
  scene.projectiles = scene.projectiles.filter((projectile) => {
    projectile.remaining -= delta;
    projectile.x += projectile.vx * (delta / 1000);
    projectile.y += projectile.vy * (delta / 1000);
    projectile.node.setPosition(projectile.x, projectile.y);
    if (projectile.visual === "fireball") projectile.node.rotation += delta * 0.006;
    const hit = Phaser.Math.Distance.Between(projectile.x, projectile.y, player.x, player.y) <= projectile.radius + 13;
    const outside = projectile.x < 20 || projectile.x > 940 || projectile.y < 80 || projectile.y > 520;
    if (hit) {
      player.takeDamage(projectile.damage, {
        knockback: { x: projectile.vx, y: projectile.vy, distance: 12, durationMs: 90 },
      });
      projectile.node.destroy();
      return false;
    }
    if (projectile.remaining <= 0 || outside) {
      projectile.node.destroy();
      return false;
    }
    return true;
  });
}

export function clearProjectiles(scene) {
  scene.projectiles?.forEach((projectile) => projectile.node.destroy());
  scene.projectiles = [];
}
