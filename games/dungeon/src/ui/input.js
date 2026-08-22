import Phaser from "phaser";

export function disableMouseInput(scene) {
  if (scene.input.mouse) scene.input.mouse.enabled = false;
}

export function isTouchPointer(pointer) {
  const event = pointer?.event || pointer;
  return event?.pointerType === "touch" || event?.pointerType === "pen" || event?.type === "touchstart" || event?.type === "touchmove";
}

export function makeTouchOnlyButton(scene, x, y, width, height, label, onPress, options = {}) {
  const background = scene.add
    .rectangle(x, y, width, height, options.color ?? 0x303a55, options.alpha ?? 0.94)
    .setStrokeStyle(options.strokeWidth ?? 2, options.strokeColor ?? 0x9aa2c1, 0.95)
    .setScrollFactor(0)
    .setDepth(options.depth ?? 160)
    .setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
  const text = scene.add
    .text(x, y, label, {
      color: options.textColor ?? "#f5f1da",
      fontFamily: "monospace",
      fontSize: options.fontSize ?? "12px",
      fontStyle: "bold",
      align: "center",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth((options.depth ?? 160) + 1);
  background.on("pointerdown", (pointer) => {
    if (isTouchPointer(pointer)) onPress();
  });
  return { background, text, destroy: () => { background.destroy(); text.destroy(); } };
}
