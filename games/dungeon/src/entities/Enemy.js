import Phaser from "phaser";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, definition, sequence = 0) {
    super(scene, x, y, definition.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.definition = definition;
    this.sequence = sequence;
    this.health = definition.maxHealth;
    this.attackCooldownRemaining = 500 + sequence * 80;
    this.hitFlashRemaining = 0;
    this.setTint(definition.color);
    this.setDepth(8);
    this.setCollideWorldBounds(true);
    this.body.setCircle(Math.min(11, this.width * 0.34));
    this.body.setOffset((this.width - this.body.width) / 2, (this.height - this.body.height) / 2);
    this.body.setDrag(240, 240);
    this.body.setMaxVelocity(definition.speed, definition.speed);
  }

  updateAI(player, delta) {
    if (!this.active || !player.active || player.health <= 0) return;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - delta);
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - delta);
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const attackRange = this.definition.attackRange;
    if (distance > attackRange) {
      this.setVelocity((dx / distance) * this.definition.speed, (dy / distance) * this.definition.speed);
    } else {
      this.setVelocity(0, 0);
      if (this.attackCooldownRemaining <= 0) {
        player.takeDamage(this.definition.damage);
        this.attackCooldownRemaining = this.definition.attackCooldownMs;
      }
    }
    this.setAlpha(this.hitFlashRemaining > 0 ? 0.55 : 1);
    this.setDepth(8 + this.y / 10000);
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
