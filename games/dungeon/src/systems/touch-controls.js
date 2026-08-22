import Phaser from "phaser";
import { isTouchPointer } from "../ui/input.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class TouchControls {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.enabled = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.moveX = 0;
    this.moveY = 0;
    this.attackPressed = false;
    this.dodgePressed = false;
    this.buffPressed = false;
    this.activePointerId = null;
    this.joystickCenter = new Phaser.Math.Vector2(820, 408);
    this.joystickRadius = 68;
    this.joystickKnobRadius = 25;
    this.elements = [];
    this.handlers = {};

    if (this.enabled) this.createControls();
  }

  createControls() {
    const scene = this.scene;
    if (scene.input.addPointer) scene.input.addPointer(2);
    if (scene.input.mouse) scene.input.mouse.enabled = false;

    const base = scene.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, this.joystickRadius, 0x20283b, 0.84)
      .setStrokeStyle(3, 0x69718d, 0.95)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, this.joystickRadius), Phaser.Geom.Circle.Contains);
    const knob = scene.add
      .circle(this.joystickCenter.x, this.joystickCenter.y, this.joystickKnobRadius, 0x9aa2c1, 0.95)
      .setStrokeStyle(2, 0xe2dfca, 0.9)
      .setScrollFactor(0)
      .setDepth(101);
    const attack = this.makeButton(126, 358, 54, 0xb94d45, "ATTACK", () => { this.attackPressed = true; });
    const dodge = this.makeButton(126, 458, 48, 0x4f79a8, "DODGE", () => { this.dodgePressed = true; });
    const buff = this.makeButton(690, 462, 42, 0x6e5b9b, "BUFF", () => { this.buffPressed = true; });
    this.elements.push(base, knob, attack, dodge, buff);
    this.knob = knob;

    base.on("pointerdown", (pointer) => {
      if (!isTouchPointer(pointer)) return;
      this.activePointerId = pointer.id;
      this.updateJoystick(pointer.x, pointer.y);
    });
    this.handlers.pointermove = (pointer) => {
      if (pointer.id === this.activePointerId && isTouchPointer(pointer)) this.updateJoystick(pointer.x, pointer.y);
    };
    this.handlers.pointerup = (pointer) => this.releasePointer(pointer);
    this.handlers.pointerupoutside = (pointer) => this.releasePointer(pointer);
    scene.input.on("pointermove", this.handlers.pointermove);
    scene.input.on("pointerup", this.handlers.pointerup);
    scene.input.on("pointerupoutside", this.handlers.pointerupoutside);
  }

  makeButton(x, y, radius, color, label, onPress) {
    const button = this.scene.add
      .circle(x, y, radius, color, 0.92)
      .setStrokeStyle(3, 0xe2dfca, 0.86)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
    const text = this.scene.add
      .text(x, y, label, {
        color: "#f5f1da",
        fontFamily: "monospace",
        fontSize: label === "ATTACK" ? "8px" : "7px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    button.on("pointerdown", (pointer) => {
      if (!isTouchPointer(pointer)) return;
      onPress();
    });
    this.elements.push(text);
    return button;
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
      buff: this.buffPressed,
    };
    this.attackPressed = false;
    this.dodgePressed = false;
    this.buffPressed = false;
    return actions;
  }

  destroy() {
    this.elements.forEach((element) => element.destroy());
    if (this.handlers.pointermove) this.scene.input.off("pointermove", this.handlers.pointermove);
    if (this.handlers.pointerup) this.scene.input.off("pointerup", this.handlers.pointerup);
    if (this.handlers.pointerupoutside) this.scene.input.off("pointerupoutside", this.handlers.pointerupoutside);
  }
}
