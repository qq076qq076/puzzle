import Phaser from "phaser";
import { getDungeonAudio } from "../systems/audio-system.js";
import { makeRunSeed } from "../systems/rng.js";
import { createRunStats, loadLastSeed, saveLastSeed } from "../systems/run-state.js";
import { disableMouseInput, makeTouchOnlyButton } from "../ui/input.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    disableMouseInput(this);
    this.audio = getDungeonAudio();
    this.cameras.main.setBackgroundColor("#090b13");
    this.runSeed = loadLastSeed() || makeRunSeed();
    this.keyboard = this.input.keyboard.addKeys("ENTER,N,M");
    this.createBackdrop();
    this.createMenuText();
    this.startButton = makeTouchOnlyButton(this, 480, 358, 280, 56, "開始第一地層", () => this.startRun(), {
      color: 0x343b58,
      strokeColor: 0xdfb84f,
      fontSize: "15px",
    });
    this.soundButton = makeTouchOnlyButton(this, 480, 432, 190, 38, this.soundLabel(), () => this.toggleSound(), {
      color: 0x20283b,
      strokeColor: 0x69718d,
      fontSize: "11px",
    });
    this.showHint("Enter／N 開始新 Run · M 切換音效");
    this.input.keyboard.on("keydown-ENTER", () => this.startRun());
    this.input.keyboard.on("keydown-N", () => this.startNewRun());
    this.input.keyboard.on("keydown-M", () => this.toggleSound());
  }

  createBackdrop() {
    this.add.rectangle(480, 270, 780, 380, 0x121727, 0.96).setStrokeStyle(2, 0x4b536d, 0.9);
    this.add.rectangle(480, 270, 728, 328, 0x0d111d, 1).setStrokeStyle(1, 0x252e43, 1);
    this.add.circle(480, 226, 102, 0x352d4a, 0.25).setStrokeStyle(2, 0x9a76d1, 0.45);
    const bossPreview = this.add.sprite(480, 226, "provided-boss").setScale(3).setAlpha(0.9);
    if (this.anims.exists("actor-boss-idle-down")) bossPreview.play("actor-boss-idle-down");
    this.add.text(480, 92, "第一地層：鏽蝕王座", {
      color: "#9aa2c1",
      fontFamily: "monospace",
      fontSize: "13px",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  createMenuText() {
    this.add.text(480, 136, "DUNGEON", {
      color: "#f5f1da",
      fontFamily: "monospace",
      fontSize: "52px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(480, 184, "IRON BELOW", {
      color: "#dfb84f",
      fontFamily: "monospace",
      fontSize: "16px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.seedText = this.add.text(480, 284, `RUN SEED  ${this.runSeed}`, {
      color: "#aaa8b5",
      fontFamily: "monospace",
      fontSize: "12px",
    }).setOrigin(0.5);
    this.add.text(480, 310, "五間隨機普通房 · Buff 構築 · 三階段魔王", {
      color: "#77798a",
      fontFamily: "monospace",
      fontSize: "11px",
    }).setOrigin(0.5);
  }

  soundLabel() {
    return this.audio.enabled ? "音效 ON · M" : "音效 OFF · M";
  }

  toggleSound() {
    this.audio.toggle();
    this.soundButton.text.setText(this.soundLabel());
  }

  startNewRun() {
    this.runSeed = makeRunSeed();
    saveLastSeed(this.runSeed);
    this.seedText.setText(`RUN SEED  ${this.runSeed}`);
    this.startRun();
  }

  startRun() {
    if (document.body.classList.contains("is-portrait-blocked")) return;
    saveLastSeed(this.runSeed);
    this.audio.beep("ui");
    this.scene.start("Room", {
      runSeed: this.runSeed,
      roomIndex: 0,
      build: { buffs: [], health: 100 },
      runStats: createRunStats(this.runSeed),
    });
  }

  showHint(message) {
    this.add.text(480, 496, message, {
      color: "#666879",
      fontFamily: "monospace",
      fontSize: "11px",
    }).setOrigin(0.5);
  }
}
