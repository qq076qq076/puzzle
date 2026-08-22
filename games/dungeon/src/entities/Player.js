import Phaser from "phaser";
import { playActorAnimation } from "../systems/actor-animations.js";
import { useEmergencyPotion } from "../systems/consumable-system.js";
import { startKnockback, updateKnockback } from "../systems/knockback.js";

const EPSILON = 0.001;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "provided-player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    this.body.setSize(12, 12).setOffset(10, 16);
    this.body.setDrag(900, 900);
    this.body.setMaxVelocity(230, 230);

    this.maxHealth = 100;
    this.health = 100;
    this.attackDamage = 20;
    this.attackRange = 72;
    this.attackArcDeg = 100;
    this.moveSpeed = 192;
    this.attackCooldownMs = 450;
    this.attackCooldownRemaining = 0;
    this.attackRemaining = 0;
    this.attackElapsed = 0;
    this.attackStarted = false;
    this.attackHitWindow = false;
    this.attackHitResolved = false;
    this.dodgeCooldownMs = 1200;
    this.dodgeCooldownRemaining = 0;
    this.dodgeRemaining = 0;
    this.invulnerableRemaining = 0;
    this.knockbackRemaining = 0;
    this.knockbackVelocityX = 0;
    this.knockbackVelocityY = 0;
    this.damageReduction = 0;
    this.knockbackMultiplier = 1;
    this.bleedDamage = 0;
    this.lifestealAmount = 0;
    this.lifestealTriggers = 0;
    this.machineResonanceStacks = 0;
    this.machineDamageMultiplier = 1;
    this.comboDrive = false;
    this.comboHits = 0;
    this.lastStand = false;
    this.gold = 0;
    this.consumables = 0;
    this.trophy = false;
    this.buffs = [];
    this.buffStacks = {};
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.attackFacing = this.facing.clone();
    this.shadow = scene.add.image(x, y + 10, "provided-shadow").setScale(2).setAlpha(0.62).setDepth(5);
    playActorAnimation(this, "player", "idle", this.facing);
  }

  updateActor(input, delta) {
    const dt = Math.max(0, delta);
    this.attackStarted = false;
    this.attackHitWindow = false;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - dt);
    this.dodgeCooldownRemaining = Math.max(0, this.dodgeCooldownRemaining - dt);
    this.invulnerableRemaining = Math.max(0, this.invulnerableRemaining - dt);

    if (this.dodgeRemaining > 0) {
      this.dodgeRemaining = Math.max(0, this.dodgeRemaining - dt);
      if (this.dodgeRemaining === 0) this.setVelocity(0, 0);
      this.updateVisuals();
      return;
    }

    if (updateKnockback(this, dt)) {
      this.updateVisuals();
      return;
    }

    const move = new Phaser.Math.Vector2(input.moveX, input.moveY);
    if (move.lengthSq() > EPSILON) {
      move.normalize();
      this.facing.copy(move);
      this.setVelocity(move.x * this.moveSpeed, move.y * this.moveSpeed);
    } else {
      this.setVelocity(0, 0);
    }

    if (input.dodge) this.tryDodge(move.lengthSq() > EPSILON ? move : this.facing);
    if (input.attack) this.tryAttack();

    if (this.attackRemaining > 0) {
      this.attackRemaining = Math.max(0, this.attackRemaining - dt);
      this.attackElapsed += dt;
      if (!this.attackHitResolved && this.attackElapsed >= 58) {
        this.attackHitResolved = true;
        this.attackHitWindow = true;
      }
    }
    this.updateVisuals();
  }

  tryAttack() {
    if (this.attackCooldownRemaining > 0 || this.dodgeRemaining > 0 || this.health <= 0) return false;
    this.attackCooldownRemaining = this.attackCooldownMs;
    this.attackRemaining = 142;
    this.attackElapsed = 0;
    this.attackStarted = true;
    this.attackHitResolved = false;
    this.attackFacing.copy(this.facing);
    this.scene.audio?.beep("attack");
    return true;
  }

  tryDodge(direction) {
    if (this.dodgeCooldownRemaining > 0 || this.dodgeRemaining > 0 || this.health <= 0) return false;
    this.dodgeCooldownRemaining = this.dodgeCooldownMs;
    this.dodgeRemaining = 220;
    this.invulnerableRemaining = 180;
    this.setVelocity(direction.x * 500, direction.y * 500);
    this.scene.audio?.beep("dodge");
    return true;
  }

  takeDamage(amount, context = {}) {
    if (this.invulnerableRemaining > 0 || this.health <= 0) return false;
    const dealt = Math.max(1, Math.round(amount - this.damageReduction));
    this.health = Math.max(0, this.health - dealt);
    this.invulnerableRemaining = 600;
    if (context.knockback) startKnockback(this, context.knockback, { distance: 14, durationMs: 110 });
    this.attackRemaining = 0;
    this.attackElapsed = 0;
    this.attackHitWindow = false;
    this.attackHitResolved = true;
    this.scene.runStats && (this.scene.runStats.damageTaken += dealt);
    this.scene.onPlayerDamaged?.(dealt);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => this.active && this.clearTint());
    return true;
  }

  consumePotion() {
    const result = useEmergencyPotion(this);
    this.scene.showStatus?.(result.message);
    if (!result.used) {
      this.scene.audio?.beep("ui");
      return false;
    }
    this.scene.runStats && (this.scene.runStats.consumablesUsed += 1);
    this.scene.audio?.beep("reward");
    return true;
  }

  isAttacking() {
    return this.attackRemaining > 0;
  }

  isDodging() {
    return this.dodgeRemaining > 0;
  }

  updateVisuals() {
    this.setAlpha(this.invulnerableRemaining > 0 && Math.floor(this.scene.time.now / 70) % 2 === 0 ? 0.35 : 1);
    const visualFacing = this.isAttacking() ? this.attackFacing : this.facing;
    if (this.attackStarted) playActorAnimation(this, "player", "attack", visualFacing, { restart: true });
    else if (!this.isAttacking()) {
      const moving = this.isDodging() || this.body.velocity.lengthSq() > 16;
      playActorAnimation(this, "player", moving ? "walk" : "idle", visualFacing);
    }
    this.shadow.setPosition(this.x, this.y + 10).setVisible(this.active);
    this.setDepth(10 + this.y / 10000);
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
