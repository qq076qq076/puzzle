const INTERNAL = Object.freeze({
  completionThreshold: 12,
  damageStages: [0, 2, 5, 8, 11],
  colors: {
    face: 0xc86d4c,
    faceHover: 0xd97d59,
    edge: 0xf0a07f,
    edgeDark: 0x7e3f32,
    crack: 0x4a211d,
    text: "#fff3e9",
    shard: [0xc86d4c, 0xb85f43, 0xd77b58, 0xa94f3b]
  }
});

export class Level01Scene extends Phaser.Scene {
  constructor() {
    super({ key: "Level01Scene" });
    this.progress = 0;
    this.status = "loading";
    this.buttonWidth = 220;
    this.buttonHeight = 82;
    this.centerX = 0;
    this.centerY = 0;
    this.hovered = false;
    this.audioContext = null;
    this.fragments = [];
    this.introStarted = false;
    this.loadingHit = false;
  }

  create() {
    this.statusElement = document.getElementById("game-status");
    this.cameras.main.setBackgroundColor("#000000");
    this.input.addPointer(2);
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", this.handleResize, this));

    this.createLoadingLabel();
    this.createButton();
    this.createResultText();
    this.handleResize({ width: this.scale.width, height: this.scale.height });
    this.button.disableInteractive();
    this.startLoadingIntro();

    this.input.keyboard?.on("keydown-SPACE", this.onKeyboardAction, this);
    this.input.keyboard?.on("keydown-ENTER", this.onKeyboardAction, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-SPACE", this.onKeyboardAction, this);
      this.input.keyboard?.off("keydown-ENTER", this.onKeyboardAction, this);
    });
  }

  createLoadingLabel() {
    this.loadingLabel = this.add.text(0, 0, "loading...", {
      color: "#f4ece7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif",
      fontSize: "28px",
      fontStyle: "600",
      letterSpacing: 3,
      shadow: { color: "#ffffff", fill: true, blur: 12, offsetX: 0, offsetY: 0, stroke: false }
    }).setOrigin(0.5).setDepth(20);
    this.loadingPulse = this.tweens.add({
      targets: this.loadingLabel,
      alpha: 0.48,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
  }

  startLoadingIntro() {
    this.introStarted = true;
    this.button.setPosition(-this.buttonWidth * 1.7, this.centerY);
    this.button.setScale(0.82, 0.82);
    this.button.setAngle(-7);
    this.time.delayedCall(260, () => {
      this.tweens.add({
        targets: this.button,
        x: this.centerX,
        y: this.centerY,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 820,
        ease: "Cubic.Out",
        onUpdate: (tween) => {
          if (!this.loadingHit && tween.progress >= 0.66) this.hitLoadingLabel();
        },
        onComplete: () => {
          this.status = "active";
          this.button.setInteractive();
          this.tweens.add({
            targets: this.button,
            scaleX: 1.025,
            scaleY: 0.975,
            duration: 130,
            yoyo: true,
            ease: "Quad.Out"
          });
        }
      });
    });
  }

  hitLoadingLabel() {
    if (this.loadingHit) return;
    this.loadingHit = true;
    this.loadingPulse?.stop();
    this.loadingLabel?.setVisible(false);
    this.createLoadingFragments();
    this.cameras.main.shake(100, 0.004);
  }

  createLoadingFragments() {
    const text = "loading...";
    const spacing = 18;
    const startX = this.centerX - ((text.length - 1) * spacing) / 2;
    [...text].forEach((character, index) => {
      const fragment = this.add.text(startX + index * spacing, this.centerY, character, {
        color: index % 2 ? "#fff3e9" : "#d5c1b9",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif",
        fontSize: "28px",
        fontStyle: "600"
      }).setOrigin(0.5).setDepth(21);
      const direction = index - (text.length - 1) / 2;
      this.tweens.add({
        targets: fragment,
        x: fragment.x + direction * Phaser.Math.Between(8, 18),
        y: fragment.y + Phaser.Math.Between(-54, 54),
        angle: Phaser.Math.Between(-42, 42),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.55, 1.15),
        duration: Phaser.Math.Between(260, 430),
        delay: index * 8,
        ease: "Cubic.Out",
        onComplete: () => fragment.destroy()
      });
    });
  }

  createButton() {
    this.button = this.add.container(0, 0);
    this.shadow = this.add.graphics();
    this.face = this.add.graphics();
    this.faceHighlight = this.add.graphics();
    this.crackGlow = this.add.graphics();
    this.cracks = this.add.graphics();
    this.label = this.add.text(0, 0, "下一關", {
      color: INTERNAL.colors.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif",
      fontSize: "24px",
      fontStyle: "600",
      resolution: Math.min(2, window.devicePixelRatio || 1)
    }).setOrigin(0.5);

    this.button.add([this.shadow, this.face, this.faceHighlight, this.crackGlow, this.cracks, this.label]);
    this.button.setSize(this.buttonWidth, this.buttonHeight);
    this.button.setInteractive(
      new Phaser.Geom.Rectangle(-this.buttonWidth / 2, -this.buttonHeight / 2, this.buttonWidth, this.buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    this.button.on("pointerdown", this.onButtonAction, this);
    this.button.on("pointerover", () => {
      this.hovered = true;
      this.drawButton();
    });
    this.button.on("pointerout", () => {
      this.hovered = false;
      this.drawButton();
    });
    this.drawButton();
  }

  createResultText() {
    this.result = this.add.text(0, 0, "過關", {
      color: INTERNAL.colors.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', sans-serif",
      fontSize: "82px",
      fontStyle: "700",
      shadow: { color: "#5b2e25", fill: true, blur: 18, offsetX: 0, offsetY: 8, stroke: true, distance: 4 }
    }).setOrigin(0.5).setAlpha(0).setScale(0.72).setDepth(10);
  }

  handleResize(size) {
    const width = Math.max(1, Number(size?.width) || this.scale.width || window.innerWidth);
    const height = Math.max(1, Number(size?.height) || this.scale.height || window.innerHeight);
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.buttonWidth = Math.min(280, Math.max(176, width * 0.56));
    this.buttonHeight = Math.min(96, Math.max(68, this.buttonWidth * 0.36));

    if (this.loadingLabel) this.loadingLabel.setPosition(this.centerX, this.centerY);
    if (this.button) {
      if (!this.introStarted) this.button.setPosition(-this.buttonWidth * 1.7, this.centerY);
      else if (this.status === "active") this.button.setPosition(this.centerX, this.centerY);
      this.button.setSize(this.buttonWidth, this.buttonHeight);
      this.button.input.hitArea.setSize(this.buttonWidth, this.buttonHeight);
      this.drawButton();
    }

    if (this.result) {
      this.result.setPosition(this.centerX, this.centerY);
      this.result.setFontSize(Math.min(96, Math.max(52, width * 0.16)));
    }
  }

  onKeyboardAction(event) {
    if (event?.repeat) return;
    this.onButtonAction();
  }

  onButtonAction() {
    if (this.status !== "active") return;
    this.progress += 1;
    this.playImpactSound();
    if (navigator.vibrate) navigator.vibrate(this.progress >= INTERNAL.completionThreshold ? 18 : 7);
    this.emitImpact();

    this.tweens.killTweensOf(this.button);
    this.button.setScale(1);
    this.tweens.add({
      targets: this.button,
      scaleX: 0.96,
      scaleY: 0.91,
      duration: 55,
      yoyo: true,
      ease: "Quad.Out"
    });

    if (this.progress >= INTERNAL.completionThreshold) {
      this.shatter();
      return;
    }

    this.drawButton();
    if (this.progress === 5 || this.progress === 8 || this.progress === 11) {
      this.cameras.main.shake(70, 0.0022);
    }
  }

  getDamageStage() {
    let stage = 0;
    INTERNAL.damageStages.forEach((threshold, index) => {
      if (this.progress >= threshold) stage = index;
    });
    return stage;
  }

  drawButton() {
    if (!this.face || !this.cracks) return;
    const w = this.buttonWidth;
    const h = this.buttonHeight;
    const radius = Math.min(18, h * 0.22);
    const stage = this.getDamageStage();
    const fill = this.hovered ? INTERNAL.colors.faceHover : INTERNAL.colors.face;

    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.32);
    this.shadow.fillRoundedRect(-w / 2, -h / 2 + 9, w, h, radius);

    this.face.clear();
    this.face.fillStyle(fill, 1);
    this.face.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.face.lineStyle(3, INTERNAL.colors.edge, 0.9);
    this.face.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.face.lineStyle(2, INTERNAL.colors.edgeDark, 0.5);
    this.face.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(8, radius - 4));

    this.faceHighlight.clear();
    this.faceHighlight.fillStyle(0xffe0cf, 0.12);
    this.faceHighlight.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.32, Math.max(8, radius - 6));
    this.faceHighlight.lineStyle(1.5, 0xfff4eb, 0.18);
    this.faceHighlight.lineBetween(-w / 2 + 12, -h / 2 + 8, w / 2 - 12, -h / 2 + 8);

    this.crackGlow.clear();
    this.cracks.clear();
    if (stage > 0) {
      this.crackGlow.lineStyle(Math.max(5, w * 0.032), 0xffc9ad, 0.18);
      this.cracks.lineStyle(Math.max(2, w * 0.011), INTERNAL.colors.crack, 0.95);
      const paths = this.getCrackPaths(w, h);
      paths.slice(0, stage + 1).forEach((path) => {
        this.drawCrackPath(this.crackGlow, path);
        this.drawCrackPath(this.cracks, path);
      });
    }
  }

  drawCrackPath(graphics, path) {
    graphics.beginPath();
    graphics.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
  }

  getCrackPaths(w, h) {
    return [
      [{ x: -w * 0.27, y: -h * 0.5 }, { x: -w * 0.2, y: -h * 0.1 }, { x: -w * 0.29, y: h * 0.12 }, { x: -w * 0.22, y: h * 0.5 }],
      [{ x: -w * 0.2, y: -h * 0.1 }, { x: -w * 0.03, y: -h * 0.2 }, { x: w * 0.05, y: -h * 0.47 }],
      [{ x: -w * 0.03, y: -h * 0.2 }, { x: w * 0.13, y: -h * 0.03 }, { x: w * 0.3, y: -h * 0.07 }, { x: w * 0.5, y: -h * 0.26 }],
      [{ x: -w * 0.29, y: h * 0.12 }, { x: -w * 0.08, y: h * 0.08 }, { x: w * 0.04, y: h * 0.31 }, { x: w * 0.18, y: h * 0.5 }],
      [{ x: w * 0.04, y: h * 0.31 }, { x: w * 0.24, y: h * 0.23 }, { x: w * 0.37, y: h * 0.5 }],
      [{ x: w * 0.13, y: -h * 0.03 }, { x: w * 0.2, y: h * 0.1 }, { x: w * 0.32, y: h * 0.12 }]
    ];
  }

  shatter() {
    if (this.status !== "active") return;
    this.status = "shattering";
    this.button.disableInteractive();
    this.label.setVisible(false);
    this.faceHighlight.setVisible(false);
    this.crackGlow.setVisible(false);
    this.cracks.setVisible(false);
    this.createBurstEffects();
    this.createFragments();
    this.tweens.add({
      targets: this.button,
      scaleX: 1.08,
      scaleY: 0.88,
      alpha: 0,
      duration: 120,
      ease: "Quad.In"
    });

    this.time.delayedCall(780, () => {
      this.status = "complete";
      this.statusElement.textContent = "已過關";
      this.tweens.add({ targets: this.result, alpha: 1, scale: 1, duration: 360, ease: "Back.Out" });
    });
  }

  emitImpact() {
    if (this.status !== "active") return;
    const paths = this.getCrackPaths(this.buttonWidth, this.buttonHeight);
    const path = paths[Math.min(paths.length - 1, Math.max(0, this.progress - 1))];
    const point = path[path.length - 1];
    const x = this.centerX + point.x;
    const y = this.centerY + point.y;
    const pulse = this.add.circle(x, y, Math.max(3, this.buttonWidth * 0.018), 0xffe2d3, 0.26).setDepth(6);
    pulse.setStrokeStyle(Math.max(1, this.buttonWidth * 0.008), 0xffb18d, 0.65);
    this.tweens.add({ targets: pulse, scale: 3.8, alpha: 0, duration: 240, ease: "Cubic.Out", onComplete: () => pulse.destroy() });

    const sparkCount = this.progress >= INTERNAL.completionThreshold ? 18 : 5;
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = this.add.circle(x, y, Phaser.Math.FloatBetween(1.5, 3.2), index % 2 ? 0xffb28f : 0xffdbc9, 0.9).setDepth(6);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, this.progress >= INTERNAL.completionThreshold ? 145 : 48);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + (this.progress >= INTERNAL.completionThreshold ? Phaser.Math.Between(10, 70) : 0),
        scale: 0.2,
        alpha: 0,
        duration: Phaser.Math.Between(260, this.progress >= INTERNAL.completionThreshold ? 720 : 390),
        ease: "Cubic.Out",
        onComplete: () => spark.destroy()
      });
    }
  }

  createBurstEffects() {
    const flash = this.add.rectangle(this.centerX, this.centerY, this.buttonWidth * 0.9, this.buttonHeight * 0.9, 0xffe4d4, 0.22).setDepth(8);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, scale: 1.9, alpha: 0, duration: 330, ease: "Cubic.Out", onComplete: () => flash.destroy() });

    const ring = this.add.circle(this.centerX, this.centerY, this.buttonWidth * 0.24, 0xffffff, 0).setDepth(7);
    ring.setStrokeStyle(Math.max(2, this.buttonWidth * 0.014), 0xffb997, 0.75);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 2.7, alpha: 0, duration: 620, ease: "Cubic.Out", onComplete: () => ring.destroy() });
    this.cameras.main.flash(180, 255, 210, 190, false);
    this.cameras.main.shake(180, 0.008);
  }

  createFragments() {
    const columns = 4;
    const rows = 3;
    const w = this.buttonWidth;
    const h = this.buttonHeight;
    const cellW = w / columns;
    const cellH = h / rows;
    const colors = INTERNAL.colors.shard;

    let shardIndex = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x0 = -w / 2 + column * cellW;
        const y0 = -h / 2 + row * cellH;
        const x1 = x0 + cellW;
        const y1 = y0 + cellH;
        const inset = Math.min(4, cellW * 0.09);
        const jitter = Math.min(5, cellH * 0.11);
        const corners = [
          { x: x0 + inset + Phaser.Math.Between(-jitter, jitter), y: y0 + inset + Phaser.Math.Between(-jitter, jitter) },
          { x: x1 - inset + Phaser.Math.Between(-jitter, jitter), y: y0 + inset + Phaser.Math.Between(-jitter, jitter) },
          { x: x1 - inset + Phaser.Math.Between(-jitter, jitter), y: y1 - inset + Phaser.Math.Between(-jitter, jitter) },
          { x: x0 + inset + Phaser.Math.Between(-jitter, jitter), y: y1 - inset + Phaser.Math.Between(-jitter, jitter) }
        ];
        const triangles = [
          [corners[0], corners[1], corners[2]],
          [corners[0], corners[2], corners[3]]
        ];

        triangles.forEach((points, triangleIndex) => {
          const shard = this.add.polygon(this.centerX, this.centerY, points, colors[shardIndex % colors.length], 1);
          shard.setStrokeStyle(1.5, INTERNAL.colors.edgeDark, 0.75);
          shard.setDepth(5);
          this.fragments.push(shard);

          const averageX = points.reduce((total, point) => total + point.x, 0) / points.length;
          const averageY = points.reduce((total, point) => total + point.y, 0) / points.length;
          const angle = Phaser.Math.Angle.Between(0, 0, averageX, averageY);
          const distance = Phaser.Math.Between(90, 190) + row * 12 + triangleIndex * 10;
          const targetX = this.centerX + Math.cos(angle) * distance;
          const targetY = this.centerY + Math.sin(angle) * distance + Phaser.Math.Between(20, 100);
          this.tweens.add({
            targets: shard,
            x: targetX,
            y: targetY,
            angle: Phaser.Math.Between(-75, 75),
            alpha: 0,
            scale: Phaser.Math.FloatBetween(0.78, 1.08),
            duration: Phaser.Math.Between(620, 920),
            delay: Phaser.Math.Between(0, 55),
            ease: "Cubic.Out"
          });
          shardIndex += 1;
        });
      }
    }
  }

  playImpactSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.audioContext ||= new AudioContextClass();
      if (this.audioContext.state === "suspended") this.audioContext.resume();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 135 + this.progress * 8;
      gain.gain.setValueAtTime(0.035, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.085);
    } catch {
      // Audio is an enhancement; interaction must continue when it is unavailable.
    }
  }
}
