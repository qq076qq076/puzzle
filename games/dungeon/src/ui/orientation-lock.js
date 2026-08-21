const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

const isPortrait = () => window.matchMedia("(orientation: portrait)").matches;

export function setupOrientationGuard() {
  const overlay = document.querySelector("#portrait-overlay");
  if (!overlay) return () => {};

  const update = () => {
    const blocked = isTouchDevice() && isPortrait();
    overlay.hidden = !blocked;
    document.body.classList.toggle("is-portrait-blocked", blocked);
  };

  const requestLandscape = async () => {
    if (!isTouchDevice() || !screen.orientation?.lock) return;
    try {
      await screen.orientation.lock("landscape");
    } catch {
      // Browsers commonly require fullscreen or a user gesture. The overlay is the fallback.
    }
  };

  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", update, { passive: true });
  window.addEventListener("pointerdown", requestLandscape, { once: true, passive: true });
  update();

  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
  };
}
