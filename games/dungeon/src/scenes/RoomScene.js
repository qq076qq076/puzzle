import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { BUFFS } from "../data/buffs.js";
import { MONSTERS } from "../data/monsters.js";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { applyBuff, describeBuff } from "../systems/buff-system.js";
import { resolveMeleeAttack, updateBleed } from "../systems/combat-system.js";
import { makeRunSeed } from "../systems/rng.js";
import { generateFloor } from "../systems/room-generator.js";
import { createPrototypeTextures, createSlashTexture } from "../systems/texture-factory.js";
import { TouchControls } from "../systems/touch-controls.js";

export class RoomScene extends Phaser.Scene {
  constructor() {
    super("Room");
  }

  init(data = {}) {
    this.runSeed = data.runSeed ?? makeRunSeed();
    this.floor = generateFloor(this.runSeed);
    this.roomIndex = data.roomIndex ?? 0;
    this.build = {
      buffs: data.build?.buffs ?? [],
      health: data.build?.health ?? 100,
    };
    this.roomStatus = "combat";
    this.pendingSpawns = 0;
    this.enemies = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#11131d");
    createPrototypeTextures(this);
    createSlashTexture(this);
    this.currentRoom = this.floor[this.roomIndex];
    this.createRoom();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.applyBuild();
    this.physics.add.collider(this.player, this.walls);
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ONE,TWO,THREE,ENTER,R");
    this.touchControls = new TouchControls(this);
    this.createHud();
    this.spawnRoomEnemies();
    this.showHint("SPACE 攻擊 · SHIFT 閃避 · WASD／方向鍵移動");
  }

  applyBuild() {
    this.build.buffs.forEach((buffId) => applyBuff(this.player, buffId));
    this.player.health = Math.min(this.player.maxHealth, this.build.health);
  }

  createRoom() {
    const machineTint = this.currentRoom.theme === "machine" ? 0x858ba8 : 0xffffff;
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "room-floor-prototype")
      .setOrigin(0)
      .setTint(machineTint)
      .setDepth(-10);
    this.walls = this.physics.add.staticGroup();
    const wallThickness = 32;
    [
      [GAME_WIDTH / 2, wallThickness / 2, GAME_WIDTH, wallThickness],
      [GAME_WIDTH / 2, GAME_HEIGHT - wallThickness / 2, GAME_WIDTH, wallThickness],
      [wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
      [GAME_WIDTH - wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
    ].forEach(([x, y, width, height]) => this.addWall(x, y, width, height));
    this.currentRoom.obstacles.forEach(([x, y, width, height]) => this.addWall(x, y, width, height));
    if (this.currentRoom.theme === "machine") {
      this.add
        .text(GAME_WIDTH / 2, 102, "機械污染區", this.hudStyle(11, "#8d96ba"))
        .setOrigin(0.5)
        .setDepth(2);
    }
  }

  addWall(x, y, width, height) {
    const wall = this.walls.create(x, y, "room-wall-prototype");
    wall.setDisplaySize(width, height).refreshBody();
    wall.setDepth(-1);
  }

  spawnRoomEnemies() {
    this.pendingSpawns = this.currentRoom.enemies.length;
    this.currentRoom.enemies.forEach((plan, sequence) => {
      this.time.delayedCall(plan.delayMs, () => {
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
        if (this.roomStatus !== "combat" || !this.player.active) return;
        const definition = MONSTERS[plan.id];
        const point = this.currentRoom.spawnPoints[plan.spawnIndex % this.currentRoom.spawnPoints.length];
        const enemy = new Enemy(this, point[0], point[1], definition, sequence);
        this.physics.add.collider(enemy, this.walls);
        this.enemies.push(enemy);
      });
    });
  }

  createHud() {
    this.hud = {
      room: this.add.text(24, 20, `FLOOR 1 · ROOM ${this.currentRoom.roomNumber}/6`, this.hudStyle(14, "#dfb84f")).setScrollFactor(0).setDepth(110),
      health: this.add.text(24, 48, "HP 100/100", this.hudStyle(14, "#f5f1da")).setScrollFactor(0).setDepth(110),
      controls: this.add.text(24, GAME_HEIGHT - 30, "PROTOTYPE · NO MOUSE INPUT", this.hudStyle(11, "#77798a")).setScrollFactor(0).setDepth(110),
      dodge: this.add.text(GAME_WIDTH - 24, 22, "DODGE READY", this.hudStyle(11, "#82a8d8")).setOrigin(1, 0).setScrollFactor(0).setDepth(110),
      buffs: this.add.text(24, GAME_HEIGHT - 52, "BUFFS —", this.hudStyle(11, "#b9a9d4")).setScrollFactor(0).setDepth(110),
    };
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  showHint(message) {
    this.hint = this.add
      .text(GAME_WIDTH / 2, 58, message, this.hudStyle(12, "#aaa8b5"))
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(110);
    this.time.delayedCall(3500, () => this.hint?.setVisible(false));
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
    if (!this.player || !this.player.active) return;
    if (this.roomStatus === "combat") this.updateCombat(delta);
    else if (this.roomStatus === "reward") this.updateRewardInput();
    else if (this.roomStatus === "transition") this.updateTransitionInput();
    else if (this.roomStatus === "defeat") this.updateDefeatInput();
    this.updateHud();
  }

  updateCombat(delta) {
    const input = this.readInput();
    this.player.updateActor(input, delta);
    if (this.player.attackStarted) resolveMeleeAttack(this.player, this.enemies);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, delta));
    updateBleed(this.enemies, delta);
    if (this.player.health <= 0) {
      this.openDefeat();
      return;
    }
    if (this.pendingSpawns === 0 && this.enemies.every((enemy) => !enemy.active)) this.openReward();
  }

  updateRewardInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ONE)) this.chooseReward(0);
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.TWO)) this.chooseReward(1);
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.THREE)) this.chooseReward(2);
  }

  updateTransitionInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE)) this.goToNextRoom();
  }

  updateDefeatInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.R)) {
      this.scene.restart({ runSeed: makeRunSeed(), roomIndex: 0, build: { buffs: [], health: 100 } });
    }
  }

  updateHud() {
    const dodgeReady = this.player.dodgeCooldownRemaining <= 0;
    this.hud.health.setText(`HP ${this.player.health}/${this.player.maxHealth}`);
    this.hud.dodge.setText(dodgeReady ? "DODGE READY" : `DODGE ${(this.player.dodgeCooldownRemaining / 1000).toFixed(1)}s`);
    this.hud.dodge.setColor(dodgeReady ? "#82a8d8" : "#77798a");
    const buffNames = this.player.buffs.map((id) => BUFFS[id]?.name ?? id);
    this.hud.buffs.setText(buffNames.length ? `BUFFS ${buffNames.join(" · ")}` : "BUFFS —");
  }

  openReward() {
    if (this.roomStatus !== "combat") return;
    this.roomStatus = "reward";
    this.rewardGroup = this.add.container(0, 0).setDepth(150);
    this.rewardGroup.add(this.add.rectangle(480, 270, 850, 420, 0x0b0d16, 0.94).setStrokeStyle(3, 0xdfb84f, 0.9));
    this.rewardGroup.add(this.add.text(480, 105, "房間清除", this.hudStyle(26, "#f5f1da")).setOrigin(0.5));
    this.rewardGroup.add(this.add.text(480, 145, "選擇一項 Buff（1／2／3）", this.hudStyle(13, "#aaa8b5")).setOrigin(0.5));
    this.currentRoom.rewardIds.forEach((buffId, index) => this.createRewardCard(buffId, index));
  }

  createRewardCard(buffId, index) {
    const buff = BUFFS[buffId];
    if (!buff) return;
    const x = 250 + index * 230;
    const card = this.add
      .rectangle(x, 285, 200, 170, 0x202439, 1)
      .setStrokeStyle(2, index === 2 ? 0xb9a9d4 : 0x69718d, 1)
      .setInteractive(new Phaser.Geom.Rectangle(-100, -85, 200, 170), Phaser.Geom.Rectangle.Contains);
    const text = this.add
      .text(x, 285, `${index + 1}\n${buff.name}\n\n${buff.rarity}\n${buff.description}`, {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: "12px",
        align: "center",
        wordWrap: { width: 170 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    card.on("pointerdown", (pointer) => {
      if (this.isTouchPointer(pointer)) this.chooseReward(index);
    });
    this.rewardGroup.add([card, text]);
  }

  chooseReward(index) {
    if (this.roomStatus !== "reward") return;
    const buffId = this.currentRoom.rewardIds[index];
    if (!applyBuff(this.player, buffId)) return;
    this.rewardGroup?.destroy(true);
    this.rewardGroup = null;
    if (this.roomIndex >= 4) {
      this.openStageGate();
      return;
    }
    this.roomStatus = "transition";
    this.transitionText = this.add
      .text(480, 270, `${describeBuff(buffId)}\n\n按 Enter／Space 進入下一間`, {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: "16px",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(140);
  }

  openStageGate() {
    this.roomStatus = "transition";
    this.transitionText = this.add
      .text(480, 270, "五間普通房完成\n\n下一階段：第六房魔王", {
        color: "#dfb84f",
        fontFamily: "monospace",
        fontSize: "20px",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setDepth(140);
  }

  goToNextRoom() {
    if (this.roomIndex >= 4) return;
    this.scene.restart({
      runSeed: this.runSeed,
      roomIndex: this.roomIndex + 1,
      build: { buffs: this.player.buffs, health: this.player.health },
    });
  }

  openDefeat() {
    if (this.roomStatus === "defeat") return;
    this.roomStatus = "defeat";
    this.add.rectangle(480, 270, 850, 420, 0x0b0d16, 0.94).setStrokeStyle(3, 0xb94d45, 0.9).setDepth(150);
    this.add
      .text(480, 235, "YOU DIED", { color: "#e17b70", fontFamily: "monospace", fontSize: "30px", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(151);
    this.add
      .text(480, 300, "按 Enter／R 重新開始", { color: "#f5f1da", fontFamily: "monospace", fontSize: "15px" })
      .setOrigin(0.5)
      .setDepth(151);
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === "touch" || pointer?.event?.pointerType === "pen";
  }

  shutdown() {
    this.touchControls?.destroy();
  }
}
