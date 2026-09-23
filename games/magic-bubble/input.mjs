import { TIMING } from "./config.mjs";

const KEY_COMMANDS = new Map([
  ["ArrowLeft", "MOVE_LEFT"], ["a", "MOVE_LEFT"], ["A", "MOVE_LEFT"],
  ["ArrowRight", "MOVE_RIGHT"], ["d", "MOVE_RIGHT"], ["D", "MOVE_RIGHT"],
  ["z", "ROTATE_CCW"], ["Z", "ROTATE_CCW"], ["j", "ROTATE_CCW"], ["J", "ROTATE_CCW"],
  ["x", "ROTATE_CW"], ["X", "ROTATE_CW"], ["k", "ROTATE_CW"], ["K", "ROTATE_CW"], ["ArrowUp", "ROTATE_CW"],
  [" ", "HARD_DROP"]
]);

export class InputController {
  constructor({ surface, controls, onCommand, onPause, onRestart, enabled }) {
    this.surface = surface;
    this.controls = controls;
    this.onCommand = onCommand;
    this.onPause = onPause;
    this.onRestart = onRestart;
    this.enabled = enabled;
    this.softDrop = false;
    this.horizontal = 0;
    this.horizontalHeldMs = 0;
    this.repeatAccumulatorMs = 0;
    this.lastHorizontalKey = null;
    this.pointer = null;
    this.keys = new Set();
    this.install();
  }

  install() {
    this.onKeyDown = (event) => {
      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        event.preventDefault();
        if (!event.repeat) this.onPause();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        if (!event.repeat) this.onRestart();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        this.softDrop = true;
        this.keys.add(event.key);
        return;
      }
      const command = KEY_COMMANDS.get(event.key);
      if (!command) return;
      event.preventDefault();
      if (!this.enabled()) return;
      if (command === "MOVE_LEFT" || command === "MOVE_RIGHT") {
        const direction = command === "MOVE_LEFT" ? -1 : 1;
        if (!this.keys.has(event.key)) {
          this.keys.add(event.key);
          this.lastHorizontalKey = event.key;
          this.horizontal = direction;
          this.horizontalHeldMs = 0;
          this.repeatAccumulatorMs = 0;
          this.onCommand(command);
        }
      } else if (!event.repeat) {
        this.onCommand(command);
      }
    };

    this.onKeyUp = (event) => {
      this.keys.delete(event.key);
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") this.softDrop = false;
      if (event.key === this.lastHorizontalKey) {
        const leftHeld = ["ArrowLeft", "a", "A"].some((key) => this.keys.has(key));
        const rightHeld = ["ArrowRight", "d", "D"].some((key) => this.keys.has(key));
        this.horizontal = leftHeld ? -1 : rightHeld ? 1 : 0;
        this.lastHorizontalKey = null;
        this.horizontalHeldMs = 0;
        this.repeatAccumulatorMs = 0;
      }
    };

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", () => this.reset());

    this.controls.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-command]");
      if (!button || !this.enabled()) return;
      event.preventDefault();
      const command = button.dataset.command;
      button.classList.add("is-pressed");
      if (command === "SOFT_DROP") this.softDrop = true;
      else this.onCommand(command);
    });
    const releaseControl = (event) => {
      const button = event.target.closest?.("button[data-command]");
      if (button) button.classList.remove("is-pressed");
      this.softDrop = false;
    };
    this.controls.addEventListener("pointerup", releaseControl);
    this.controls.addEventListener("pointercancel", releaseControl);
    this.controls.addEventListener("pointerleave", releaseControl);

    this.surface.addEventListener("pointerdown", (event) => {
      if (!this.enabled() || event.target.closest("button")) return;
      this.surface.setPointerCapture?.(event.pointerId);
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, startedAt: performance.now(), hardDropped: false };
    });
    this.surface.addEventListener("pointermove", (event) => {
      if (!this.pointer || this.pointer.id !== event.pointerId || !this.enabled()) return;
      let deltaX = event.clientX - this.pointer.lastX;
      while (Math.abs(deltaX) >= 28) {
        this.onCommand(deltaX < 0 ? "MOVE_LEFT" : "MOVE_RIGHT");
        this.pointer.lastX += deltaX < 0 ? -28 : 28;
        deltaX = event.clientX - this.pointer.lastX;
      }
      const totalY = event.clientY - this.pointer.y;
      const elapsed = performance.now() - this.pointer.startedAt;
      if (!this.pointer.hardDropped && totalY > 70 && elapsed < 220) {
        this.pointer.hardDropped = true;
        this.onCommand("HARD_DROP");
      } else if (totalY > 18) {
        this.softDrop = true;
      }
    });
    const finishPointer = (event) => {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y);
      const elapsed = performance.now() - this.pointer.startedAt;
      if (!this.pointer.hardDropped && distance < 10 && elapsed < 260 && this.enabled()) this.onCommand("ROTATE_CW");
      this.pointer = null;
      this.softDrop = false;
    };
    this.surface.addEventListener("pointerup", finishPointer);
    this.surface.addEventListener("pointercancel", finishPointer);
  }

  update(deltaMs) {
    if (!this.enabled() || !this.horizontal) return;
    this.horizontalHeldMs += deltaMs;
    if (this.horizontalHeldMs < TIMING.dasMs) return;
    this.repeatAccumulatorMs += deltaMs;
    while (this.repeatAccumulatorMs >= TIMING.arrMs) {
      this.repeatAccumulatorMs -= TIMING.arrMs;
      this.onCommand(this.horizontal < 0 ? "MOVE_LEFT" : "MOVE_RIGHT");
    }
  }

  reset() {
    this.keys.clear();
    this.softDrop = false;
    this.horizontal = 0;
    this.horizontalHeldMs = 0;
    this.repeatAccumulatorMs = 0;
    this.pointer = null;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}

