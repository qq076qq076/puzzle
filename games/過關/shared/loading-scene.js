class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.label = this.add.text(0, 0, "loading...", {
      color: "#f4ece7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif",
      fontSize: "28px",
      fontStyle: "600",
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(20);
    this.layout({ width: this.scale.width, height: this.scale.height });
    this.scale.on("resize", this.layout, this);
    this.tweens.add({
      targets: this.label,
      alpha: 0.48,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });

    const targetScene = this.registry.get("nextLevelScene") || "Level01Scene";
    this.time.delayedCall(520, () => this.scene.start(targetScene));
  }

  layout(size) {
    this.label?.setPosition((Number(size?.width) || this.scale.width) / 2, (Number(size?.height) || this.scale.height) / 2);
  }
}

window.GuoguanLoadingScene = LoadingScene;
