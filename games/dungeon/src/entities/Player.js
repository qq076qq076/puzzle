import Phaser from "phaser";

const EPSILON = 0.001;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player-prototype");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    this.body.setSize(14, 18).setOffset(5, 8);
    this.body.setDrag(900, 900);
    this.body.setMaxVelocity(210, 210);

    this.maxHealth = 100;
    this.health = 100;
    this.attackDamage = 20;
    this.attackRange = 72;
    this.attackArcDeg = 100;
    this.moveSpeed = 190;
    this.attackCooldownMs = 450;
    this.attackCooldownRemaining = 0;
    this.attackRemaining = 0;
    this.attackStarted = false;
    this.dodgeCooldownMs = 1200;
    this.dodgeCooldownRemaining = 0;
    this.dodgeRemaining = 0;
    this.invulnerableRemaining = 0;
    this.damageReduction = 0;
    this.bleedDamage = 0;
    this.machineDamageMultiplier = 1;
    this.buffs = [];
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.slash = scene.add.image(0, 0, "slash-prototype").setOrigin(0.5).setDepth(9).setVisible(false);
  }

  updateActor(input, delta) {
    const dt = Math.max(0, delta);
    this.attackStarted = false;
    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - dt);
    this.dodgeCooldownRemaining = Math.max(0, this.dodgeCooldownRemaining - dt);
    this.invulnerableRemaining = Math.max(0, this.invulnerableRemaining - dt);

    if (this.dodgeRemaining > 0) {
      this.dodgeRemaining = Math.max(0, this.dodgeRemaining - dt);
      if (this.dodgeRemaining === 0) this.setVelocity(0, 0);
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

    if (input.dodge) this.tryDodge();
    if (input.attack) this.tryAttack();
    this.attackRemaining = Math.max(0, this.attackRemaining - dt);
    this.updateVisuals();
  }

  tryAttack() {
    if (this.attackCooldownRemaining > 0 || this.dodgeRemaining > 0) return false;
    this.attackCooldownRemaining = this.attackCooldownMs;
    this.attackRemaining = 115;
    this.attackStarted = true;
    return true;
  }

  tryDodge() {
    if (this.dodgeCooldownRemaining > 0 || this.dodgeRemaining > 0) return false;
    this.dodgeCooldownRemaining = this.dodgeCooldownMs;
    this.dodgeRemaining = 220;
    this.invulnerableRemaining = 180;
    this.setVelocity(this.facing.x * 500, this.facing.y * 500);
    return true;
  }

  takeDamage(amount) {
    if (this.invulnerableRemaining > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - Math.max(1, amount - this.damageReduction));
    this.invulnerableRemaining = 600;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
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
    this.slash.setVisible(this.isAttacking()).setPosition(this.x + this.facing.x * 28, this.y + this.facing.y * 28);
    this.slash.setRotation(Math.atan2(this.facing.y, this.facing.x));
    this.setDepth(10 + this.y / 10000);
  }

  destroy(fromScene) {
    this.slash?.destroy();
    super.destroy(fromScene);
  }
}
