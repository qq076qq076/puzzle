import Phaser from "phaser";
import { playActorAnimation } from "../systems/actor-animations.js";
import { tickContactDamage, tryContactDamage } from "../systems/contact-damage.js";
import { createEnemyDashMotion, getEnemyAttackActiveMs, getEnemyEffectiveAttackRange, getEnemyInitialCooldownMs } from "../systems/enemy-attack.js";
import { getRangedMovement, isRangedAttack } from "../systems/enemy-behavior.js";
import { startKnockback, updateKnockback } from "../systems/knockback.js";
import { spawnEnemyProjectilePattern } from "../systems/projectile-system.js";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, definition, sequence = 0) {
    super(scene, x, y, definition.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.definition = definition;
    this.assetId = definition.assetId || definition.id;
    this.sequence = sequence;
    this.health = definition.maxHealth;
    this.state = "idle";
    this.spawnProtectionRemaining = 850;
    this.alertRemaining = 380;
    this.attackCooldownRemaining = getEnemyInitialCooldownMs(sequence);
    this.contactDamageCooldownRemaining = 0;
    this.attackWindupRemaining = 0;
    this.attackActiveRemaining = 0;
    this.recoverRemaining = 0;
    this.dashRemaining = 0;
    this.dashVelocityX = 0;
    this.dashVelocityY = 0;
    this.dashHitRange = 0;
    this.dashKnockbackDistance = 18;
    this.dashHit = false;
    this.hitFlashRemaining = 0;
    this.knockbackRemaining = 0;
    this.knockbackVelocityX = 0;
    this.knockbackVelocityY = 0;
    this.bleedRemaining = 0;
    this.machineMarkedRemaining = 0;
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.visualState = "idle";
    this.strafeDirection = String(sequence).split("").reduce((total, character) => total + character.charCodeAt(0), 0) % 2 ? -1 : 1;
    this.setScale(definition.scale ?? 3);
    this.setTint(definition.color ?? 0xffffff);
    this.setDepth(8);
    this.setCollideWorldBounds(true);
    this.body.setCircle(definition.bodyRadius ?? 14);
    this.body.setOffset((this.width - this.body.width) / 2, (this.height - this.body.height) / 2);
    this.body.setDrag(240, 240);
    const maxVelocity = Math.max(definition.speed + 100, definition.dashSpeed || 0);
    this.body.setMaxVelocity(maxVelocity, maxVelocity);
    this.shadow = scene.add.image(x, y + (definition.shadowOffsetY ?? 10), "provided-shadow")
      .setScale(definition.shadowScale ?? 1.9)
      .setAlpha(0.58)
      .setDepth(5);
    playActorAnimation(this, this.assetId, "idle", this.facing);
  }

  updateAI(player, delta) {
    if (!this.active || !player.active || player.health <= 0) return;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - delta);
    tickContactDamage(this, delta);
    this.spawnProtectionRemaining = Math.max(0, this.spawnProtectionRemaining - delta);
    this.alertRemaining = Math.max(0, this.alertRemaining - delta);
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - delta);
    this.bleedRemaining = Math.max(0, this.bleedRemaining - delta);
    this.machineMarkedRemaining = Math.max(0, this.machineMarkedRemaining - delta);

    if (updateKnockback(this, delta)) {
      this.state = "hurt";
      this.updateVisuals();
      return;
    }

    if (this.spawnProtectionRemaining > 0) {
      this.state = "idle";
      this.setVelocity(0, 0);
      this.setAlpha(0.5 + (1 - this.spawnProtectionRemaining / 850) * 0.5);
      this.updateVisuals();
      return;
    }
    if (this.alertRemaining > 0) {
      this.state = "alert";
      this.setVelocity(0, 0);
      this.setAlpha(this.alertRemaining % 180 < 90 ? 0.7 : 1);
      this.updateVisuals();
      return;
    }
    if (this.dashRemaining > 0) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      this.facing.set(dx / distance, dy / distance);
      this.dashRemaining = Math.max(0, this.dashRemaining - delta);
      this.state = "attack";
      this.setVelocity(this.dashVelocityX, this.dashVelocityY);
      if (!this.dashHit && distance <= this.dashHitRange) {
        this.dashHit = true;
        player.takeDamage(this.definition.damage, {
          knockback: {
            x: dx,
            y: dy,
            distance: this.dashKnockbackDistance,
            durationMs: 110,
          },
        });
      }
      if (this.dashRemaining === 0) {
        this.setVelocity(0, 0);
        this.state = "recover";
        this.recoverRemaining = this.definition.recoverMs;
      }
      this.updateVisuals();
      return;
    }
    if (this.attackWindupRemaining > 0) {
      this.attackWindupRemaining = Math.max(0, this.attackWindupRemaining - delta);
      this.state = "telegraph";
      this.setVelocity(0, 0);
      if (this.attackWindupRemaining === 0) this.performAttack(player);
      this.updateVisuals();
      return;
    }
    if (this.attackActiveRemaining > 0) {
      this.attackActiveRemaining = Math.max(0, this.attackActiveRemaining - delta);
      this.state = "attack";
      this.setVelocity(0, 0);
      if (this.attackActiveRemaining === 0) {
        this.state = "recover";
        this.recoverRemaining = this.definition.recoverMs;
      }
      this.updateVisuals();
      return;
    }
    if (this.recoverRemaining > 0) {
      this.recoverRemaining = Math.max(0, this.recoverRemaining - delta);
      this.state = "recover";
      this.setVelocity(0, 0);
      this.updateVisuals();
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.facing.set(dx / distance, dy / distance);
    const attackRange = getEnemyEffectiveAttackRange(this.definition);
    if (isRangedAttack(this.definition.attackKind)) {
      this.state = "chase";
      const movement = getRangedMovement(this.definition, dx, dy, distance, this.strafeDirection);
      const movementScale = movement.mode === "strafe" ? 0.48 : 1;
      this.setVelocity(movement.x * this.definition.speed * movementScale, movement.y * this.definition.speed * movementScale);
      if (this.attackCooldownRemaining <= 0 && distance <= attackRange) this.startAttack(player);
    } else if (distance > attackRange) {
      this.state = "chase";
      const speedMultiplier = this.definition.stealth && distance > 180 ? 1.24 : 1;
      this.setVelocity((dx / distance) * this.definition.speed * speedMultiplier, (dy / distance) * this.definition.speed * speedMultiplier);
    } else {
      this.state = "chase";
      this.setVelocity(0, 0);
      if (this.attackCooldownRemaining <= 0) this.startAttack(player);
    }
    this.updateVisuals();
  }

  startAttack(player) {
    this.attackWindupRemaining = this.definition.windupMs;
    this.state = "telegraph";
    this.attackCooldownRemaining = this.definition.attackCooldownMs;
    this.scene.showEnemyTelegraph?.(this, this.definition.attackKind, this.attackWindupRemaining);
    this.scene.audio?.beep("telegraph");
    if (this.definition.stealth) this.setAlpha(1);
    this.visualState = "attack";
    playActorAnimation(this, this.assetId, "attack", this.facing, { restart: true });
    void player;
  }

  performAttack(player) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const kind = this.definition.attackKind;
    const dash = createEnemyDashMotion(this.definition, player.x - this.x, player.y - this.y);
    if (dash) {
      this.dashRemaining = dash.durationMs;
      this.dashVelocityX = dash.velocityX;
      this.dashVelocityY = dash.velocityY;
      this.dashHitRange = dash.hitRange;
      this.dashKnockbackDistance = dash.knockbackDistance;
      this.dashHit = false;
      this.state = "attack";
      this.setVelocity(dash.velocityX, dash.velocityY);
      playActorAnimation(this, this.assetId, "attack", this.facing, { restart: true });
      return;
    }
    if (isRangedAttack(kind)) {
      spawnEnemyProjectilePattern(this.scene, this, player, this.definition);
    } else {
      if (distance <= getEnemyEffectiveAttackRange(this.definition) + 30) {
        player.takeDamage(this.definition.damage, {
          knockback: {
            x: player.x - this.x,
            y: player.y - this.y,
            distance: 14,
            durationMs: 110,
          },
        });
      }
    }
    this.state = "attack";
    this.attackActiveRemaining = getEnemyAttackActiveMs(this.definition);
    this.setVelocity(0, 0);
    playActorAnimation(this, this.assetId, "attack", this.facing, { restart: true });
  }

  tryContactDamage(player) {
    return tryContactDamage(this, player);
  }

  takeDamage(amount, multiplier = 1, context = {}) {
    if (!this.active || this.state === "dead") return { hit: false, damage: 0, killed: false };
    const damage = Math.max(1, Math.round(amount * multiplier - (this.definition.armor || 0)));
    this.health = Math.max(0, this.health - damage);
    this.hitFlashRemaining = 110;
    if (context.knockback) {
      this.dashRemaining = 0;
      this.attackActiveRemaining = 0;
      this.recoverRemaining = Math.max(this.recoverRemaining, 160);
      startKnockback(this, context.knockback, { distance: 18, durationMs: 110 });
    }
    if (this.health <= 0) {
      this.state = "dead";
      this.setActive(false);
      this.setVisible(false);
      this.body.enable = false;
      this.shadow?.setVisible(false);
      this.scene.onEnemyDefeated?.(this);
      return { hit: true, damage, killed: true };
    }
    return { hit: true, damage, killed: false };
  }

  updateVisuals() {
    if (this.definition.stealth && this.state === "chase") this.setAlpha(0.62);
    if (this.hitFlashRemaining > 0) this.setAlpha(1);
    if (this.hitFlashRemaining <= 0 && this.spawnProtectionRemaining <= 0 && this.alertRemaining <= 0 && !(this.definition.stealth && this.state === "chase")) this.setAlpha(1);
    if (this.state === "attack") {
      this.visualState = "attack";
      playActorAnimation(this, this.assetId, "attack", this.facing);
    } else if (this.state !== "telegraph") {
      const moving = this.body.velocity.lengthSq() > 16;
      this.visualState = moving ? "walk" : "idle";
      playActorAnimation(this, this.assetId, this.visualState, this.facing);
    }
    this.shadow?.setPosition(this.x, this.y + (this.definition.shadowOffsetY ?? 10)).setVisible(this.active);
    this.setDepth(8 + this.y / 10000);
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
