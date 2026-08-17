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

  function readLocal(key) {
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
    const firebase = window.PuzzleFirebase && window.PuzzleFirebase.enabled ? window.PuzzleFirebase : null;
    let active = false;
    let intervalId = null;
    let cloudReady = !firebase;
    let cloudTimer = null;
    let cloudPending = null;
    let cloudOperations = Promise.resolve();
    let eventsInstalled = false;

    function readCheckpoint() {
      const checkpoint = readLocal(storageKey);
      if (checkpoint && options.validate && !options.validate(checkpoint.data)) {
        clearLocal();
        return null;
      }
      return checkpoint;
    }

    function clearLocal() {
      try { window.localStorage.removeItem(storageKey); } catch (error) { /* Storage may be unavailable. */ }
    }

    function clear() {
      clearLocal();
      cloudPending = null;
      if (firebase) {
        cloudOperations = cloudOperations.then(function () { return firebase.clear(options.key); });
      }
    }

    function writeLocal(data) {
      const checkpoint = { version: 1, savedAt: Date.now(), data: data };
      try { window.localStorage.setItem(storageKey, JSON.stringify(checkpoint)); } catch (error) { /* Storage may be unavailable. */ }
      return checkpoint;
    }

    function flushCloud() {
      cloudTimer = null;
      if (!firebase || !cloudReady || !cloudPending) return cloudOperations;
      const checkpoint = cloudPending;
      cloudPending = null;
      cloudOperations = cloudOperations.then(function () {
        return firebase.save(options.key, checkpoint.data);
      }).then(function () {
        if (cloudPending && !cloudTimer) cloudTimer = window.setTimeout(flushCloud, options.cloudInterval || 5000);
      });
      return cloudOperations;
    }

    function queueCloudSave(checkpoint, immediate) {
      if (!firebase || !cloudReady) return;
      cloudPending = checkpoint;
      if (immediate) {
        flushCloud();
      } else if (!cloudTimer) {
        cloudTimer = window.setTimeout(flushCloud, options.cloudInterval || 5000);
      }
    }

    function saveNow(immediate) {
      if (!active) return;
      try {
        const data = options.getState();
        if (data) queueCloudSave(writeLocal(data), Boolean(immediate));
      } catch (error) {
        // A blocked or full localStorage must never stop the game.
      }
    }

    function beginAutosave() {
      active = true;
      window.clearInterval(intervalId);
      intervalId = window.setInterval(function () { saveNow(false); }, options.interval || 2000);
      if (!eventsInstalled) {
        eventsInstalled = true;
        window.addEventListener("pagehide", function () {
          saveNow(true);
          flushCloud();
        });
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") {
            saveNow(true);
            flushCloud();
          }
        });
      }
      saveNow(false);
    }

    if (window.PuzzleSave && Array.isArray(window.PuzzleSave._flushers)) {
      window.PuzzleSave._flushers.push(function () {
        saveNow(true);
        return flushCloud();
      });
    }

    function blockGameKeys(event) {
      if (event.key !== "Tab") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function createCover(content) {
      installStyles();
      const cover = document.createElement("div");
      cover.className = "puzzle-save-cover";
      cover.setAttribute("role", "dialog");
      cover.setAttribute("aria-modal", "true");
      cover.setAttribute("aria-labelledby", "puzzle-save-title");
      cover.innerHTML = content;
      document.body.appendChild(cover);
      document.addEventListener("keydown", blockGameKeys, true);
      return {
        element: cover,
        close: function () {
          document.removeEventListener("keydown", blockGameKeys, true);
          cover.remove();
        }
      };
    }

    function showChoice(checkpoint, source) {
      const cover = createCover('<div class="puzzle-save-dialog"><div class="puzzle-save-kicker">SAVED GAME</div><h2 id="puzzle-save-title">繼續上次的遊戲？</h2><p>' +
        (source ? source + "。" : (options.description || "找到上次離開時的進度。你可以接著玩，或清除進度重新開始。")) +
        '</p><div class="puzzle-save-actions"><button type="button" data-action="restart">重新開始</button><button type="button" data-action="continue">繼續遊戲</button></div></div>');

      function startFresh() {
        clear();
        try { options.fresh(); } catch (error) { console.error("[PuzzleSave] Cannot start fresh game", error); }
        cover.close();
        beginAutosave();
      }

      cover.element.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        if (button.dataset.action === "continue") {
          cover.close();
          beginAutosave();
          return;
        }
        startFresh();
      });
      cover.element.querySelector('[data-action="continue"]').focus();
    }

    function normalizeRemote(remote) {
      if (!remote || remote.version !== 1 || !remote.data) return null;
      if (options.validate && !options.validate(remote.data)) return null;
      return { version: 1, savedAt: Number(remote.clientSavedAt) || 0, data: remote.data };
    }

    function applyCheckpoint(checkpoint, fallbackFresh) {
      if (checkpoint) {
        try {
          options.restore(checkpoint.data);
          return true;
        } catch (error) {
          console.warn("[PuzzleSave] Cannot restore checkpoint", options.key, error);
        }
      }
      if (fallbackFresh) {
        try { options.fresh(); } catch (error) { console.error("[PuzzleSave] Cannot create initial game", error); }
      }
      return false;
    }

    const localCheckpoint = readCheckpoint();
    let selectedCheckpoint = localCheckpoint;
    let selectedSource = localCheckpoint ? "已載入本機存檔" : "";
    applyCheckpoint(localCheckpoint, !localCheckpoint);

    const syncCover = firebase ? createCover('<div class="puzzle-save-dialog"><div class="puzzle-save-kicker">FIREBASE SYNC</div><h2 id="puzzle-save-title">正在同步進度…</h2><p>正在確認雲端與本機的最新存檔，請稍候。</p></div>') : null;

    function finishInitialization(remote) {
      const remoteCheckpoint = normalizeRemote(remote);
      if (remoteCheckpoint && (!selectedCheckpoint || remoteCheckpoint.savedAt >= selectedCheckpoint.savedAt)) {
        selectedCheckpoint = remoteCheckpoint;
        selectedSource = "已載入 Firebase 雲端存檔";
        applyCheckpoint(remoteCheckpoint, false);
      } else if (selectedCheckpoint) {
        selectedSource = firebase && remoteCheckpoint ? "本機存檔較新，已保留本機進度" : selectedSource;
      }

      cloudReady = true;
      if (syncCover) syncCover.close();
      if (selectedCheckpoint) {
        showChoice(selectedCheckpoint, selectedSource);
      } else {
        beginAutosave();
      }
    }

    if (firebase) {
      firebase.load(options.key).then(finishInitialization).catch(function () { finishInitialization(null); });
    } else {
      finishInitialization(null);
    }

    return { save: saveNow, clear: clear, ready: window.PuzzleFirebaseReady || Promise.resolve(null) };
  }

  window.PuzzleSave = {
    create: create,
    _flushers: [],
    flushAll: function () {
      return Promise.all(this._flushers.map(function (flush) { return flush(); }));
    }
  };
}());
