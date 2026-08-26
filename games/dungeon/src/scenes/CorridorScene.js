import Phaser from "phaser";
import { MONSTERS } from "../data/monsters.js";
import { Enemy } from "../entities/Enemy.js";
import { Player } from "../entities/Player.js";
import { getDungeonAudio } from "../systems/audio-system.js";
import { playEnvironmentAnimation } from "../systems/actor-animations.js";
import { closeSideDoor, constrainActorToClosedDoor, openSideDoor } from "../systems/door-system.js";
import { resolveMeleeAttack, updateBleed } from "../systems/combat-system.js";
import { clearProjectiles, updateProjectiles } from "../systems/projectile-system.js";
import { generateFloorMap } from "../systems/room-generator.js";
import { hasReachedCorridorExit } from "../systems/corridor-transition.js";
import { canClaimCorridorChest, claimCorridorChest, getCorridorTrapPhase } from "../systems/corridor-events.js";
import { isCorridorAmbushCleared, shouldTriggerCorridorAmbush } from "../systems/corridor-ambush.js";
import { applyPlayerBuild, capturePlayerBuild, normalizeRunBuild } from "../systems/player-build.js";
import { cloneRunStats, createRunStats } from "../systems/run-state.js";
import { TouchControls } from "../systems/touch-controls.js";
import { makeRunSeed } from "../systems/rng.js";
import { createCombatHud, createPauseOverlay, toggleBuffPanel, updateCombatHud, updateSoundIcon } from "../ui/hud.js";
import { disableMouseInput } from "../ui/input.js";
import { bindPauseKeyboard, createPauseKeyboardHandlers, unbindPauseKeyboard } from "../ui/pause-keyboard.js";
import { buildCorridorWorld } from "../world/corridor-world.js";
import { getSideVector } from "../data/rooms.js";
import { resolveBottleHits, updateBottlePickups } from "../systems/destructible-system.js";
import { resetTrapVictims, resolveActiveTrapHits } from "../systems/trap-damage.js";

export class CorridorScene extends Phaser.Scene {
  constructor() {
    super("Corridor");
  }

  init(data = {}) {
    this.runSeed = data.runSeed ?? makeRunSeed();
    this.corridorIndex = data.corridorIndex ?? 0;
    this.build = normalizeRunBuild(data.build);
    this.runStats = cloneRunStats(data.runStats || createRunStats(this.runSeed));
    this.paused = false;
    this.corridorStatus = "active";
    this.bottles = [];
    this.pickups = [];
    this.enemies = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.pendingAmbushSpawns = 0;
  }

  create() {
    disableMouseInput(this);
    this.audio = getDungeonAudio();
    this.floorMap = generateFloorMap(this.runSeed);
    this.currentCorridor = this.floorMap.corridors[this.corridorIndex];
    if (!this.currentCorridor) {
      this.goToNextRoom();
      return;
    }

    this.worldLayout = buildCorridorWorld(this, this.currentCorridor);
    this.bottles = this.worldLayout.bottles;
    this.player = new Player(this, this.worldLayout.spawn[0], this.worldLayout.spawn[1], {
      level: Math.min(3, Math.floor(this.corridorIndex / 2) + 1),
    });
    this.enemyGroup = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    const [entryOutX, entryOutY] = getSideVector(this.currentCorridor.entrySide);
    this.player.facing.set(-entryOutX, -entryOutY);
    applyPlayerBuild(this.player, this.build);
    this.physics.add.collider(this.player, this.worldLayout.walls);
    this.createInput();
    this.createHud();
    this.touchControls = new TouchControls(this, {
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
    this.time.delayedCall(220, () => {
      if (this.corridorStatus !== "active") return;
      closeSideDoor(this.worldLayout.entryDoor);
      this.tweens.add({ targets: this.worldLayout.entryPortal, alpha: 0.14, duration: 260 });
      this.audio.beep("telegraph");
    });
  }

  createInput() {
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ENTER,R,ESC,P,M,B,Q");
    this.keyboardActions = { attack: false, dodge: false, potion: false };
    this.keyHandlers = {
      pause: () => this.togglePause(),
      sound: () => {
        this.audio.toggle();
        updateSoundIcon(this.hud, this.audio.enabled);
      },
      buffs: () => {
        if (!this.paused) toggleBuffPanel(this, this.hud, this.player);
      },
      attack: () => {
        if (!this.paused && this.corridorStatus === "active") this.keyboardActions.attack = true;
      },
      dodge: () => {
        if (!this.paused && this.corridorStatus === "active") this.keyboardActions.dodge = true;
      },
      potion: () => {
        if (!this.paused && this.corridorStatus === "active") this.keyboardActions.potion = true;
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
  }

  createHud() {
    this.hud = createCombatHud(this, {
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  readInput() {
    const moveX = Number(this.keyboard.D.isDown || this.keyboard.RIGHT.isDown) - Number(this.keyboard.A.isDown || this.keyboard.LEFT.isDown);
    const moveY = Number(this.keyboard.S.isDown || this.keyboard.DOWN.isDown) - Number(this.keyboard.W.isDown || this.keyboard.UP.isDown);
    const touchMove = this.touchControls?.enabled ? { x: this.touchControls.moveX, y: this.touchControls.moveY } : { x: 0, y: 0 };
    const actions = this.touchControls?.consumeActions() ?? { attack: false, dodge: false, potion: false, buff: false };
    const buffered = this.keyboardActions || { dodge: false, potion: false };
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
    if (window.__dungeonPortraitBlocked || !this.player) return;
    if (this.paused) {
      return;
    }
    if (this.corridorStatus === "defeat") {
      if (Phaser.Input.Keyboard.JustDown(this.keyboard.ENTER) || Phaser.Input.Keyboard.JustDown(this.keyboard.R)) this.restartRun();
      return;
    }
    if (this.corridorStatus !== "active") return;
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor({ moveX: input.moveX, moveY: input.moveY, attack: input.attack, dodge: input.dodge }, delta);
    if (this.player.attackHitWindow) resolveMeleeAttack(this.player, this.enemies);
    resolveBottleHits(this.player, this.bottles);
    updateBottlePickups(this, this.player);
    this.enemies.forEach((enemy) => enemy.updateAI(this.player, delta));
    updateBleed(this.enemies, delta);
    this.updateTelegraphs(delta);
    updateProjectiles(this, this.player, delta);
    this.updateCorridorEvents();
    this.updateCorridorAmbush();
    constrainActorToClosedDoor(this.player, this.worldLayout.entryDoor);
    constrainActorToClosedDoor(this.player, this.worldLayout.exitDoor);
    this.enemies.forEach((enemy) => {
      constrainActorToClosedDoor(enemy, this.worldLayout.entryDoor);
      constrainActorToClosedDoor(enemy, this.worldLayout.exitDoor);
    });
    if (this.player.health <= 0) this.openDefeat();
    else if (hasReachedCorridorExit(this.player, this.worldLayout.exitTrigger, this.currentCorridor.exitSide)) this.goToNextRoom();
    this.updateHud();
  }

  updateCorridorAmbush() {
    const ambush = this.worldLayout.ambush;
    if (!ambush) return;
    if (shouldTriggerCorridorAmbush(ambush, this.player, this.worldLayout.layout.cellSize)) {
      this.startCorridorAmbush(ambush);
      return;
    }
    if (!isCorridorAmbushCleared(ambush, this.pendingAmbushSpawns, this.enemies)) return;
    ambush.state = "cleared";
    openSideDoor(this.worldLayout.entryDoor);
    openSideDoor(this.worldLayout.exitDoor);
    this.tweens.add({ targets: [this.worldLayout.entryPortal, this.worldLayout.exitPortal], alpha: 0.9, duration: 280 });
    this.audio.beep("reward");
  }

  startCorridorAmbush(ambush) {
    if (ambush.state !== "pending") return;
    ambush.state = "active";
    closeSideDoor(this.worldLayout.entryDoor);
    closeSideDoor(this.worldLayout.exitDoor);
    this.tweens.add({ targets: [this.worldLayout.entryPortal, this.worldLayout.exitPortal], alpha: 0.14, duration: 240 });
    this.pendingAmbushSpawns = ambush.enemyIds.length;
    ambush.enemyIds.forEach((enemyId, index) => {
      const [x, y] = ambush.spawnPoints[index];
      const marker = this.add.sprite(x, y, "spawn-marker", 0).setScale(0.58).setDepth(4);
      playEnvironmentAnimation(marker, "spawn-marker-start");
      this.time.delayedCall(220 + index * 180, () => {
        this.pendingAmbushSpawns = Math.max(0, this.pendingAmbushSpawns - 1);
        marker.destroy();
        if (this.corridorStatus !== "active" || ambush.state !== "active") return;
        const enemy = new Enemy(this, x, y, MONSTERS[enemyId], `corridor-${this.corridorIndex}-${index}`);
        this.attachEnemyPhysics(enemy);
        this.enemies.push(enemy);
      });
    });
    this.audio.beep("wave");
  }

  attachEnemyPhysics(enemy) {
    this.enemyGroup.add(enemy);
    this.physics.add.collider(enemy, this.worldLayout.walls);
    this.physics.add.collider(this.player, enemy, () => enemy.tryContactDamage(this.player));
  }

  togglePause() {
    if (this.corridorStatus !== "active") return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = createPauseOverlay(this, {
        onResume: () => this.togglePause(),
        onRestart: () => this.restartRun(),
      });
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    }
    this.audio.beep("ui");
  }

  updateHud() {
    updateCombatHud(this.hud, this.player);
  }

  updateCorridorEvents() {
    this.worldLayout.traps.forEach((trap) => {
      const phase = getCorridorTrapPhase(this.time.now, trap.phaseOffset);
      if (phase !== trap.phase) {
        if (phase === "active") playEnvironmentAnimation(trap.node, "trap-rise");
        if (phase === "idle") trap.node.stop().setFrame(0);
        if (phase === "idle") resetTrapVictims(trap);
        trap.phase = phase;
      }
      if (phase === "warning") trap.node.stop().setFrame(2).setAlpha(0.68);
      else trap.node.setAlpha(phase === "active" ? 1 : 0.28);
      trap.active = phase === "active";
      const hits = resolveActiveTrapHits(trap, [
        { actor: this.player, damage: 10, kind: "player" },
        ...this.enemies.map((enemy) => ({ actor: enemy, damage: 16, kind: "enemy" })),
      ]);
      if (hits.some(({ kind }) => kind === "player")) this.showStatus("走廊陷阱命中");
    });
    const chest = this.worldLayout.chest;
    if (canClaimCorridorChest(this.player, chest)) {
      const result = claimCorridorChest(this.player, chest);
      if (result.claimed) {
        chest.node.once(`animationcomplete-${chest.animation}`, () => chest.node.active && chest.node.setFrame(3));
        playEnvironmentAnimation(chest.node, chest.animation);
        this.showStatus(result.message);
        this.audio.beep("reward");
      }
    }
  }

  showEnemyTelegraph(enemy, kind, duration) {
    const ranged = ["ranged", "spell", "burst", "laser"].includes(kind);
    const color = kind === "spell" ? 0xffa64d : kind === "laser" ? 0x75e9ff : ranged ? 0x8fd1e8 : 0xe17b70;
    const node = this.add.circle(enemy.x, enemy.y, ranged ? 34 : 42, color, 0.12).setStrokeStyle(2, color, 0.9).setDepth(3);
    this.telegraphs.push({ node, remaining: duration, enemy });
  }

  updateTelegraphs(delta) {
    this.telegraphs = this.telegraphs.filter((telegraph) => {
      telegraph.remaining -= delta;
      if (telegraph.enemy.active) telegraph.node.setPosition(telegraph.enemy.x, telegraph.enemy.y);
      if (telegraph.remaining > 0) return true;
      telegraph.node.destroy();
      return false;
    });
  }

  showDamageNumber(x, y, amount, color) {
    const text = this.add.text(x, y, `-${amount}`, this.hudStyle(12, color)).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: text, y: y - 18, alpha: 0, duration: 420, onComplete: () => text.destroy() });
  }

  showHitEffect(x, y) {
    const effect = this.add.sprite(x, y, "hit-spark", 0).setScale(1.6).setDepth(30);
    effect.once("animationcomplete-hit-spark-burst", () => effect.destroy());
    playEnvironmentAnimation(effect, "hit-spark-burst");
  }

  openDefeat() {
    if (this.corridorStatus !== "active") return;
    this.corridorStatus = "defeat";
    this.player.setVelocity(0, 0);
    clearProjectiles(this);
    this.add.text(480, 270, "戰鬥失敗\n\nEnter／R 重新開始", this.hudStyle(22, "#e17b70")).setOrigin(0.5).setDepth(210);
    this.audio.beep("defeat");
  }

  showStatus(message) {
    this.statusMessage = message;
    this.time.delayedCall(1800, () => {
      if (this.statusMessage === message) this.statusMessage = null;
    });
  }

  async goToNextRoom() {
    if (this.corridorStatus === "loading") return;
    this.corridorStatus = "loading";
    clearProjectiles(this);
    this.player?.setVelocity(0, 0);
    const nextRoomIndex = this.corridorIndex + 1;
    const data = {
      runSeed: this.runSeed,
      roomIndex: nextRoomIndex,
      build: this.player ? capturePlayerBuild(this.player) : this.build,
      runStats: cloneRunStats(this.runStats),
    };
    if (nextRoomIndex >= 5) {
      const { BossScene } = await import("./BossScene.js");
      if (!this.scene.get("Boss")) this.scene.add("Boss", BossScene, false);
      this.scene.start("Boss", data);
      return;
    }
    this.scene.start("Room", data);
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
  }
}
