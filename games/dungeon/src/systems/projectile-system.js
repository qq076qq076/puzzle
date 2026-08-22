import Phaser from "phaser";

const MAX_PROJECTILES = 32;

export function spawnProjectile(scene, source, target, options = {}) {
  if (!scene.projectiles) scene.projectiles = [];
  if (scene.projectiles.length >= MAX_PROJECTILES) return false;
  const angle = Math.atan2(target.y - source.y, target.x - source.x);
  const speed = options.speed ?? 210;
  const projectile = {
    x: source.x,
    y: source.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    remaining: options.lifeMs ?? 2400,
    damage: options.damage ?? 12,
    radius: options.radius ?? 8,
    node: scene.add
      .image(source.x, source.y, options.texture ?? "enemy-projectile")
      .setScale(options.scale ?? 1.7)
      .setRotation(angle - Math.PI / 4)
      .setDepth(7),
  };
  scene.projectiles.push(projectile);
  return true;
}

export function updateProjectiles(scene, player, delta) {
  if (!scene.projectiles) return;
  scene.projectiles = scene.projectiles.filter((projectile) => {
    projectile.remaining -= delta;
    projectile.x += projectile.vx * (delta / 1000);
    projectile.y += projectile.vy * (delta / 1000);
    projectile.node.setPosition(projectile.x, projectile.y);
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
