const PAUSE_KEY_BINDINGS = [
  ["keydown-UP", "previous"],
  ["keydown-W", "previous"],
  ["keydown-DOWN", "next"],
  ["keydown-S", "next"],
  ["keydown-ENTER", "confirm"],
  ["keydown-SPACE", "confirm"],
];

export function createPauseKeyboardHandlers(scene) {
  return {
    previous: () => {
      if (!scene.paused || !scene.pauseOverlay) return;
      scene.pauseOverlay.moveSelection(-1);
      scene.audio?.beep("ui");
    },
    next: () => {
      if (!scene.paused || !scene.pauseOverlay) return;
      scene.pauseOverlay.moveSelection(1);
      scene.audio?.beep("ui");
    },
    confirm: () => {
      if (!scene.paused || !scene.pauseOverlay) return;
      if (scene.keyboardActions) scene.keyboardActions.attack = false;
      scene.keyboard?.SPACE?.reset();
      scene.pauseOverlay.activateSelection();
    },
  };
}

export function bindPauseKeyboard(scene, handlers) {
  PAUSE_KEY_BINDINGS.forEach(([event, handler]) => scene.input.keyboard.on(event, handlers[handler]));
}

export function unbindPauseKeyboard(scene, handlers) {
  if (!handlers) return;
  PAUSE_KEY_BINDINGS.forEach(([event, handler]) => scene.input.keyboard.off(event, handlers[handler]));
}
