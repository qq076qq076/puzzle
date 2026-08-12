(function () {
  "use strict";

  const STYLE_ID = "puzzle-save-system-style";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .puzzle-save-cover { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px; background: rgba(8, 12, 22, .78); backdrop-filter: blur(10px); }
      .puzzle-save-cover[hidden] { display: none; }
      .puzzle-save-dialog { box-sizing: border-box; width: min(100%, 430px); padding: 30px; border: 1px solid rgba(255,255,255,.2); border-radius: 24px; color: #f8fafc; background: linear-gradient(145deg, #202b40, #101724); box-shadow: 0 24px 80px rgba(0,0,0,.45); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: center; }
      .puzzle-save-kicker { margin: 0 0 10px; color: #93c5fd; font-size: 12px; font-weight: 800; letter-spacing: .16em; }
      .puzzle-save-dialog h2 { margin: 0; color: inherit; font-size: clamp(25px, 7vw, 34px); line-height: 1.15; }
      .puzzle-save-dialog p { margin: 14px 0 24px; color: #cbd5e1; line-height: 1.65; }
      .puzzle-save-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .puzzle-save-actions button { min-height: 48px; padding: 10px 16px; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; color: #e2e8f0; background: rgba(255,255,255,.07); font: inherit; font-weight: 800; cursor: pointer; }
      .puzzle-save-actions button[data-action="continue"] { border-color: #93c5fd; color: #0f172a; background: #93c5fd; }
      .puzzle-save-actions button:hover { transform: translateY(-1px); }
      @media (max-width: 430px) { .puzzle-save-actions { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function read(key) {
    try {
      const value = window.localStorage.getItem(key);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return parsed && parsed.version === 1 && parsed.data ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function create(options) {
    const storageKey = "puzzle-club-save:" + options.key + ":v1";
    let active = false;
    let intervalId = null;

    function clear() {
      try { window.localStorage.removeItem(storageKey); } catch (error) { /* Storage may be unavailable. */ }
    }

    function saveNow() {
      if (!active) return;
      try {
        const data = options.getState();
        if (data) {
          window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, savedAt: Date.now(), data: data }));
        }
      } catch (error) {
        // A blocked or full localStorage must never stop the game.
      }
    }

    function beginAutosave() {
      active = true;
      window.clearInterval(intervalId);
      intervalId = window.setInterval(saveNow, options.interval || 2000);
      window.addEventListener("pagehide", saveNow);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") saveNow();
      });
      saveNow();
    }

    function startFresh() {
      clear();
      options.fresh();
      beginAutosave();
    }

    const checkpoint = read(storageKey);
    if (!checkpoint || (options.validate && !options.validate(checkpoint.data))) {
      if (checkpoint) clear();
      startFresh();
      return { save: saveNow, clear: clear };
    }

    installStyles();
    const cover = document.createElement("div");
    cover.className = "puzzle-save-cover";
    cover.setAttribute("role", "dialog");
    cover.setAttribute("aria-modal", "true");
    cover.setAttribute("aria-labelledby", "puzzle-save-title");
    cover.innerHTML = '<div class="puzzle-save-dialog"><div class="puzzle-save-kicker">SAVED GAME</div><h2 id="puzzle-save-title">繼續上次的遊戲？</h2><p>' +
      (options.description || "找到上次離開時的進度。你可以接著玩，或清除進度重新開始。") +
      '</p><div class="puzzle-save-actions"><button type="button" data-action="restart">重新開始</button><button type="button" data-action="continue">繼續遊戲</button></div></div>';
    document.body.appendChild(cover);

    function blockGameKeys(event) {
      if (event.key !== "Tab") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    document.addEventListener("keydown", blockGameKeys, true);

    function close() {
      document.removeEventListener("keydown", blockGameKeys, true);
      cover.remove();
      beginAutosave();
    }

    cover.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "continue") {
        try {
          options.restore(checkpoint.data);
        } catch (error) {
          clear();
          options.fresh();
        }
      } else {
        clear();
        options.fresh();
      }
      close();
    });
    cover.querySelector('[data-action="continue"]').focus();
    return { save: saveNow, clear: clear };
  }

  window.PuzzleSave = { create: create };
}());
