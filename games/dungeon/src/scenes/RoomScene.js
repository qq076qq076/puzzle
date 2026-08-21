import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config.js";
import { Player } from "../entities/Player.js";
import { createPrototypeTextures, createSlashTexture } from "../systems/texture-factory.js";
import { TouchControls } from "../systems/touch-controls.js";

export class RoomScene extends Phaser.Scene {
  constructor() {
    super("Room");
  }

  create() {
    this.cameras.main.setBackgroundColor("#11131d");
    createPrototypeTextures(this);
    createSlashTexture(this);
    this.createRoom();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.physics.add.collider(this.player, this.walls);
    this.keyboard = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT");
    this.touchControls = new TouchControls(this);
    this.createHud();
    this.showHint("SPACE 攻擊 · SHIFT 閃避 · WASD／方向鍵移動");
  }

  createRoom() {
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "room-floor-prototype")
      .setOrigin(0)
      .setDepth(-10);
    const walls = this.physics.add.staticGroup();
    this.walls = walls;
    const wallThickness = 32;
    [
      [GAME_WIDTH / 2, wallThickness / 2, GAME_WIDTH, wallThickness],
      [GAME_WIDTH / 2, GAME_HEIGHT - wallThickness / 2, GAME_WIDTH, wallThickness],
      [wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
      [GAME_WIDTH - wallThickness / 2, GAME_HEIGHT / 2, wallThickness, GAME_HEIGHT],
    ].forEach(([x, y, width, height]) => {
      const wall = walls.create(x, y, "room-wall-prototype");
      wall.setDisplaySize(width, height).refreshBody();
      wall.setDepth(-1);
    });
    const pillarPositions = [
      [260, 190], [700, 190], [260, 350], [700, 350],
    ];
    pillarPositions.forEach(([x, y]) => {
      const pillar = walls.create(x, y, "room-wall-prototype");
      pillar.setDisplaySize(38, 38).refreshBody();
      pillar.setDepth(-1);
    });
  }

  createHud() {
    this.hud = {
      room: this.add.text(24, 20, "FLOOR 1 · ROOM 1/6", this.hudStyle(14, "#dfb84f")).setScrollFactor(0).setDepth(110),
      health: this.add.text(24, 48, "HP 100/100", this.hudStyle(14, "#f5f1da")).setScrollFactor(0).setDepth(110),
      controls: this.add.text(24, GAME_HEIGHT - 30, "PROTOTYPE · NO MOUSE INPUT", this.hudStyle(11, "#77798a")).setScrollFactor(0).setDepth(110),
      dodge: this.add.text(GAME_WIDTH - 24, 22, "DODGE READY", this.hudStyle(11, "#82a8d8")).setOrigin(1, 0).setScrollFactor(0).setDepth(110),
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
    const touchMove = this.touchControls?.enabled
      ? { x: this.touchControls.moveX, y: this.touchControls.moveY }
      : { x: 0, y: 0 };
    const actions = this.touchControls?.consumeActions() ?? { attack: false, dodge: false };
    const keyboardActions = {
      attack: Phaser.Input.Keyboard.JustDown(this.keyboard.SPACE),
      dodge: Phaser.Input.Keyboard.JustDown(this.keyboard.SHIFT),
    };
    const keyboardHasMovement = moveX !== 0 || moveY !== 0;
    return {
      moveX: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.x : moveX,
      moveY: this.touchControls?.enabled && Math.hypot(touchMove.x, touchMove.y) > 0.08 ? touchMove.y : moveY,
      attack: actions.attack || keyboardActions.attack,
      dodge: actions.dodge || keyboardActions.dodge,
      keyboardHasMovement,
    };
  }

  update(_time, delta) {
    if (!this.player || !this.player.active) return;
    const input = this.readInput();
    this.player.updateActor(input, delta);
    this.hud.health.setText(`HP ${this.player.health}/${this.player.maxHealth}`);
    const dodgeReady = this.player.dodgeCooldownRemaining <= 0;
    this.hud.dodge.setText(dodgeReady ? "DODGE READY" : `DODGE ${(this.player.dodgeCooldownRemaining / 1000).toFixed(1)}s`);
    this.hud.dodge.setColor(dodgeReady ? "#82a8d8" : "#77798a");
  }

  shutdown() {
    this.touchControls?.destroy();
  }
}
