import Phaser from "phaser";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.enabled = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.moveX = 0;
    this.moveY = 0;
    this.attackPressed = false;
    this.dodgePressed = false;
    this.activePointerId = null;
    this.joystickCenter = new Phaser.Math.Vector2(820, 410);
    this.joystickRadius = 68;
    this.joystickKnobRadius = 25;
    this.elements = [];

    if (this.enabled) this.createControls();
  }

  createControls() {
    const scene = this.scene;
    if (scene.input.addPointer) scene.input.addPointer(2);
    if (scene.input.mouse) scene.input.mouse.enabled = false;

    const base = scene.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, this.joystickRadius, 0x20283b, 0.78)
      .setStrokeStyle(3, 0x69718d, 0.9)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, this.joystickRadius), Phaser.Geom.Circle.Contains);
    const knob = scene.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, this.joystickKnobRadius, 0x9aa2c1, 0.92)
      .setStrokeStyle(2, 0xe2dfca, 0.85)
      .setScrollFactor(0)
      .setDepth(101);
    const attack = this.makeButton(118, 378, 48, 0xb94d45, "ATTACK");
    const dodge = this.makeButton(118, 482, 42, 0x4f79a8, "DODGE");
    this.elements.push(base, knob, attack, dodge);
    this.knob = knob;

    base.on("pointerdown", (pointer) => {
      if (!this.isTouchPointer(pointer)) return;
      this.activePointerId = pointer.id;
      this.updateJoystick(pointer.x, pointer.y);
    });
    attack.on("pointerdown", (pointer) => {
      if (!this.isTouchPointer(pointer)) return;
      this.attackPressed = true;
    });
    dodge.on("pointerdown", (pointer) => {
      if (!this.isTouchPointer(pointer)) return;
      this.dodgePressed = true;
    });
    scene.input.on("pointermove", (pointer) => {
      if (pointer.id === this.activePointerId && this.isTouchPointer(pointer)) {
        this.updateJoystick(pointer.x, pointer.y);
      }
    });
    scene.input.on("pointerup", (pointer) => this.releasePointer(pointer));
    scene.input.on("pointerupoutside", (pointer) => this.releasePointer(pointer));
  }

  makeButton(x, y, radius, color, label) {
    const button = this.scene.add
      .circle(x, y, radius, color, 0.9)
      .setStrokeStyle(3, 0xe2dfca, 0.85)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
    this.scene.add
      .text(x, y, label, {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: label === "ATTACK" ? "8px" : "7px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    return button;
  }

  isTouchPointer(pointer) {
    return pointer?.event?.pointerType === "touch" || pointer?.event?.pointerType === "pen";
  }

  updateJoystick(x, y) {
    const dx = x - this.joystickCenter.x;
    const dy = y - this.joystickCenter.y;
    const distance = Math.hypot(dx, dy);
    const scale = distance > this.joystickRadius ? this.joystickRadius / distance : 1;
    const knobX = this.joystickCenter.x + dx * scale;
    const knobY = this.joystickCenter.y + dy * scale;
    this.knob.setPosition(knobX, knobY);
    this.moveX = clamp((knobX - this.joystickCenter.x) / this.joystickRadius, -1, 1);
    this.moveY = clamp((knobY - this.joystickCenter.y) / this.joystickRadius, -1, 1);
  }

  releasePointer(pointer) {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.moveX = 0;
    this.moveY = 0;
    this.knob?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
  }

  consumeActions() {
    const actions = {
      attack: this.attackPressed,
      dodge: this.dodgePressed,
    };
    this.attackPressed = false;
    this.dodgePressed = false;
    return actions;
  }

  destroy() {
    this.elements.forEach((element) => element.destroy());
    this.scene.input.off("pointermove");
    this.scene.input.off("pointerup");
    this.scene.input.off("pointerupoutside");
  }
}
