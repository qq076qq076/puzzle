import Phaser from "phaser";
import { Player } from "../entities/Player.js";
import { getDungeonAudio } from "../systems/audio-system.js";
import { closeSideDoor, constrainActorToClosedDoor } from "../systems/door-system.js";
import { generateFloorMap } from "../systems/room-generator.js";
import { hasReachedCorridorExit } from "../systems/corridor-transition.js";
import { applyPlayerBuild, capturePlayerBuild, normalizeRunBuild } from "../systems/player-build.js";
import { cloneRunStats, createRunStats } from "../systems/run-state.js";
import { TouchControls } from "../systems/touch-controls.js";
import { makeRunSeed } from "../systems/rng.js";
import { createCombatHud, createPauseOverlay, toggleBuffPanel, updateCombatHud } from "../ui/hud.js";
import { disableMouseInput } from "../ui/input.js";
import { bindPauseKeyboard, createPauseKeyboardHandlers, unbindPauseKeyboard } from "../ui/pause-keyboard.js";
import { buildCorridorWorld } from "../world/corridor-world.js";

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
    this.player = new Player(this, this.worldLayout.spawn[0], this.worldLayout.spawn[1]);
    this.player.facing.set(1, 0);
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
    this.showHint("安全走廊 · Shift 閃避 · Q 使用藥水");
  }

  createInput() {
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ENTER,R,ESC,P,M,B,Q");
    this.keyboardActions = { attack: false, dodge: false, potion: false };
    this.keyHandlers = {
      pause: () => this.togglePause(),
      sound: () => {
        this.audio.toggle();
        this.hud?.soundButton.text.setText(this.audio.enabled ? "SOUND" : "MUTE");
      },
      buffs: () => {
        if (!this.paused) toggleBuffPanel(this, this.hud, this.player);
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
    this.input.keyboard.on("keydown-SHIFT", this.keyHandlers.dodge);
    this.input.keyboard.on("keydown-Q", this.keyHandlers.potion);
    bindPauseKeyboard(this, this.pauseKeyHandlers);
  }

  createHud() {
    this.hud = createCombatHud(this, {
      roomLabel: `FLOOR 1 · CORRIDOR ${this.corridorIndex + 1}/5`,
      seed: this.runSeed,
      onPause: () => this.togglePause(),
      onBuff: () => toggleBuffPanel(this, this.hud, this.player),
    });
  }

  hudStyle(fontSize, color) {
    return { color, fontFamily: "monospace", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }

  showHint(message) {
    this.hint = this.add.text(480, 516, message, this.hudStyle(10, "#77798a")).setOrigin(0.5).setDepth(110);
    this.time.delayedCall(4200, () => this.hint?.setVisible(false));
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
      dodge: actions.dodge || buffered.dodge || Phaser.Input.Keyboard.JustDown(this.keyboard.SHIFT),
      usePotion: actions.potion || buffered.potion || Phaser.Input.Keyboard.JustDown(this.keyboard.Q),
      buff: actions.buff,
    };
  }

  update(_time, delta) {
    if (window.__dungeonPortraitBlocked || !this.player) return;
    if (this.paused) {
      this.updateHud("已暫停");
      return;
    }
    if (this.corridorStatus !== "active") return;
    const input = this.readInput();
    if (input.buff) toggleBuffPanel(this, this.hud, this.player);
    if (input.usePotion) this.player.consumePotion();
    this.player.updateActor({ moveX: input.moveX, moveY: input.moveY, attack: false, dodge: input.dodge }, delta);
    constrainActorToClosedDoor(this.player, this.worldLayout.entryDoor);
    if (hasReachedCorridorExit(this.player, this.worldLayout.exitTrigger)) this.goToNextRoom();
    this.updateHud();
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

  updateHud(status = null) {
    updateCombatHud(this.hud, this.player, {
      roomLabel: `FLOOR 1 · CORRIDOR ${this.corridorIndex + 1}/5`,
      seed: this.runSeed,
      status: status || "安全走廊",
    });
  }

  async goToNextRoom() {
    if (this.corridorStatus === "loading") return;
    this.corridorStatus = "loading";
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
      this.input.keyboard.off("keydown-SHIFT", this.keyHandlers.dodge);
      this.input.keyboard.off("keydown-Q", this.keyHandlers.potion);
    }
    unbindPauseKeyboard(this, this.pauseKeyHandlers);
    this.touchControls?.destroy();
  }
}
