import Phaser from "phaser";
import { playActorAnimation } from "../systems/actor-animations.js";
import { tickContactDamage, tryContactDamage } from "../systems/contact-damage.js";
import { startKnockback, updateKnockback } from "../systems/knockback.js";

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "provided-boss");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.definition = {
      id: "boss",
      name: "骨面機械王",
      damage: 20,
      contactDamage: 12,
      contactCooldownMs: 900,
      attackRange: 92,
      armor: 2,
      machine: true,
    };
    this.maxHealth = 450;
    this.health = this.maxHealth;
    this.phase = 1;
    this.state = "combat";
    this.attackCooldownRemaining = 1200;
    this.contactDamageCooldownRemaining = 0;
    this.attackWindupRemaining = 0;
    this.recoverRemaining = 0;
    this.phaseTransitionRemaining = 0;
    this.staggerRemaining = 0;
    this.knockbackRemaining = 0;
    this.knockbackVelocityX = 0;
    this.knockbackVelocityY = 0;
    this.sustainedDamage = 0;
    this.patternIndex = 0;
    this.comboStep = 0;
    this.chargeRemaining = 0;
    this.chargeHit = false;
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.setScale(2.5);
    this.setDepth(12);
    this.setCollideWorldBounds(true);
    this.body.setCircle(19);
    this.body.setOffset((this.width - this.body.width) / 2, (this.height - this.body.height) / 2 + 4);
    this.body.setDrag(160, 160);
    this.body.setMaxVelocity(520, 520);
    this.shadow = scene.add.image(x, y + 22, "provided-shadow").setScale(4).setAlpha(0.64).setDepth(5);
    playActorAnimation(this, "boss", "idle", this.facing);
  }

  updateAI(player, delta) {
    if (!this.active || !player.active || player.health <= 0) return;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - delta);
    tickContactDamage(this, delta);
    this.recoverRemaining = Math.max(0, this.recoverRemaining - delta);
    this.phaseTransitionRemaining = Math.max(0, this.phaseTransitionRemaining - delta);
    this.staggerRemaining = Math.max(0, this.staggerRemaining - delta);
    this.hitFlashRemaining = Math.max(0, (this.hitFlashRemaining || 0) - delta);
    this.updatePhase();

    if (this.phaseTransitionRemaining > 0 || this.staggerRemaining > 0) {
      this.state = this.staggerRemaining > 0 ? "stagger" : "phase_transition";
      this.setVelocity(0, 0);
      this.updateVisuals();
      return;
    }
    if (updateKnockback(this, delta)) {
      this.state = "hurt";
      this.updateVisuals();
      return;
    }
    if (this.chargeRemaining > 0) {
      this.chargeRemaining = Math.max(0, this.chargeRemaining - delta);
      this.state = "charge";
      if (!this.chargeHit && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= 48) {
        this.chargeHit = true;
        player.takeDamage(28 + this.phase * 4, {
          knockback: { x: player.x - this.x, y: player.y - this.y, distance: 20, durationMs: 110 },
        });
      }
      if (this.chargeRemaining === 0) {
        this.setVelocity(0, 0);
        this.recoverRemaining = 420;
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
    if (this.recoverRemaining > 0) {
      this.state = "recover";
      this.setVelocity(0, 0);
      this.updateVisuals();
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.facing.set(dx / distance, dy / distance);
    if (distance > 116) this.setVelocity((dx / distance) * (this.phase === 3 ? 86 : 70), (dy / distance) * (this.phase === 3 ? 86 : 70));
    else this.setVelocity(0, 0);
    if (this.attackCooldownRemaining <= 0) this.startPattern();
    this.updateVisuals();
  }

  updatePhase() {
    const ratio = this.health / this.maxHealth;
    const nextPhase = ratio <= 0.35 ? 3 : ratio <= 0.7 ? 2 : 1;
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.phaseTransitionRemaining = 1000;
      this.attackCooldownRemaining = 1200;
      this.scene.onBossPhaseChange?.(this.phase);
    }
  }

  startPattern() {
    const patterns = this.phase === 1
      ? ["combo", "charge", "combo"]
      : this.phase === 2
        ? ["combo", "summon", "charge"]
        : ["combo", "mine", "charge", "combo"];
    const kind = patterns[this.patternIndex % patterns.length];
    this.patternIndex += 1;
    this.attackCooldownRemaining = this.phase === 3 ? 720 : 1000;
    this.attackWindupRemaining = kind === "mine" ? 560 : kind === "charge" ? 440 : 360;
    this.attackKind = kind;
    this.comboStep = kind === "combo" ? 0 : this.comboStep;
    this.scene.showBossTelegraph?.(this.x, this.y, kind, this.attackWindupRemaining);
    this.scene.audio?.beep(kind === "mine" ? "boss" : "telegraph");
  }

  performAttack(player) {
    if (this.attackKind === "combo") {
      this.comboStep += 1;
      if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= this.definition.attackRange + 20) {
        player.takeDamage(20 + this.phase * 3, {
          knockback: { x: player.x - this.x, y: player.y - this.y, distance: 16, durationMs: 110 },
        });
      }
      if (this.comboStep < 3) {
        this.attackWindupRemaining = this.phase === 3 ? 190 : 240;
        this.scene.showBossTelegraph?.(this.x, this.y, "combo", this.attackWindupRemaining);
      } else {
        this.comboStep = 0;
        this.recoverRemaining = 400;
      }
      return;
    }
    if (this.attackKind === "charge") {
      const target = this.scene.player;
      const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y).normalize();
      this.facing.copy(direction);
      this.setVelocity(direction.x * 430, direction.y * 430);
      this.chargeRemaining = this.phase === 3 ? 380 : 300;
      this.chargeHit = false;
      this.state = "charge";
      return;
    }
    if (this.attackKind === "summon") {
      this.scene.spawnBossMinion?.();
      this.scene.spawnBossMinion?.();
      this.recoverRemaining = 520;
      return;
    }
    if (this.attackKind === "mine") {
      this.scene.spawnBossHazard?.({ ring: true });
      this.scene.spawnBossHazard?.({ ring: true });
      this.recoverRemaining = 520;
    }
  }

  tryContactDamage(player) {
    return tryContactDamage(this, player);
  }

  takeDamage(amount, multiplier = 1, context = {}) {
    if (!this.active || this.phaseTransitionRemaining > 0) return { hit: false, damage: 0, killed: false };
    const damage = Math.max(1, Math.round(amount * multiplier - this.definition.armor));
    this.health = Math.max(0, this.health - damage);
    this.sustainedDamage += damage;
    this.hitFlashRemaining = 110;
    if (this.sustainedDamage >= 80) {
      this.sustainedDamage = 0;
      this.staggerRemaining = 360;
    }
    if (context.knockback && this.staggerRemaining <= 0 && this.chargeRemaining <= 0) {
      startKnockback(this, context.knockback, { distance: 8, durationMs: 90 });
    }
    if (this.health <= 0) {
      this.state = "dead";
      this.setActive(false);
      this.setVisible(false);
      this.body.enable = false;
      this.shadow?.setVisible(false);
      this.scene.onBossDefeated?.();
      return { hit: true, damage, killed: true };
    }
    return { hit: true, damage, killed: false };
  }

  updateVisuals() {
    this.setAlpha(this.hitFlashRemaining > 0 ? 0.58 : 1);
    const moving = this.chargeRemaining > 0 || this.body.velocity.lengthSq() > 16;
    playActorAnimation(this, "boss", moving ? "walk" : "idle", this.facing);
    this.shadow?.setPosition(this.x, this.y + 22).setVisible(this.active);
    this.setDepth(12 + this.y / 10000);
  }

  destroy(fromScene) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
