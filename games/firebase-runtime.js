(function () {
  "use strict";

  const SDK_VERSION = "12.17.1";
  const SDK_ROOT = "https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/";
  const REQUIRED_CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const config = window.PUZZLE_FIREBASE_CONFIG || {};
  const configured = REQUIRED_CONFIG_KEYS.every(function (key) {
    return typeof config[key] === "string" && config[key].trim().length > 0;
  });
  const listeners = new Set();
  let status = configured ? "connecting" : "local";
  let statusDetail = configured ? "正在連線 Firebase" : "尚未設定 Firebase，使用本機存檔";
  let currentUser = null;
  let firestore = null;
  let getDocument = null;
  let setDocument = null;
  let deleteDocument = null;
  let makeDocument = null;
  let serverTimestamp = null;

  function notify(nextStatus, detail) {
    status = nextStatus;
    statusDetail = detail || "";
    listeners.forEach(function (listener) {
      try { listener({ status: status, detail: statusDetail, user: currentUser }); } catch (error) { /* Status UI is optional. */ }
    });
  }

  function cloneData(data) {
    if (typeof structuredClone === "function") return structuredClone(data);
    return JSON.parse(JSON.stringify(data));
  }

  function createSyncGate(label) {
    if (!configured || !document.body) return { close: function () {} };
    const styleId = "puzzle-firebase-gate-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ".puzzle-firebase-gate{position:fixed;inset:0;z-index:11000;display:grid;place-items:center;padding:24px;background:rgba(8,12,22,.72);backdrop-filter:blur(8px);font:700 14px/1.6 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:#e2e8f0;text-align:center}.puzzle-firebase-gate__card{max-width:330px;padding:24px 28px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:#111827;box-shadow:0 20px 60px rgba(0,0,0,.35)}";
      document.head.appendChild(style);
    }
    const gate = document.createElement("div");
    gate.className = "puzzle-firebase-gate";
    gate.setAttribute("role", "status");
    gate.setAttribute("aria-live", "polite");
    gate.innerHTML = "<div class=\"puzzle-firebase-gate__card\">" + (label || "正在同步遊戲進度…") + "</div>";
    document.body.appendChild(gate);
    return {
      close: function () {
        if (gate.isConnected) gate.remove();
      }
    };
  }

  function waitForAnonymousUser(authApi, authMethods) {
    return new Promise(function (resolve) {
      let settled = false;
      let requestedAnonymous = false;
      let unsubscribe = function () {};

      function finish(user, error) {
        if (settled) return;
        settled = true;
        unsubscribe();
        if (error) {
          notify("error", "Firebase 登入失敗，改用本機存檔");
          console.warn("[PuzzleFirebase] Authentication unavailable", error);
          resolve(null);
          return;
        }
        currentUser = user || null;
        if (user) notify("online", "Firebase 已連線");
        resolve(user || null);
      }

      unsubscribe = authMethods.onAuthStateChanged(authApi, function (user) {
        if (user) {
          finish(user);
          return;
        }
        if (requestedAnonymous) return;
        requestedAnonymous = true;
        authMethods.signInAnonymously(authApi).catch(function (error) { finish(null, error); });
      }, function (error) {
        finish(null, error);
      });
    });
  }

  function initialize() {
    if (!configured) {
      notify("local", "尚未設定 Firebase，使用本機存檔");
      return Promise.resolve(null);
    }

    return Promise.all([
      import(SDK_ROOT + "firebase-app.js"),
      import(SDK_ROOT + "firebase-auth.js"),
      import(SDK_ROOT + "firebase-firestore.js")
    ]).then(function (modules) {
      const appMethods = modules[0];
      const authMethods = modules[1];
      const firestoreMethods = modules[2];
      const app = appMethods.getApps().length ? appMethods.getApp() : appMethods.initializeApp(config);
      const auth = authMethods.getAuth(app);
      firestore = firestoreMethods.getFirestore(app);
      getDocument = firestoreMethods.getDoc;
      setDocument = firestoreMethods.setDoc;
      deleteDocument = firestoreMethods.deleteDoc;
      makeDocument = firestoreMethods.doc;
      serverTimestamp = firestoreMethods.serverTimestamp;
      return authMethods.setPersistence(auth, authMethods.browserLocalPersistence)
        .catch(function () { /* Some restricted browsers only support session persistence. */ })
        .then(function () { return waitForAnonymousUser(auth, authMethods); });
    }).catch(function (error) {
      notify("error", "Firebase SDK 無法載入，改用本機存檔");
      console.warn("[PuzzleFirebase] SDK unavailable", error);
      return null;
    });
  }

  const ready = initialize();

  function getSaveDocument(gameKey) {
    if (!firestore || !currentUser) return null;
    return makeDocument(firestore, "users", currentUser.uid, "saves", gameKey);
  }

  function load(gameKey) {
    return ready.then(function (user) {
      const reference = user && getSaveDocument(gameKey);
      if (!reference) return null;
      return getDocument(reference).then(function (snapshot) {
        if (!snapshot.exists()) return null;
        const value = snapshot.data();
        if (!value || value.version !== 1 || !value.data) return null;
        return {
          version: 1,
          data: cloneData(value.data),
          clientSavedAt: Number(value.clientSavedAt) || 0,
          updatedAt: value.updatedAt || null
        };
      }).catch(function (error) {
        notify("error", "雲端讀取失敗，使用本機存檔");
        console.warn("[PuzzleFirebase] Cannot load save", gameKey, error);
        return null;
      });
    });
  }

  function save(gameKey, data) {
    const payload = cloneData(data);
    return ready.then(function (user) {
      const reference = user && getSaveDocument(gameKey);
      if (!reference) return false;
      return setDocument(reference, {
        version: 1,
        data: payload,
        clientSavedAt: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true }).then(function () {
        notify("online", "Firebase 已同步");
        return true;
      }).catch(function (error) {
        notify("error", "雲端寫入失敗，保留本機存檔");
        console.warn("[PuzzleFirebase] Cannot save save", gameKey, error);
        return false;
      });
    });
  }

  function clear(gameKey) {
    return ready.then(function (user) {
      const reference = user && getSaveDocument(gameKey);
      if (!reference) return false;
      return deleteDocument(reference).then(function () {
        notify("online", "Firebase 已清除存檔");
        return true;
      }).catch(function (error) {
        notify("error", "雲端清除失敗，保留本機存檔");
        console.warn("[PuzzleFirebase] Cannot clear save", gameKey, error);
        return false;
      });
    });
  }

  window.PuzzleFirebase = {
    enabled: configured,
    ready: ready,
    load: load,
    save: save,
    clear: clear,
    createSyncGate: createSyncGate,
    onStatus: function (listener) {
      listeners.add(listener);
      listener({ status: status, detail: statusDetail, user: currentUser });
      return function () { listeners.delete(listener); };
    },
    getStatus: function () { return { status: status, detail: statusDetail, user: currentUser }; }
  };
  window.PuzzleFirebaseReady = ready;
}());
