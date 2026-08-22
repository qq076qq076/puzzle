import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { MONSTERS } from "../data/monsters.js";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { applyReward, getRewardCategoryLabel, getRewardChoices, getRewardColor, getRewardDefinition } from "../systems/reward-system.js";
import { applyBuff } from "../systems/buff-system.js";
import { clearProjectiles, spawnProjectile, updateProjectiles } from "../systems/projectile-system.js";
import { getDungeonAudio } from "../systems/audio-system.js";
import { cloneRunStats, createRunStats, getRunDurationSeconds } from "../systems/run-state.js";
import { makeRunSeed } from "../systems/rng.js";
import { generateFloor } from "../systems/room-generator.js";
import { hasCrossedExit } from "../systems/room-transition.js";
import { ROOM_CLEAR_REWARD_DELAY_MS, tickRoomClearDelay } from "../systems/room-clear-delay.js";
import { resolveMeleeAttack, updateBleed } from "../systems/combat-system.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { closeSideDoor, constrainActorToClosedDoor, createSideDoor, openSideDoor } from "../systems/door-system.js";
import { TouchControls } from "../systems/touch-controls.js";
import { disableMouseInput, makeTouchOnlyButton } from "../ui/input.js";
import { createCombatHud, createPauseOverlay, toggleBuffPanel, updateCombatHud } from "../ui/hud.js";

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
      gold: data.build?.gold ?? 0,
      consumables: data.build?.consumables ?? 0,
      trophy: Boolean(data.build?.trophy),
    };
    this.runStats = cloneRunStats(data.runStats || createRunStats(this.runSeed));
    this.roomStatus = "entering";
    this.currentWave = -1;
    this.pendingSpawns = 0;
    this.waveTransitionRemaining = 0;
    this.roomClearRemaining = 0;
    this.enemies = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.traps = [];
    this.spawnMarkers = [];
    this.paused = false;
    this.exitOpen = false;
    this.rewardSelectionIndex = 0;
    this.rewardNavigationCooldown = 0;
    this.rewardTouchAxis = 0;
    this.rewardCards = [];
  }

  create() {
    disableMouseInput(this);
    this.audio = getDungeonAudio();
    this.currentRoom = this.floor[this.roomIndex];
    this.createRoom();
    this.player = new Player(this, this.currentRoom.entrySpawn[0], this.currentRoom.entrySpawn[1]);
    this.enemyGroup = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.player.facing.set(1, 0);
    this.applyBuild();
    this.physics.add.collider(this.player, this.walls);
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
        if (this.paused) return;
        if (this.roomStatus === "reward") this.chooseReward(this.rewardSelectionIndex);
        else if (this.roomStatus === "combat") this.keyboardActions.attack = true;
      },
      dodge: () => {
        if (!this.paused && ["combat", "transition"].includes(this.roomStatus)) this.keyboardActions.dodge = true;
      },
      potion: () => {
        if (!this.paused && ["combat", "transition"].includes(this.roomStatus)) this.keyboardActions.potion = true;
      },
      pausePrevious: () => {
        if (!this.paused) return;
        this.pauseOverlay?.moveSelection(-1);
        this.audio.beep("ui");
      },
      pauseNext: () => {
        if (!this.paused) return;
        this.pauseOverlay?.moveSelection(1);
        this.audio.beep("ui");
      },
      pauseConfirm: () => {
        if (!this.paused) return;
        this.keyboardActions.attack = false;
        this.keyboard.SPACE.reset();
        this.pauseOverlay?.activateSelection();
      },
    };
    this.input.keyboard.on("keydown-ESC", this.keyHandlers.pause);
    this.input.keyboard.on("keydown-P", this.keyHandlers.pause);
    this.input.keyboard.on("keydown-M", this.keyHandlers.sound);
    this.input.keyboard.on("keydown-B", this.keyHandlers.buffs);
    this.input.keyboard.on("keydown-SPACE", this.keyHandlers.attack);
    this.input.keyboard.on("keydown-SHIFT", this.keyHandlers.dodge);
    this.input.keyboard.on("keydown-Q", this.keyHandlers.potion);
    this.input.keyboard.on("keydown-UP", this.keyHandlers.pausePrevious);
    this.input.keyboard.on("keydown-W", this.keyHandlers.pausePrevious);
    this.input.keyboard.on("keydown-DOWN", this.keyHandlers.pauseNext);
    this.input.keyboard.on("keydown-S", this.keyHandlers.pauseNext);
    this.input.keyboard.on("keydown-ENTER", this.keyHandlers.pauseConfirm);
    this.input.keyboard.on("keydown-SPACE", this.keyHandlers.pauseConfirm);
    this.createHud();
    this.touchControls = new TouchControls(this, {
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
    this.introRemaining = 0;
    this.introText = this.add
      .text(GAME_WIDTH / 2, 270, `ROOM ${this.currentRoom.roomNumber}/6\n${this.currentRoom.name}\n\n從左側開門走入…`, {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: "20px",
        fontStyle: "bold",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(150);
    this.showHint("WASD／方向鍵移動 · Space 攻擊 · Shift 閃避 · Q 使用藥水");
  }

  applyBuild() {
    this.build.buffs.forEach((buffId) => applyBuff(this.player, buffId));
    this.player.health = Math.min(this.player.maxHealth, this.build.health);
    this.player.gold = this.build.gold;
    this.player.consumables = this.build.consumables;
    this.player.trophy = this.build.trophy;
    this.player.lifestealTriggers = 0;
  }

  createRoom() {
    const machine = this.currentRoom.theme === "machine";
    const floorKey = machine ? "room-floor-machine" : "room-floor-fantasy";
    this.floorVisual = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, floorKey).setOrigin(0).setDepth(-10);
    if (!machine) this.floorVisual.setTileScale(2, 2);
    this.floorVisual.setTint(machine ? 0xb9c8e4 : 0xd3c0c9);
    this.walls = this.physics.add.staticGroup();
    const wallThickness = 32;
    this.addWall(GAME_WIDTH / 2, 76, GAME_WIDTH - 80, wallThickness, machine);
    this.addWall(GAME_WIDTH / 2, GAME_HEIGHT - 28, GAME_WIDTH - 80, wallThickness, machine);
    this.addWall(40, 170, wallThickness, 160, machine);
    this.addWall(40, 410, wallThickness, 160, machine);
    this.addWall(920, 170, wallThickness, 160, machine);
    this.addWall(920, 410, wallThickness, 160, machine);
    this.currentRoom.obstacles.forEach(([x, y, width, height]) => this.addWall(x + width / 2, y + height / 2, width, height, machine));

    this.entryPortal = this.add.sprite(this.currentRoom.entryDoor[0], this.currentRoom.entryDoor[1], "portal").setScale(0.58).setAlpha(0.82).setDepth(2);
    playEnvironmentAnimation(this.entryPortal, "portal-idle");
    this.entryPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);
    this.exitPortal = this.add.sprite(this.currentRoom.exitDoor[0], this.currentRoom.exitDoor[1], "portal").setScale(0.58).setAlpha(0.16).setDepth(2);
    playEnvironmentAnimation(this.exitPortal, "portal-idle");
    this.exitPortal.setTint(machine ? 0x75b8d0 : 0xb593d8);
    this.entryDoor = createSideDoor(this, {
      x: this.currentRoom.entryDoor[0],
      y: this.currentRoom.entryDoor[1],
      side: this.currentRoom.entrySide,
      walls: this.walls,
      machine,
      initiallyOpen: true,
    });
    this.exitDoor = createSideDoor(this, {
      x: this.currentRoom.exitDoor[0],
      y: this.currentRoom.exitDoor[1],
      side: this.currentRoom.exitSide,
      walls: this.walls,
      machine,
      initiallyOpen: false,
    });
    this.createTraps();
    this.currentRoom.machineDecor.forEach(([x, y]) => {
      const portal = this.add.sprite(x, y, "portal").setScale(0.38).setAlpha(0.46).setTint(0x72b9ca).setDepth(1);
      playEnvironmentAnimation(portal, "portal-idle");
    });
    this.add.text(GAME_WIDTH / 2, 94, machine ? "機械污染區" : "古老地城", this.hudStyle(11, machine ? "#8fd1e8" : "#cdb28e")).setOrigin(0.5).setDepth(2);
  }

  addWall(x, y, width, height, machine = false) {
    const texture = machine ? "wall-machine" : "wall-fantasy";
    const wall = this.walls.create(x, y, texture);
    wall.setVisible(false);
    wall.setDisplaySize(width, height).refreshBody();
    wall.wallVisual = this.add.tileSprite(x, y, width, height, texture).setDepth(-1);
    if (!machine) wall.wallVisual.setTileScale(2, 2);
    else wall.wallVisual.setTint(0x72758d);
    return wall;
  }

  createTraps() {
    this.traps = this.currentRoom.trapPoints.map((point, index) => {
      const node = this.add.sprite(point[0], point[1], "trap", 0).setScale(2.3).setAlpha(0.34).setDepth(1);
      return {
        x: point[0],
        y: point[1],
        node,
        phase: index * 440,
        active: false,
        wasActive: false,
        damaged: false,
      };
    });
  }

  createHud() {
    this.hud = createCombatHud(this, {
      roomLabel: `FLOOR 1 · ROOM ${this.currentRoom.roomNumber}/6`,
      seed: this.runSeed,
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  showHint(message) {
    this.hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 24, message, this.hudStyle(10, "#77798a")).setOrigin(0.5).setDepth(110);
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
      this.updateHud("已暫停");
      return;
    }
    if (this.roomStatus === "entering") this.updateEntrance(delta);
    else if (this.roomStatus === "room_intro") this.updateRoomIntro(delta);
    else if (this.roomStatus === "combat") this.updateCombat(delta);
    else if (this.roomStatus === "cleared") this.updateRoomCleared(delta);
    else if (this.roomStatus === "reward") this.updateRewardInput(delta);
    else if (this.roomStatus === "transition") this.updateTransitionInput(delta);
    else if (this.roomStatus === "defeat") this.updateDefeatInput();
    this.updateHud();
  }

  handleGlobalInput() {
    // Global keyboard actions are bound to keydown events in create(). The
    // update loop remains responsible for combat input and pause freezing.
  }

  togglePause() {
    if (["defeat", "loading", "victory"].includes(this.roomStatus)) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = createPauseOverlay(this, {
        onResume: () => this.togglePause(),
        onRestart: () => this.restartRun(),
      });
      this.audio.beep("ui");
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
      this.audio.beep("ui");
    }
  }

  updateEntrance(delta) {
    const [targetX, targetY] = this.currentRoom.entry;
    if (this.player.x < targetX) {
      this.player.updateActor({ moveX: 1, moveY: 0, attack: false, dodge: false }, delta);
      return;
    }

    this.player.body.reset(targetX, targetY);
    this.player.facing.set(1, 0);
    this.player.updateActor({ moveX: 0, moveY: 0, attack: false, dodge: false }, delta);
    this.roomStatus = "room_intro";
    this.introRemaining = 700;
    closeSideDoor(this.entryDoor);
    this.tweens.add({ targets: this.entryPortal, alpha: 0.12, duration: 320 });
    this.introText?.setText(`ROOM ${this.currentRoom.roomNumber}/6\n${this.currentRoom.name}\n\n入口關閉 · 房間封鎖`);
    this.audio.beep("telegraph");
  }

  updateRoomIntro(delta) {
    this.introRemaining -= delta;
    if (this.introRemaining <= 0) {
      this.introText?.destroy();
      this.introText = null;
      this.startCombat();
    }
  }

  startCombat() {
    if (this.roomStatus !== "room_intro") return;
    this.roomStatus = "combat";
    this.audio.beep("telegraph");
    this.showStatus("房間封鎖 · 敵人接近");
    this.time.delayedCall(320, () => this.startNextWave());
  }

  startNextWave() {
    if (this.roomStatus !== "combat") return;
    this.currentWave += 1;
    const wave = this.currentRoom.waves[this.currentWave];
    if (!wave) {
      this.beginRoomClear();
      return;
    }
    this.waveTransitionRemaining = 0;
    this.pendingSpawns = wave.enemies.length;
    this.audio.beep("wave");
    wave.enemies.forEach((plan, sequence) => {
      const point = this.currentRoom.spawnPoints[plan.spawnIndex % this.currentRoom.spawnPoints.length];
      const marker = this.add.sprite(point[0], point[1], "spawn-marker", 0).setScale(0.58).setDepth(4);
      playEnvironmentAnimation(marker, "spawn-marker-start");
      this.spawnMarkers.push(marker);
      this.time.delayedCall(plan.delayMs, () => {
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
        marker.destroy();
        if (this.roomStatus !== "combat" || !this.player.active) return;
        const definition = MONSTERS[plan.id];
        const enemy = new Enemy(this, point[0], point[1], definition, `${this.currentWave}-${sequence}`);
        this.attachEnemyPhysics(enemy);
        this.enemies.push(enemy);
      });
    });
  }

  attachEnemyPhysics(enemy) {
    this.enemyGroup.add(enemy);
    this.physics.add.collider(enemy, this.walls);
    this.physics.add.collider(this.player, enemy, () => enemy.tryContactDamage(this.player));
  }

  updateCombat(delta) {
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor(input, delta);
    if (this.player.attackHitWindow) resolveMeleeAttack(this.player, this.enemies);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, delta));
    updateBleed(this.enemies, delta);
    this.updateTraps(delta);
    this.updateTelegraphs(delta);
    updateProjectiles(this, this.player, delta);
    this.constrainActorsToDoors();
    if (this.player.health <= 0) {
      this.openDefeat();
      return;
    }
    const waveCleared = this.pendingSpawns === 0 && this.enemies.every((enemy) => !enemy.active);
    if (!waveCleared) return;
    if (this.waveTransitionRemaining > 0) {
      this.waveTransitionRemaining -= delta;
      if (this.waveTransitionRemaining <= 0) this.startNextWave();
    } else if (this.currentWave < this.currentRoom.waves.length - 1) {
      this.waveTransitionRemaining = 800;
      this.showStatus(`第 ${this.currentWave + 1} 波已清除 · 下一波準備中`);
    } else {
      this.beginRoomClear();
    }
  }

  beginRoomClear() {
    if (this.roomStatus !== "combat") return;
    this.roomStatus = "cleared";
    this.roomClearRemaining = ROOM_CLEAR_REWARD_DELAY_MS;
    this.openExitDoor();
    clearProjectiles(this);
    this.telegraphs.forEach((telegraph) => telegraph.node.destroy());
    this.telegraphs = [];
    this.traps.forEach((trap) => {
      trap.active = false;
      trap.wasActive = false;
      trap.damaged = false;
      trap.node.stop().setFrame(0).setAlpha(0.16);
    });
    this.showStatus("房間清除 · 獎勵準備中");
    this.audio.beep("reward");
  }

  updateRoomCleared(delta) {
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor({ moveX: input.moveX, moveY: input.moveY, attack: false, dodge: input.dodge }, delta);
    constrainActorToClosedDoor(this.player, this.entryDoor);
    const delay = tickRoomClearDelay(this.roomClearRemaining, delta);
    this.roomClearRemaining = delay.remaining;
    if (delay.ready) this.openReward();
  }

  updateTraps(delta) {
    const time = this.time.now;
    this.traps.forEach((trap) => {
      const cycle = (time + trap.phase) % 2500;
      const warning = cycle >= 1300 && cycle < 1800;
      trap.active = cycle >= 1800 && cycle < 2280;
      trap.damaged = cycle < 1800 ? false : trap.damaged;
      if (trap.active && !trap.wasActive) playEnvironmentAnimation(trap.node, "trap-rise");
      if (!trap.active && warning) trap.node.stop().setFrame(2);
      if (!trap.active && !warning) trap.node.stop().setFrame(0);
      trap.node.setAlpha(trap.active ? 1 : warning ? 0.68 : 0.34);
      trap.wasActive = trap.active;
      if (trap.active && !trap.damaged && Phaser.Math.Distance.Between(trap.x, trap.y, this.player.x, this.player.y) <= 28) {
        trap.damaged = true;
        this.player.takeDamage(12);
        this.showStatus("陷阱命中");
      }
    });
    void delta;
  }

  showEnemyTelegraph(enemy, kind, duration) {
    const color = kind === "ranged" ? 0x8fd1e8 : kind === "pounce" || kind === "dash" ? 0xe17b70 : 0xdfb84f;
    const radius = kind === "ranged" ? 34 : 42;
    const node = this.add.circle(enemy.x, enemy.y, radius, color, 0.12).setStrokeStyle(2, color, 0.9).setDepth(3);
    this.telegraphs.push({ node, remaining: duration, enemy });
  }

  updateTelegraphs(delta) {
    this.telegraphs = this.telegraphs.filter((telegraph) => {
      telegraph.remaining -= delta;
      if (telegraph.enemy.active) telegraph.node.setPosition(telegraph.enemy.x, telegraph.enemy.y).setAlpha(0.12 + (1 - Math.max(0, telegraph.remaining) / 520) * 0.32);
      if (telegraph.remaining <= 0) {
        telegraph.node.destroy();
        return false;
      }
      return true;
    });
  }

  spawnEnemyProjectile(enemy, target, damage) {
    spawnProjectile(this, enemy, target, { damage, speed: 220 });
  }

  showHitEffect(x, y) {
    const effect = this.add.sprite(x, y, "hit-spark", 0).setScale(1.6).setDepth(30);
    effect.once("animationcomplete-hit-spark-burst", () => effect.destroy());
    playEnvironmentAnimation(effect, "hit-spark-burst");
  }

  showDamageNumber(x, y, amount, color = "#f5f1da") {
    const text = this.add.text(x, y, `-${Math.round(amount)}`, this.hudStyle(12, color)).setOrigin(0.5).setDepth(130);
    this.tweens.add({ targets: text, y: y - 28, alpha: 0, duration: 520, onComplete: () => text.destroy() });
  }

  onEnemyDefeated(enemy) {
    this.showHitEffect(enemy.x, enemy.y);
  }

  onPlayerDamaged(amount) {
    this.audio.beep("damage");
    this.showDamageNumber(this.player.x, this.player.y - 26, amount, "#e17b70");
  }

  updateRewardInput(delta) {
    this.rewardNavigationCooldown = Math.max(0, this.rewardNavigationCooldown - delta);
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.LEFT) || Phaser.Input.Keyboard.JustDown(this.keyboard.A)) this.moveRewardSelection(-1);
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.RIGHT) || Phaser.Input.Keyboard.JustDown(this.keyboard.D)) this.moveRewardSelection(1);

    const touchAxis = this.touchControls?.enabled ? this.touchControls.moveX : 0;
    if (Math.abs(touchAxis) < 0.25) this.rewardTouchAxis = 0;
    if (this.rewardNavigationCooldown <= 0 && Math.abs(touchAxis) >= 0.6) {
      const direction = touchAxis > 0 ? 1 : -1;
      if (this.rewardTouchAxis !== direction) {
        this.moveRewardSelection(direction);
        this.rewardTouchAxis = direction;
      }
    }

    const actions = this.touchControls?.consumeActions() ?? { attack: false, dodge: false, potion: false, buff: false };
    if (actions.attack || Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE)) this.chooseReward(this.rewardSelectionIndex);
  }

  moveRewardSelection(direction) {
    if (this.roomStatus !== "reward" || !this.rewardIds?.length) return;
    this.rewardSelectionIndex = (this.rewardSelectionIndex + direction + this.rewardIds.length) % this.rewardIds.length;
    this.rewardNavigationCooldown = 220;
    this.updateRewardSelection();
    this.audio.beep("ui");
  }

  openReward() {
    if (this.roomStatus !== "cleared") return;
    this.openExitDoor();
    this.roomStatus = "reward";
    this.player.setVelocity(0, 0);
    this.traps.forEach((trap) => trap.node.setAlpha(0.16));
    this.rewardIds = getRewardChoices(this.player, this.currentRoom.rewardIds);
    this.rewardSelectionIndex = 0;
    this.rewardNavigationCooldown = 0;
    this.rewardTouchAxis = 0;
    this.rewardCards = [];
    this.rewardGroup = this.add.container(0, 0).setDepth(180);
    this.rewardGroup.add(this.add.rectangle(480, 282, 820, 385, 0x0b0d16, 0.97).setStrokeStyle(3, this.currentRoom.theme === "machine" ? 0x8fd1e8 : 0xdfb84f, 0.95));
    const rewardVisual = this.add.sprite(480, 138, this.currentRoom.theme === "machine" ? "reward-console" : "reward-chest");
    rewardVisual.setScale(this.currentRoom.theme === "machine" ? 1.25 : 3.5);
    if (this.currentRoom.theme === "machine") playEnvironmentAnimation(rewardVisual, "reward-console-idle");
    this.rewardGroup.add(rewardVisual);
    this.rewardGroup.add(this.add.text(480, 84, "選擇獎勵", this.hudStyle(26, "#f5f1da")).setOrigin(0.5));
    this.rewardGroup.add(this.add.text(480, 112, "←／→ 選擇獎勵 · Space／攻擊確認", this.hudStyle(12, "#aaa8b5")).setOrigin(0.5));
    this.rewardIds.slice(0, 3).forEach((rewardId, index) => this.createRewardCard(rewardId, index));
    this.updateRewardSelection();
    this.audio.beep("reward");
  }

  createRewardCard(rewardId, index) {
    const reward = getRewardDefinition(rewardId);
    if (!reward) return;
    const x = 250 + index * 230;
    const card = this.add.rectangle(x, 300, 200, 164, 0x202439, 1).setStrokeStyle(2, getRewardColor(rewardId), 1);
    const text = this.add.text(x, 300, `${getRewardCategoryLabel(rewardId)}\n\n${reward.name}\n${reward.rarity}\n${reward.description}`, {
      color: "#f5f1da",
      fontFamily: "monospace",
      fontSize: "11px",
      align: "center",
      wordWrap: { width: 172 },
      lineSpacing: 4,
    }).setOrigin(0.5);
    this.rewardCards.push({ card, text, rewardId });
    this.rewardGroup.add([card, text]);
  }

  updateRewardSelection() {
    this.rewardCards.forEach(({ card, rewardId }, index) => {
      const selected = index === this.rewardSelectionIndex;
      card.setFillStyle(selected ? 0x303550 : 0x202439, 1);
      card.setStrokeStyle(selected ? 4 : 2, selected ? 0xf5f1da : getRewardColor(rewardId), 1);
    });
  }

  chooseReward(index) {
    if (this.roomStatus !== "reward" || !this.rewardIds[index]) return;
    const rewardId = this.rewardIds[index];
    const result = applyReward(this.player, rewardId);
    if (!result.applied) return;
    this.runStats.buffs = [...this.player.buffs];
    this.runStats.gold = this.player.gold || 0;
    this.runStats.roomsCleared = Math.max(this.runStats.roomsCleared, this.roomIndex + 1);
    this.runStats.trophy = Boolean(this.player.trophy);
    const feedback = result.type === "potion"
      ? `${getRewardDefinition(rewardId).name} · 已放入消耗品欄`
      : `${getRewardDefinition(rewardId).name} · ${result.converted ? "已轉換為金幣" : "已生效"}`;
    this.showRewardToast(feedback);
    this.rewardGroup?.destroy(true);
    this.rewardGroup = null;
    this.roomStatus = "transition";
  }

  updateTransitionInput(delta) {
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor({ moveX: input.moveX, moveY: input.moveY, attack: false, dodge: input.dodge }, delta);
    constrainActorToClosedDoor(this.player, this.entryDoor);
    if (hasCrossedExit(this.player, this.currentRoom)) this.goToNextRoom();
  }

  constrainActorsToDoors() {
    [this.player, ...this.enemies].forEach((actor) => {
      constrainActorToClosedDoor(actor, this.entryDoor);
      constrainActorToClosedDoor(actor, this.exitDoor);
    });
  }

  async goToNextRoom() {
    if (this.roomStatus !== "transition") return;
    this.roomStatus = "loading";
    if (this.roomIndex >= 4) {
      const { BossScene } = await import("./BossScene.js");
      if (!this.scene.get("Boss")) this.scene.add("Boss", BossScene, false);
      this.scene.start("Boss", {
        runSeed: this.runSeed,
        build: this.buildForNextRoom(),
        runStats: cloneRunStats(this.runStats),
      });
      return;
    }
    this.scene.restart({ runSeed: this.runSeed, roomIndex: this.roomIndex + 1, build: this.buildForNextRoom(), runStats: cloneRunStats(this.runStats) });
  }

  buildForNextRoom() {
    return {
      buffs: [...this.player.buffs],
      health: this.player.health,
      gold: this.player.gold,
      consumables: this.player.consumables,
      trophy: this.player.trophy,
    };
  }

  updateHud(status = null) {
    const waveLabel = this.roomStatus === "combat" ? `第 ${Math.max(1, this.currentWave + 1)}/${this.currentRoom.waves.length} 波` : null;
    const clearLabel = this.roomStatus === "cleared" ? "房間清除 · 獎勵準備中" : null;
    const passageOpen = this.roomStatus === "transition" || this.roomStatus === "loading";
    this.hud.status.setVisible(!passageOpen);
    updateCombatHud(this.hud, this.player, {
      roomLabel: `FLOOR 1 · ROOM ${this.currentRoom.roomNumber}/6`,
      seed: this.runSeed,
      status: passageOpen ? null : status || this.statusMessage || clearLabel || waveLabel || this.roomStatus,
    });
  }

  showStatus(message) {
    this.statusMessage = message;
    this.time.delayedCall(1500, () => {
      if (this.statusMessage === message) this.statusMessage = null;
    });
  }

  showRewardToast(message) {
    const toast = this.add.text(480, 430, message, this.hudStyle(13, "#f5f1da")).setOrigin(0.5).setDepth(190);
    this.tweens.add({ targets: toast, y: 410, alpha: 0, delay: 650, duration: 520, onComplete: () => toast.destroy() });
  }

  openExitDoor() {
    if (this.exitOpen) return;
    this.exitOpen = true;
    openSideDoor(this.exitDoor);
    this.tweens.add({ targets: this.exitPortal, alpha: 1, scale: 0.68, duration: 320, yoyo: true, repeat: -1 });
  }

  updateDefeatInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.R)) this.restartRun();
  }

  openDefeat() {
    if (this.roomStatus === "defeat") return;
    this.roomStatus = "defeat";
    this.player.setVelocity(0, 0);
    this.touchControls?.destroy();
    clearProjectiles(this);
    this.audio.beep("defeat");
    const seconds = getRunDurationSeconds(this.runStats);
    const summary = `已清除房間：${this.runStats.roomsCleared}/5\n遊玩時間：${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}\n受到傷害：${this.runStats.damageTaken}\nSeed：${this.runSeed}`;
    this.add.rectangle(480, 280, 700, 360, 0x0b0d16, 0.97).setStrokeStyle(3, 0xb94d45, 0.95).setDepth(150);
    this.add.text(480, 160, "YOU DIED", { color: "#e17b70", fontFamily: "monospace", fontSize: "32px", fontStyle: "bold" }).setOrigin(0.5).setDepth(151);
    this.add.text(480, 250, summary, { color: "#f5f1da", fontFamily: "monospace", fontSize: "13px", align: "center", lineSpacing: 8 }).setOrigin(0.5).setDepth(151);
    this.makeEndButton("重新開始 · Enter／R", 400, 425, () => this.restartRun());
  }

  makeEndButton(label, x, y, action) {
    this.endButton?.destroy();
    this.endButton = makeTouchOnlyButton(this, x, y, 220, 44, label, action, {
      color: 0x4c303d,
      strokeColor: 0xe17b70,
      depth: 152,
    });
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
      this.input.keyboard.off("keydown-UP", this.keyHandlers.pausePrevious);
      this.input.keyboard.off("keydown-W", this.keyHandlers.pausePrevious);
      this.input.keyboard.off("keydown-DOWN", this.keyHandlers.pauseNext);
      this.input.keyboard.off("keydown-S", this.keyHandlers.pauseNext);
      this.input.keyboard.off("keydown-ENTER", this.keyHandlers.pauseConfirm);
      this.input.keyboard.off("keydown-SPACE", this.keyHandlers.pauseConfirm);
    }
    this.touchControls?.destroy();
    clearProjectiles(this);
    this.telegraphs.forEach((telegraph) => telegraph.node.destroy());
    this.spawnMarkers.forEach((marker) => marker.destroy());
  }
}
