import Phaser from "phaser";
import { playActorAnimation } from "../systems/actor-animations.js";
import { tickContactDamage, tryContactDamage } from "../systems/contact-damage.js";

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
    this.attackCooldownRemaining = 600 + sequence * 90;
    this.contactDamageCooldownRemaining = 0;
    this.attackWindupRemaining = 0;
    this.recoverRemaining = 0;
    this.hitFlashRemaining = 0;
    this.bleedRemaining = 0;
    this.machineMarkedRemaining = 0;
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.visualState = "idle";
    this.setScale(definition.scale ?? 3);
    this.setTint(definition.color ?? 0xffffff);
    this.setDepth(8);
    this.setCollideWorldBounds(true);
    this.body.setCircle(definition.bodyRadius ?? 14);
    this.body.setOffset((this.width - this.body.width) / 2, (this.height - this.body.height) / 2);
    this.body.setDrag(240, 240);
    this.body.setMaxVelocity(definition.speed + 100, definition.speed + 100);
    this.shadow = scene.add.ellipse(x, y + 12, 20, 7, 0x080a10, 0.32).setDepth(5);
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
    if (this.attackWindupRemaining > 0) {
      this.attackWindupRemaining = Math.max(0, this.attackWindupRemaining - delta);
      this.state = "telegraph";
      this.setVelocity(0, 0);
      if (this.attackWindupRemaining === 0) this.performAttack(player);
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
    const attackRange = this.definition.attackRange;
    if (distance > attackRange || this.definition.attackKind === "ranged") {
      this.state = "chase";
      const speedMultiplier = this.definition.stealth && distance > 180 ? 1.24 : 1;
      if (distance > attackRange) this.setVelocity((dx / distance) * this.definition.speed * speedMultiplier, (dy / distance) * this.definition.speed * speedMultiplier);
      else this.setVelocity(0, 0);
      if (this.attackCooldownRemaining <= 0 && distance <= attackRange) this.startAttack(player);
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
    if (kind === "ranged") {
      this.scene.spawnEnemyProjectile?.(this, player, this.definition.projectileDamage);
    } else {
      if (kind === "dash" || kind === "pounce") {
        const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
        const speed = kind === "pounce" ? 300 : 420;
        this.setVelocity(direction.x * speed, direction.y * speed);
      }
      if (distance <= this.definition.attackRange + (kind === "pounce" ? 44 : 30)) player.takeDamage(this.definition.damage);
    }
    this.state = "recover";
    this.recoverRemaining = this.definition.recoverMs;
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
      const direction = new Phaser.Math.Vector2(context.knockback.x, context.knockback.y).normalize();
      this.setVelocity(direction.x * (context.knockback.distance || 90), direction.y * (context.knockback.distance || 90));
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
    if (this.state !== "telegraph") {
      const moving = this.body.velocity.lengthSq() > 16;
      this.visualState = moving ? "walk" : "idle";
      playActorAnimation(this, this.assetId, this.visualState, this.facing);
    }
    this.shadow?.setPosition(this.x, this.y + (this.definition.shadowOffsetY ?? 16)).setVisible(this.active);
    this.setDepth(8 + this.y / 10000);
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
