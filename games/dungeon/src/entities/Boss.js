import Phaser from "phaser";

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "boss-prototype");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.definition = {
      id: "boss",
      name: "骨面機械王",
      damage: 20,
      attackRange: 76,
    };
    this.maxHealth = 450;
    this.health = this.maxHealth;
    this.phase = 1;
    this.attackCooldownRemaining = 1300;
    this.attackWindupRemaining = 0;
    this.summonCooldownRemaining = 3000;
    this.hazardCooldownRemaining = 2000;
    this.hitFlashRemaining = 0;
    this.setDepth(12);
    this.setCollideWorldBounds(true);
    this.body.setCircle(22, 10, 10);
    this.body.setDrag(160, 160);
    this.body.setMaxVelocity(72, 72);
  }

  updateAI(player, delta) {
    if (!this.active || !player.active || player.health <= 0) return;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - delta);
    this.attackWindupRemaining = Math.max(0, this.attackWindupRemaining - delta);
    this.summonCooldownRemaining = Math.max(0, this.summonCooldownRemaining - delta);
    this.hazardCooldownRemaining = Math.max(0, this.hazardCooldownRemaining - delta);
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - delta);
    this.updatePhase();

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 86 && this.attackWindupRemaining <= 0) {
      const speed = this.phase === 3 ? 82 : 68;
      this.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    } else {
      this.setVelocity(0, 0);
    }

    if (this.attackWindupRemaining <= 0 && this.attackCooldownRemaining <= 0) {
      this.attackWindupRemaining = 380;
      this.attackCooldownRemaining = this.phase === 3 ? 760 : 1050;
      this.scene.showBossTelegraph(this.x, this.y);
    }
    if (this.attackWindupRemaining === 0 && distance <= this.definition.attackRange + 15) {
      player.takeDamage(this.definition.damage + this.phase * 3);
    }

    if (this.phase >= 2 && this.summonCooldownRemaining <= 0) {
      this.summonCooldownRemaining = this.phase === 3 ? 2600 : 3600;
      this.scene.spawnBossMinion();
    }
    if (this.phase === 3 && this.hazardCooldownRemaining <= 0) {
      this.hazardCooldownRemaining = 2300;
      this.scene.spawnBossHazard();
    }
    this.setAlpha(this.hitFlashRemaining > 0 ? 0.55 : 1);
    this.setDepth(12 + this.y / 10000);
  }

  updatePhase() {
    const ratio = this.health / this.maxHealth;
    const nextPhase = ratio <= 0.35 ? 3 : ratio <= 0.7 ? 2 : 1;
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.scene.onBossPhaseChange(this.phase);
    }
  }

  takeDamage(amount, multiplier = 1) {
    if (!this.active) return false;
    this.health = Math.max(0, this.health - Math.max(1, Math.round(amount * multiplier)));
    this.hitFlashRemaining = 100;
    if (this.health <= 0) {
      this.setActive(false);
      this.setVisible(false);
      this.body.enable = false;
    }
    return true;
  }
}
