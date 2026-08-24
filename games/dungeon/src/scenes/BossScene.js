import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { MONSTERS } from "../data/monsters.js";
import { getBossVolleyOffsets } from "../data/boss-patterns.js";
import { ENTRY_DOOR_POINT, ENTRY_POINT, ENTRY_SPAWN_POINT } from "../data/rooms.js";
import { Boss } from "../entities/Boss.js";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { resolveMeleeAttack, updateBleed } from "../systems/combat-system.js";
import { spawnProjectile, updateProjectiles, clearProjectiles } from "../systems/projectile-system.js";
import { cloneRunStats, createRunStats, getRunDurationSeconds } from "../systems/run-state.js";
import { getDungeonAudio } from "../systems/audio-system.js";
import { createRng, makeRunSeed } from "../systems/rng.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { closeSideDoor, constrainActorToClosedDoor, createSideDoor } from "../systems/door-system.js";
import { applyPlayerBuild, normalizeRunBuild } from "../systems/player-build.js";
import { TouchControls } from "../systems/touch-controls.js";
import { disableMouseInput, isTouchPointer, makeTouchOnlyButton } from "../ui/input.js";
import { createCombatHud, createPauseOverlay, toggleBuffPanel, updateCombatHud } from "../ui/hud.js";
import { bindPauseKeyboard, createPauseKeyboardHandlers, unbindPauseKeyboard } from "../ui/pause-keyboard.js";

export class BossScene extends Phaser.Scene {
  constructor() {
    super("Boss");
  }

  init(data = {}) {
    this.runSeed = data.runSeed ?? makeRunSeed();
    this.build = normalizeRunBuild(data.build);
    this.runStats = cloneRunStats(data.runStats || createRunStats(this.runSeed));
    this.enemies = [];
    this.hazards = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.bossPhase = 1;
    this.battleStatus = "entering";
    this.introRemaining = 0;
    this.paused = false;
    this.hazardRng = createRng(`${this.runSeed}:boss-hazards`);
  }

  create() {
    disableMouseInput(this);
    this.audio = getDungeonAudio();
    this.createArena();
    this.player = new Player(this, ENTRY_SPAWN_POINT[0], ENTRY_SPAWN_POINT[1]);
    this.enemyGroup = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.player.facing.set(1, 0);
    this.applyBuild();
    this.physics.add.collider(this.player, this.walls);
    this.boss = new Boss(this, GAME_WIDTH / 2, 168);
    this.physics.add.collider(this.boss, this.walls);
    this.physics.add.collider(this.player, this.boss, () => this.boss.tryContactDamage(this.player));
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ENTER,R,ESC,P,M,B,Q");
    this.keyboardActions = { attack: false, dodge: false, potion: false };
    this.keyHandlers = {
      pause: () => this.togglePause(),
      sound: () => {
        this.audio.toggle();
        this.hud?.soundButton.text.setText(this.audio.enabled ? "SOUND" : "MUTE");
      },
      buffs: () => toggleBuffPanel(this, this.hud, this.player),
      attack: () => {
        if (!this.paused && this.battleStatus === "combat") this.keyboardActions.attack = true;
      },
      dodge: () => {
        if (!this.paused && this.battleStatus === "combat") this.keyboardActions.dodge = true;
      },
      potion: () => {
        if (!this.paused && this.battleStatus === "combat") this.keyboardActions.potion = true;
      },
    };
    this.pauseKeyHandlers = createPauseKeyboardHandlers(this);
    this.input.keyboard.on("keydown-ESC", this.keyHandlers.pause);
    this.input.keyboard.on("keydown-P", this.keyHandlers.pause);
    this.input.keyboard.on("keydown-M", this.keyHandlers.sound);
    this.input.keyboard.on("keydown-B", this.keyHandlers.buffs);
    this.input.keyboard.on("keydown-SPACE", this.keyHandlers.attack);
    this.input.keyboard.on("keydown-SHIFT", this.keyHandlers.dodge);
    this.input.keyboard.on("keydown-Q", this.keyHandlers.potion);
    bindPauseKeyboard(this, this.pauseKeyHandlers);
    this.createHud();
    this.touchControls = new TouchControls(this, {
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
    this.introText = this.add.text(480, 285, "第六房\n骨面機械王座\n\n從左側開門走入…", {
      color: "#f5f1da",
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
      align: "center",
      lineSpacing: 9,
    }).setOrigin(0.5).setDepth(150);
    this.showHint("閃避紅色預警 · 先處理鋼鐵蜘蛛 · 每個攻擊都有反擊窗口");
  }

  applyBuild() {
    applyPlayerBuild(this.player, this.build);
  }

  createArena() {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "room-floor-machine").setOrigin(0).setTint(0xb9c8e4).setDepth(-10);
    this.walls = this.physics.add.staticGroup();
    this.addWall(480, 76, 848, 32);
    this.addWall(480, 500, 848, 32);
    this.addWall(40, 170, 32, 160);
    this.addWall(40, 410, 32, 160);
    this.addWall(920, 288, 32, 408);
    [[208, 164, 48, 48], [752, 164, 48, 48], [208, 372, 48, 48], [752, 372, 48, 48]].forEach(([x, y, width, height]) => this.addWall(x + width / 2, y + height / 2, width, height));
    this.dangerRing = this.add.circle(480, 290, 214, 0xb94d45, 0.04).setStrokeStyle(2, 0xe17b70, 0.26).setDepth(-1);
    this.safeRing = this.add.circle(480, 290, 178, 0x7b5ca4, 0.04).setStrokeStyle(2, 0xc68bd7, 0.25).setDepth(-1).setVisible(false);
    this.portalLeft = this.add.sprite(178, 290, "portal").setScale(0.62).setTint(0x72b9ca).setAlpha(0.22).setDepth(2);
    this.portalRight = this.add.sprite(782, 290, "portal").setScale(0.62).setTint(0x72b9ca).setAlpha(0.22).setDepth(2);
    playEnvironmentAnimation(this.portalLeft, "portal-idle");
    playEnvironmentAnimation(this.portalRight, "portal-idle");
    this.entryPortal = this.add.sprite(ENTRY_DOOR_POINT[0], ENTRY_DOOR_POINT[1], "portal").setScale(0.58).setTint(0x75b8d0).setAlpha(0.9).setDepth(2);
    playEnvironmentAnimation(this.entryPortal, "portal-idle");
    this.entryDoor = createSideDoor(this, {
      x: ENTRY_DOOR_POINT[0],
      y: ENTRY_DOOR_POINT[1],
      side: "left",
      walls: this.walls,
      machine: true,
      initiallyOpen: true,
    });
    this.add.text(480, 94, "BOSS ROOM · 骨面機械王座", this.hudStyle(12, "#b9a9d4")).setOrigin(0.5).setDepth(2);
  }

  addWall(x, y, width, height) {
    const wall = this.walls.create(x, y, "wall-machine");
    wall.setVisible(false);
    wall.setDisplaySize(width, height).refreshBody();
    wall.wallVisual = this.add.tileSprite(x, y, width, height, "wall-machine").setTint(0x72758d).setDepth(-1);
    return wall;
  }

  createHud() {
    this.hud = createCombatHud(this, {
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
    this.bossBarBack = this.add.rectangle(184, 92, 592, 14, 0x151622, 1).setOrigin(0, 0.5).setDepth(110);
    this.bossBarFill = this.add.rectangle(184, 92, 592, 14, 0xb94d45, 1).setOrigin(0, 0.5).setDepth(111);
    this.bossBarLabel = this.add.text(480, 110, "骨面機械王 · PHASE 1", this.hudStyle(11, "#f5f1da")).setOrigin(0.5).setDepth(111);
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  showHint(message) {
    this.hint = this.add.text(480, GAME_HEIGHT - 24, message, this.hudStyle(10, "#77798a")).setOrigin(0.5).setDepth(110);
    this.time.delayedCall(5200, () => this.hint?.setVisible(false));
  }

  readInput() {
    const moveX = Number(this.keyboard.D.isDown || this.keyboard.RIGHT.isDown) - Number(this.keyboard.A.isDown || this.keyboard.LEFT.isDown);
    const moveY = Number(this.keyboard.S.isDown || this.keyboard.DOWN.isDown) - Number(this.keyboard.W.isDown || this.keyboard.UP.isDown);
    const touchMove = this.touchControls?.enabled ? { x: this.touchControls.moveX, y: this.touchControls.moveY } : { x: 0, y: 0 };
    const actions = this.touchControls?.consumeActions() ?? { attack: false, dodge: false, potion: false, buff: false };
    const buffered = this.keyboardActions || { attack: false, dodge: false, potion: false };
    this.keyboardActions = { attack: false, dodge: false, potion: false };
    return {
      moveX: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.x : moveX,
      moveY: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.y : moveY,
      attack: actions.attack || buffered.attack || Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE),
      dodge: actions.dodge || buffered.dodge || Phaser.Input.Keyboard.JustDown(this.keyboard.SHIFT),
      usePotion: actions.potion || buffered.potion || Phaser.Input.Keyboard.JustDown(this.keyboard.Q),
      buff: actions.buff,
    };
  }

  update(_time, delta) {
    if (window.__dungeonPortraitBlocked) return;
    this.handleGlobalInput();
    if (this.paused) {
      return;
    }
    if (this.battleStatus === "entering") this.updateEntrance(delta);
    else if (this.battleStatus === "intro") this.updateIntro(delta);
    else if (this.battleStatus === "combat") this.updateCombat(delta);
    else this.updateEndInput();
    this.updateHud();
  }

  handleGlobalInput() {
    // Global keyboard actions are bound to keydown events in create().
  }

  togglePause() {
    if (!["entering", "intro", "combat"].includes(this.battleStatus)) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = createPauseOverlay(this, { onResume: () => this.togglePause(), onRestart: () => this.restartRun() });
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    }
  }

  updateEntrance(delta) {
    if (this.player.x < ENTRY_POINT[0]) {
      this.player.updateActor({ moveX: 1, moveY: 0, attack: false, dodge: false }, delta);
      return;
    }

    this.player.body.reset(ENTRY_POINT[0], ENTRY_POINT[1]);
    this.player.facing.set(1, 0);
    this.player.updateActor({ moveX: 0, moveY: 0, attack: false, dodge: false }, delta);
    this.battleStatus = "intro";
    this.introRemaining = 850;
    closeSideDoor(this.entryDoor);
    this.tweens.add({ targets: this.entryPortal, alpha: 0.12, duration: 320 });
    this.introText?.setText("第六房\n骨面機械王座\n\n入口關閉 · 決戰開始");
    this.audio.beep("boss");
  }

  updateIntro(delta) {
    this.introRemaining -= delta;
    if (this.introRemaining <= 0) {
      this.introText?.destroy();
      this.introText = null;
      this.battleStatus = "combat";
      this.audio.beep("boss");
    }
  }

  updateCombat(delta) {
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor(input, delta);
    if (this.player.attackHitWindow) resolveMeleeAttack(this.player, [this.boss, ...this.enemies]);
    this.boss.updateAI(this.player, delta);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, delta));
    updateBleed([this.boss, ...this.enemies], delta);
    this.updateHazards(delta);
    this.updateTelegraphs(delta);
    updateProjectiles(this, this.player, delta);
    [this.player, this.boss, ...this.enemies].forEach((actor) => constrainActorToClosedDoor(actor, this.entryDoor));
    this.updatePhaseBoundary(delta);
    if (this.player.health <= 0) this.openDefeat();
    else if (!this.boss.active) this.openVictory();
  }

  updatePhaseBoundary(delta) {
    if (this.bossPhase < 3) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 480, 290);
    if (distance > 205 && !this.player.isDodging()) {
      this.outsideDamageRemaining = Math.max(0, (this.outsideDamageRemaining || 0) - delta);
      if (this.outsideDamageRemaining === 0) {
        this.outsideDamageRemaining = 700;
        this.player.takeDamage(4);
      }
    } else {
      this.outsideDamageRemaining = 0;
    }
  }

  showBossTelegraph(x, y, kind, duration) {
    const radius = kind === "mine" ? 48 : kind === "charge" ? 96 : kind === "volley" ? 68 : 78;
    const color = kind === "mine" ? 0xe17b70 : kind === "charge" ? 0xdfb84f : kind === "volley" ? 0x8fd1e8 : 0xb94d45;
    const node = this.add.circle(x, y, radius, color, 0.12).setStrokeStyle(3, color, 0.96).setDepth(5);
    this.telegraphs.push({ node, remaining: duration, source: this.boss });
  }

  updateTelegraphs(delta) {
    this.telegraphs = this.telegraphs.filter((telegraph) => {
      telegraph.remaining -= delta;
      if (telegraph.source.active) telegraph.node.setPosition(telegraph.source.x, telegraph.source.y).setAlpha(0.12 + (1 - Math.max(0, telegraph.remaining) / 560) * 0.35);
      if (telegraph.remaining <= 0) {
        telegraph.node.destroy();
        return false;
      }
      return true;
    });
  }

  spawnBossMinion(monsterId = "robot_gunner") {
    const activeMinions = this.enemies.filter((enemy) => enemy.active).length;
    if (activeMinions >= 4) return;
    const angle = this.hazardRng.next() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.boss.x + Math.cos(angle) * 130, 90, GAME_WIDTH - 90);
    const y = Phaser.Math.Clamp(this.boss.y + Math.sin(angle) * 130, 120, GAME_HEIGHT - 80);
    const enemy = new Enemy(this, x, y, MONSTERS[monsterId] || MONSTERS.robot_gunner, `boss-${this.enemies.length}`);
    enemy.spawnProtectionRemaining = 500;
    this.enemyGroup.add(enemy);
    this.physics.add.collider(enemy, this.walls);
    this.physics.add.collider(this.player, enemy, () => enemy.tryContactDamage(this.player));
    this.enemies.push(enemy);
  }

  spawnBossHazard(options = {}) {
    if (this.hazards.length >= 4) return;
    const angle = this.hazardRng.next() * Math.PI * 2;
    const distance = options.ring ? 150 : 80 + this.hazardRng.next() * 150;
    const x = Phaser.Math.Clamp(480 + Math.cos(angle) * distance, 105, GAME_WIDTH - 105);
    const y = Phaser.Math.Clamp(290 + Math.sin(angle) * distance, 130, GAME_HEIGHT - 95);
    const node = this.add.sprite(x, y, "trap", 0).setScale(options.ring ? 3 : 2.7).setAlpha(0.34).setDepth(3);
    this.hazards.push({ x, y, warningMs: 700, activeMs: 900, node, activated: false, damaged: false });
  }

  spawnBossVolley(target, phase) {
    const baseAngle = Math.atan2(target.y - this.boss.y, target.x - this.boss.x);
    getBossVolleyOffsets(phase).forEach((angleOffset) => {
      spawnProjectile(this, this.boss, target, {
        angle: baseAngle + angleOffset,
        damage: 11 + phase * 2,
        speed: 215 + phase * 12,
        texture: "enemy-projectile",
        scale: 1.9,
        radius: 8,
      });
    });
  }

  updateHazards(delta) {
    this.hazards = this.hazards.filter((hazard) => {
      if (hazard.warningMs > 0) {
        hazard.warningMs -= delta;
        const progress = 1 - Math.max(0, hazard.warningMs) / 700;
        hazard.node.setFrame(Math.min(2, Math.floor(progress * 3))).setAlpha(0.34 + progress * 0.34);
        return true;
      }
      if (!hazard.activated) {
        hazard.activated = true;
        playEnvironmentAnimation(hazard.node, "trap-rise");
      }
      if (!hazard.damaged && Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) <= 38) {
        hazard.damaged = true;
        this.player.takeDamage(16);
      }
      hazard.activeMs -= delta;
      if (hazard.activeMs <= 0) {
        hazard.node.destroy();
        return false;
      }
      return true;
    });
  }

  onBossPhaseChange(phase) {
    this.bossPhase = phase;
    this.bossBarLabel.setText(`骨面機械王 · PHASE ${phase}`);
    this.safeRing.setVisible(phase >= 3);
    this.portalLeft.setAlpha(phase >= 2 ? 0.9 : 0.22);
    this.portalRight.setAlpha(phase >= 2 ? 0.9 : 0.22);
    this.showPhaseText(`魔王進入第 ${phase} 階段`);
    this.audio.beep("boss");
  }

  showPhaseText(message) {
    const text = this.add.text(480, 230, message, this.hudStyle(21, "#dfb84f")).setOrigin(0.5).setDepth(160);
    this.tweens.add({ targets: text, alpha: 0, y: 200, duration: 1000, onComplete: () => text.destroy() });
  }

  showHitEffect(x, y) {
    const effect = this.add.sprite(x, y, "hit-spark", 0).setScale(1.6).setDepth(30);
    effect.once("animationcomplete-hit-spark-burst", () => effect.destroy());
    playEnvironmentAnimation(effect, "hit-spark-burst");
  }

  showDamageNumber(x, y, amount, color = "#f5f1da") {
    const text = this.add.text(x, y, `-${Math.round(amount)}`, this.hudStyle(12, color)).setOrigin(0.5).setDepth(130);
    this.tweens.add({ targets: text, y: y - 30, alpha: 0, duration: 560, onComplete: () => text.destroy() });
  }

  onEnemyDefeated(enemy) {
    this.showHitEffect(enemy.x, enemy.y);
  }

  onBossDefeated() {
    this.enemies.forEach((enemy) => {
      enemy.setActive(false).setVisible(false);
      enemy.body.enable = false;
    });
    this.hazards.forEach((hazard) => hazard.node.destroy());
    this.hazards = [];
    this.audio.beep("victory");
  }

  onPlayerDamaged(amount) {
    this.audio.beep("damage");
    this.showDamageNumber(this.player.x, this.player.y - 26, amount, "#e17b70");
  }

  updateHud(status = null) {
    const ratio = Phaser.Math.Clamp(this.boss.health / this.boss.maxHealth, 0, 1);
    this.bossBarFill.setDisplaySize(Math.max(1, 592 * ratio), 14);
    updateCombatHud(this.hud, this.player, {
      status: status || this.statusMessage || `魔王階段 ${this.boss.phase}`,
    });
  }

  showStatus(message) {
    this.statusMessage = message;
    this.time.delayedCall(1500, () => {
      if (this.statusMessage === message) this.statusMessage = null;
    });
  }

  openVictory() {
    if (this.battleStatus !== "combat") return;
    this.battleStatus = "victory";
    this.player.setVelocity(0, 0);
    this.player.trophy = true;
    this.runStats.roomsCleared = 6;
    this.runStats.damageTaken += 0;
    this.runStats.buffs = [...this.player.buffs];
    this.runStats.gold = this.player.gold || 0;
    this.runStats.trophy = true;
    this.touchControls?.destroy();
    clearProjectiles(this);
    const seconds = getRunDurationSeconds(this.runStats);
    const summary = `完成房間：6/6\n遊玩時間：${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}\n受到傷害：${this.runStats.damageTaken}\n取得 Buff：${this.player.buffs.length} 個`;
    this.add.rectangle(480, 280, 720, 410, 0x0b0d16, 0.97).setStrokeStyle(3, 0xdfb84f, 0.95).setDepth(150);
    const victoryAltar = this.add.sprite(480, 140, "reward-console").setScale(1.35).setTint(0xdfb84f).setDepth(151);
    playEnvironmentAnimation(victoryAltar, "reward-console-idle");
    this.add.text(480, 72, "VICTORY", { color: "#dfb84f", fontFamily: "monospace", fontSize: "36px", fontStyle: "bold" }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 224, "第一地層已通關\n骨面核心已取得", { color: "#f5f1da", fontFamily: "monospace", fontSize: "16px", align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 300, summary, { color: "#aaa8b5", fontFamily: "monospace", fontSize: "11px", align: "center", lineSpacing: 6 }).setOrigin(0.5).setDepth(151);
    this.makeEndButton("重新開始 · Enter／R", 480, 430, () => this.restartRun());
  }

  openDefeat() {
    if (this.battleStatus !== "combat") return;
    this.battleStatus = "defeat";
    this.player.setVelocity(0, 0);
    this.touchControls?.destroy();
    clearProjectiles(this);
    this.audio.beep("defeat");
    const seconds = getRunDurationSeconds(this.runStats);
    const summary = `完成房間：5/6\n遊玩時間：${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}\n受到傷害：${this.runStats.damageTaken}`;
    this.add.rectangle(480, 280, 700, 360, 0x0b0d16, 0.97).setStrokeStyle(3, 0xb94d45, 0.95).setDepth(150);
    this.add.text(480, 155, "YOU DIED", { color: "#e17b70", fontFamily: "monospace", fontSize: "32px", fontStyle: "bold" }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 250, summary, { color: "#f5f1da", fontFamily: "monospace", fontSize: "13px", align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(151);
    this.makeEndButton("重新開始 · Enter／R", 480, 425, () => this.restartRun());
  }

  makeEndButton(label, x, y, action) {
    this.endButton = makeTouchOnlyButton(this, x, y, 220, 44, label, action, {
      color: 0x4c303d,
      strokeColor: 0xe17b70,
      depth: 152,
    });
  }

  updateEndInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.R)) this.restartRun();
  }

  restartRun() {
    const seed = makeRunSeed();
    this.scene.start("Room", { runSeed: seed, roomIndex: 0, build: { buffs: [], health: 100 }, runStats: createRunStats(seed) });
  }

  shutdown() {
    if (this.keyHandlers) {
      this.input.keyboard.off("keydown-ESC", this.keyHandlers.pause);
      this.input.keyboard.off("keydown-P", this.keyHandlers.pause);
      this.input.keyboard.off("keydown-M", this.keyHandlers.sound);
      this.input.keyboard.off("keydown-B", this.keyHandlers.buffs);
      this.input.keyboard.off("keydown-SPACE", this.keyHandlers.attack);
      this.input.keyboard.off("keydown-SHIFT", this.keyHandlers.dodge);
      this.input.keyboard.off("keydown-Q", this.keyHandlers.potion);
    }
    unbindPauseKeyboard(this, this.pauseKeyHandlers);
    this.touchControls?.destroy();
    clearProjectiles(this);
    this.telegraphs.forEach((telegraph) => telegraph.node.destroy());
    this.hazards.forEach((hazard) => hazard.node.destroy());
  }
}
