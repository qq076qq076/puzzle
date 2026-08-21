import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { BUFFS } from "../data/buffs.js";
import { MONSTERS } from "../data/monsters.js";
import { Boss } from "../entities/Boss.js";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { applyBuff } from "../systems/buff-system.js";
import { resolveMeleeAttack, updateBleed } from "../systems/combat-system.js";
import { createRng, makeRunSeed } from "../systems/rng.js";
import { createPrototypeTextures, createSlashTexture } from "../systems/texture-factory.js";
import { TouchControls } from "../systems/touch-controls.js";

export class BossScene extends Phaser.Scene {
  constructor() {
    super("Boss");
  }

  init(data = {}) {
    this.runSeed = data.runSeed ?? makeRunSeed();
    this.build = { buffs: data.build?.buffs ?? [], health: data.build?.health ?? 100 };
    this.enemies = [];
    this.hazards = [];
    this.bossPhase = 1;
    this.bossTelegraphRemaining = 0;
    this.hazardRng = createRng(`${this.runSeed}:boss-hazards`);
    this.battleStatus = "combat";
  }

  create() {
    this.cameras.main.setBackgroundColor("#11131d");
    createPrototypeTextures(this);
    createSlashTexture(this);
    this.createArena();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 115);
    this.applyBuild();
    this.physics.add.collider(this.player, this.walls);
    this.boss = new Boss(this, GAME_WIDTH / 2, 190);
    this.physics.add.collider(this.boss, this.walls);
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ENTER,R");
    this.touchControls = new TouchControls(this);
    this.createHud();
    this.showHint("骨面機械王 · 閃避紅色警示並在攻擊後反擊");
  }

  applyBuild() {
    this.build.buffs.forEach((buffId) => applyBuff(this.player, buffId));
    this.player.health = Math.min(this.player.maxHealth, this.build.health);
  }

  createArena() {
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "room-floor-prototype")
      .setOrigin(0)
      .setTint(0x858ba8)
      .setDepth(-10);
    this.walls = this.physics.add.staticGroup();
    const wallThickness = 32;
    [
      [GAME_WIDTH / 2, wallThickness / 2, GAME_WIDTH, wallThickness],
      [GAME_WIDTH / 2, GAME_HEIGHT - wallThickness / 2, GAME_WIDTH, wallThickness],
      [wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
      [GAME_WIDTH - wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
      [210, 170, 46, 46],
      [750, 170, 46, 46],
      [210, 370, 46, 46],
      [750, 370, 46, 46],
    ].forEach(([x, y, width, height]) => this.addWall(x, y, width, height));
    this.add
      .circle(GAME_WIDTH / 2, 270, 132, 0x4a4058, 0.12)
      .setStrokeStyle(2, 0xb9a9d4, 0.32)
      .setDepth(-1);
    this.add
      .text(GAME_WIDTH / 2, 100, "BOSS ROOM · 骨面機械王座", this.hudStyle(12, "#b9a9d4"))
      .setOrigin(0.5)
      .setDepth(2);
  }

  addWall(x, y, width, height) {
    const wall = this.walls.create(x, y, "room-wall-prototype");
    wall.setDisplaySize(width, height).refreshBody();
    wall.setDepth(-1);
  }

  createHud() {
    this.hud = {
      room: this.add.text(24, 20, "FLOOR 1 · ROOM 6/6", this.hudStyle(14, "#dfb84f")).setScrollFactor(0).setDepth(110),
      health: this.add.text(24, 48, "HP 100/100", this.hudStyle(14, "#f5f1da")).setScrollFactor(0).setDepth(110),
      phase: this.add.text(GAME_WIDTH - 24, 22, "PHASE 1", this.hudStyle(11, "#e17b70")).setOrigin(1, 0).setScrollFactor(0).setDepth(110),
      buffs: this.add.text(24, GAME_HEIGHT - 52, "BUFFS —", this.hudStyle(11, "#b9a9d4")).setScrollFactor(0).setDepth(110),
      controls: this.add.text(24, GAME_HEIGHT - 30, "PROTOTYPE · NO MOUSE INPUT", this.hudStyle(11, "#77798a")).setScrollFactor(0).setDepth(110),
    };
    this.bossBarBack = this.add.rectangle(200, 66, 560, 12, 0x151622, 1).setOrigin(0, 0.5).setDepth(110);
    this.bossBarFill = this.add.rectangle(200, 66, 560, 12, 0xb94d45, 1).setOrigin(0, 0.5).setDepth(111);
    this.bossBarLabel = this.add.text(480, 78, "骨面機械王", this.hudStyle(11, "#f5f1da")).setOrigin(0.5).setDepth(111);
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  showHint(message) {
    this.hint = this.add.text(GAME_WIDTH / 2, 126, message, this.hudStyle(12, "#aaa8b5")).setOrigin(0.5).setDepth(110);
    this.time.delayedCall(4000, () => this.hint?.setVisible(false));
  }

  readInput() {
    const moveX = Number(this.keyboard.D.isDown || this.keyboard.RIGHT.isDown) - Number(this.keyboard.A.isDown || this.keyboard.LEFT.isDown);
    const moveY = Number(this.keyboard.S.isDown || this.keyboard.DOWN.isDown) - Number(this.keyboard.W.isDown || this.keyboard.UP.isDown);
    const touchMove = this.touchControls?.enabled ? { x: this.touchControls.moveX, y: this.touchControls.moveY } : { x: 0, y: 0 };
    const actions = this.touchControls?.consumeActions() ?? { attack: false, dodge: false };
    return {
      moveX: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.x : moveX,
      moveY: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.y : moveY,
      attack: actions.attack || Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE),
      dodge: actions.dodge || Phaser.Input.Keyboard.JustDown(this.keyboard.SHIFT),
    };
  }

  update(_time, delta) {
    if (this.battleStatus !== "combat") {
      this.updateEndInput();
      return;
    }
    const input = this.readInput();
    this.player.updateActor(input, delta);
    const targets = [this.boss, ...this.enemies];
    if (this.player.attackStarted) resolveMeleeAttack(this.player, targets);
    this.boss.updateAI(this.player, delta);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, delta));
    updateBleed(targets, delta);
    this.updateHazards(delta);
    this.updateBossTelegraph(delta);
    this.updateHud();
    if (this.player.health <= 0) this.openDefeat();
    else if (!this.boss.active) this.openVictory();
  }

  updateHud() {
    const ratio = Phaser.Math.Clamp(this.boss.health / this.boss.maxHealth, 0, 1);
    this.bossBarFill.setDisplaySize(Math.max(1, 560 * ratio), 12);
    this.hud.phase.setText(`PHASE ${this.boss.phase}`);
    this.hud.health.setText(`HP ${this.player.health}/${this.player.maxHealth}`);
    const buffNames = this.player.buffs.map((id) => BUFFS[id]?.name ?? id);
    this.hud.buffs.setText(buffNames.length ? `BUFFS ${buffNames.join(" · ")}` : "BUFFS —");
  }

  onBossPhaseChange(phase) {
    this.bossPhase = phase;
    const colors = { 1: "#e17b70", 2: "#dfb84f", 3: "#c68bd7" };
    this.hud.phase.setColor(colors[phase]);
    this.showHint(`魔王進入第 ${phase} 階段`);
  }

  showBossTelegraph(x, y) {
    this.bossTelegraphRemaining = 380;
    if (!this.bossTelegraph) {
      this.bossTelegraph = this.add
        .circle(x, y, 78, 0xb94d45, 0.16)
        .setStrokeStyle(3, 0xe17b70, 0.95)
        .setDepth(5);
    }
    this.bossTelegraph.setPosition(x, y).setVisible(true);
  }

  updateBossTelegraph(delta) {
    if (!this.bossTelegraph) return;
    this.bossTelegraphRemaining = Math.max(0, this.bossTelegraphRemaining - delta);
    this.bossTelegraph.setVisible(this.bossTelegraphRemaining > 0);
  }

  spawnBossMinion() {
    const activeMinions = this.enemies.filter((enemy) => enemy.active).length;
    if (activeMinions >= 4) return;
    const angle = this.hazardRng.next() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.boss.x + Math.cos(angle) * 110, 70, GAME_WIDTH - 70);
    const y = Phaser.Math.Clamp(this.boss.y + Math.sin(angle) * 110, 100, GAME_HEIGHT - 70);
    const enemy = new Enemy(this, x, y, MONSTERS.steel_spider, this.enemies.length);
    this.physics.add.collider(enemy, this.walls);
    this.enemies.push(enemy);
  }

  spawnBossHazard() {
    const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
    const y = Phaser.Math.Between(150, GAME_HEIGHT - 90);
    this.hazards.push({
      x,
      y,
      warningMs: 700,
      activeMs: 900,
      circle: this.add.circle(x, y, 32, 0xb94d45, 0.18).setStrokeStyle(2, 0xe17b70, 1).setDepth(3),
      damaged: false,
    });
  }

  updateHazards(delta) {
    this.hazards = this.hazards.filter((hazard) => {
      if (hazard.warningMs > 0) {
        hazard.warningMs -= delta;
        hazard.circle.setAlpha(0.18 + (1 - Math.max(0, hazard.warningMs) / 700) * 0.25);
        return true;
      }
      if (!hazard.damaged) {
        hazard.damaged = true;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) <= 38) this.player.takeDamage(16);
        hazard.circle.setFillStyle(0xe17b70, 0.5);
      }
      hazard.activeMs -= delta;
      if (hazard.activeMs <= 0) {
        hazard.circle.destroy();
        return false;
      }
      return true;
    });
  }

  openVictory() {
    if (this.battleStatus !== "combat") return;
    this.battleStatus = "victory";
    this.touchControls?.destroy();
    this.add.rectangle(480, 270, 850, 420, 0x0b0d16, 0.95).setStrokeStyle(3, 0xdfb84f, 0.95).setDepth(150);
    this.add.text(480, 190, "VICTORY", { color: "#dfb84f", fontFamily: "monospace", fontSize: "36px", fontStyle: "bold" }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 250, "第一地層：鏽蝕王座\n骨面機械王已被擊敗", { color: "#f5f1da", fontFamily: "monospace", fontSize: "16px", align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 335, `Seed ${this.runSeed}\n\n按 Enter／R 重新開始`, { color: "#aaa8b5", fontFamily: "monospace", fontSize: "12px", align: "center", lineSpacing: 6 }).setOrigin(0.5).setDepth(151);
    this.makeRestartButton();
  }

  openDefeat() {
    if (this.battleStatus !== "combat") return;
    this.battleStatus = "defeat";
    this.touchControls?.destroy();
    this.add.rectangle(480, 270, 850, 420, 0x0b0d16, 0.95).setStrokeStyle(3, 0xb94d45, 0.95).setDepth(150);
    this.add.text(480, 205, "YOU DIED", { color: "#e17b70", fontFamily: "monospace", fontSize: "32px", fontStyle: "bold" }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 290, "你倒在骨面機械王座前\n\n按 Enter／R 重新開始", { color: "#f5f1da", fontFamily: "monospace", fontSize: "15px", align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(151);
    this.makeRestartButton();
  }

  makeRestartButton() {
    const button = this.add.rectangle(480, 425, 220, 44, 0x303a55, 1).setStrokeStyle(2, 0x9aa2c1, 1).setDepth(151).setInteractive();
    this.add.text(480, 425, "重新開始", this.hudStyle(13, "#f5f1da")).setOrigin(0.5).setDepth(152);
    button.on("pointerdown", (pointer) => {
      if (this.isTouchPointer(pointer)) this.restartRun();
    });
  }

  updateEndInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.R)) this.restartRun();
  }

  restartRun() {
    this.scene.start("Room", { runSeed: makeRunSeed(), roomIndex: 0, build: { buffs: [], health: 100 } });
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === "touch" || pointer?.event?.pointerType === "pen";
  }

  shutdown() {
    this.touchControls?.destroy();
  }
}
