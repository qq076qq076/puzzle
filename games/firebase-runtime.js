(function () {
  "use strict";

  const SDK_VERSION = "12.17.1";
  const SDK_ROOT = "https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/";
  const REQUIRED_CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const SAVE_KEYS = [
    "2048",
    "1a2b",
    "gomoku",
    "knife-throw",
    "subaracity",
    "petri-dish",
    "microorganism",
    "duquan",
    "gravity-planet",
    "dice-tower-defense",
    "harvest-clicker"
  ];
  const config = window.PUZZLE_FIREBASE_CONFIG || {};
  const configured = REQUIRED_CONFIG_KEYS.every(function (key) {
    return typeof config[key] === "string" && config[key].trim().length > 0;
  });
  const listeners = new Set();
  let status = configured ? "connecting" : "local";
  let statusDetail = configured ? "正在連線 Firebase" : "尚未設定 Firebase，使用本機存檔";
  let currentUser = null;
  let authApi = null;
  let authSdk = null;
  let firestore = null;
  let getDocument = null;
  let setDocument = null;
  let deleteDocument = null;
  let makeDocument = null;
  let serverTimestamp = null;

  function accountLabel(user) {
    if (!user) return "";
    return user.email || (user.isAnonymous ? "匿名存檔" : "已登入帳號");
  }

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

  function waitForAnonymousUser() {
    return new Promise(function (resolve) {
      let settled = false;
      let requestedAnonymous = false;

      function finishWithError(error) {
        if (settled) return;
        settled = true;
        notify("error", "Firebase 登入失敗，改用本機存檔");
        console.warn("[PuzzleFirebase] Authentication unavailable", error);
        resolve(null);
      }

      authSdk.onAuthStateChanged(authApi, function (user) {
        currentUser = user || null;
        if (user) {
          notify("online", user.isAnonymous ? "Firebase 已連線 · 匿名存檔" : "Firebase 已連線 · 已登入 " + accountLabel(user));
          if (!settled) {
            settled = true;
            resolve(user);
          }
          return;
        }
        if (settled || requestedAnonymous) return;
        requestedAnonymous = true;
        authSdk.signInAnonymously(authApi).catch(finishWithError);
      }, finishWithError);
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
      authSdk = modules[1];
      const firestoreMethods = modules[2];
      const app = appMethods.getApps().length ? appMethods.getApp() : appMethods.initializeApp(config);
      authApi = authSdk.getAuth(app);
      firestore = firestoreMethods.getFirestore(app);
      getDocument = firestoreMethods.getDoc;
      setDocument = firestoreMethods.setDoc;
      deleteDocument = firestoreMethods.deleteDoc;
      makeDocument = firestoreMethods.doc;
      serverTimestamp = firestoreMethods.serverTimestamp;
      return authSdk.setPersistence(authApi, authSdk.browserLocalPersistence)
        .catch(function () { /* Some restricted browsers only support session persistence. */ })
        .then(waitForAnonymousUser);
    }).catch(function (error) {
      notify("error", "Firebase SDK 無法載入，改用本機存檔");
      console.warn("[PuzzleFirebase] SDK unavailable", error);
      return null;
    });
  }

  const ready = initialize();

  function getSaveDocumentForUser(user, gameKey) {
    if (!firestore || !user) return null;
    return makeDocument(firestore, "users", user.uid, "saves", gameKey);
  }

  function getSaveDocument(gameKey) {
    return getSaveDocumentForUser(currentUser, gameKey);
  }

  function normalizeRemoteValue(value) {
    if (!value || value.version !== 1 || !value.data) return null;
    return {
      version: 1,
      data: cloneData(value.data),
      clientSavedAt: Number(value.clientSavedAt) || 0,
      updatedAt: value.updatedAt || null
    };
  }

  function readSaveForUser(user, gameKey) {
    const reference = getSaveDocumentForUser(user, gameKey);
    if (!reference) return Promise.resolve(null);
    return getDocument(reference).then(function (snapshot) {
      return snapshot.exists() ? normalizeRemoteValue(snapshot.data()) : null;
    });
  }

  function writeSaveForUser(user, gameKey, data, clientSavedAt) {
    const reference = getSaveDocumentForUser(user, gameKey);
    if (!reference) return Promise.resolve(false);
    return setDocument(reference, {
      version: 1,
      data: cloneData(data),
      clientSavedAt: Number(clientSavedAt) || Date.now(),
      updatedAt: serverTimestamp()
    }, { merge: true }).then(function () { return true; });
  }

  function readAllSavesForUser(user) {
    return Promise.all(SAVE_KEYS.map(function (gameKey) {
      return readSaveForUser(user, gameKey).catch(function (error) {
        console.warn("[PuzzleFirebase] Cannot read save while merging", gameKey, error);
        return null;
      }).then(function (checkpoint) {
        return { gameKey: gameKey, checkpoint: checkpoint };
      });
    }));
  }

  function mergeSavesIntoUser(saves, targetUser) {
    return Promise.all(saves.map(function (entry) {
      if (!entry.checkpoint) return null;
      return readSaveForUser(targetUser, entry.gameKey).then(function (targetCheckpoint) {
        if (targetCheckpoint && targetCheckpoint.clientSavedAt >= entry.checkpoint.clientSavedAt) return false;
        return writeSaveForUser(targetUser, entry.gameKey, entry.checkpoint.data, entry.checkpoint.clientSavedAt);
      });
    }));
  }

  function flushPendingSaves() {
    if (window.PuzzleSave && typeof window.PuzzleSave.flushAll === "function") {
      return window.PuzzleSave.flushAll();
    }
    return Promise.resolve();
  }

  function load(gameKey) {
    return ready.then(function (user) {
      const reference = user && getSaveDocument(gameKey);
      if (!reference) return null;
      return getDocument(reference).then(function (snapshot) {
        if (!snapshot.exists()) return null;
        return normalizeRemoteValue(snapshot.data());
      }).catch(function (error) {
        notify("error", "雲端讀取失敗，使用本機存檔");
        console.warn("[PuzzleFirebase] Cannot load save", gameKey, error);
        return null;
      });
    });
  }

  function save(gameKey, data) {
    return ready.then(function (user) {
      if (!user) return false;
      return writeSaveForUser(user, gameKey, data, Date.now()).then(function (saved) {
        if (saved) notify("online", "Firebase 已同步");
        return saved;
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

  function requireCredentials(email, password) {
    if (!email || !email.includes("@")) throw new Error("請輸入有效的 Email。");
    if (!password || password.length < 6) throw new Error("密碼至少需要 6 個字元。");
  }

  function registerAccount(email, password) {
    return ready.then(function () {
      requireCredentials(email, password);
      if (!authApi || !authSdk || !currentUser) throw new Error("Firebase 尚未準備完成，請稍候再試。");
      return flushPendingSaves().then(function () {
        const credential = authSdk.EmailAuthProvider.credential(email, password);
        if (currentUser.isAnonymous) {
          return authSdk.linkWithCredential(currentUser, credential).then(function (result) { return result.user; });
        }
        return authSdk.createUserWithEmailAndPassword(authApi, email, password).then(function (result) { return result.user; });
      }).then(function (user) {
        currentUser = user;
        notify("online", "Firebase 已連線 · 已登入 " + accountLabel(user));
        return user;
      });
    });
  }

  function signInAccount(email, password) {
    return ready.then(function () {
      requireCredentials(email, password);
      if (!authApi || !authSdk || !currentUser) throw new Error("Firebase 尚未準備完成，請稍候再試。");
      const previousUser = currentUser;
      return flushPendingSaves().then(function () {
        return previousUser.isAnonymous ? readAllSavesForUser(previousUser) : [];
      }).then(function (saves) {
        return authSdk.signInWithEmailAndPassword(authApi, email, password).then(function (result) {
          return mergeSavesIntoUser(saves, result.user).then(function () { return result.user; });
        });
      }).then(function (user) {
        currentUser = user;
        notify("online", "Firebase 已連線 · 已登入 " + accountLabel(user));
        return user;
      });
    });
  }

  function signOutAccount() {
    return ready.then(function () {
      if (!authApi || !authSdk) return null;
      return authSdk.signOut(authApi).then(function () {
        return authSdk.signInAnonymously(authApi);
      }).then(function (user) {
        currentUser = user;
        notify("online", "Firebase 已連線 · 匿名存檔");
        return user;
      });
    });
  }

  function formatAuthError(error) {
    if (!error) return "操作失敗，請稍後再試。";
    if (error.message && !error.code) return error.message;
    const messages = {
      "auth/email-already-in-use": "這個 Email 已有帳號，請改用登入。",
      "auth/credential-already-in-use": "這個 Email 已有帳號，請改用登入。",
      "auth/invalid-credential": "Email 或密碼不正確。",
      "auth/invalid-login-credentials": "Email 或密碼不正確。",
      "auth/user-not-found": "找不到這個帳號。",
      "auth/wrong-password": "Email 或密碼不正確。",
      "auth/password-does-not-meet-requirements": "密碼未符合 Firebase 的安全要求。",
      "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
      "auth/network-request-failed": "目前無法連線 Firebase，請確認網路後再試。"
    };
    return messages[error.code] || "操作失敗，請稍後再試。";
  }

  function installAccountUI() {
    if (!configured || !document.body || document.getElementById("puzzle-account-root")) return;
    const styleId = "puzzle-account-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ".puzzle-account{position:fixed;top:16px;right:16px;z-index:12000;color:#e5e7eb;font:500 14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}.puzzle-account__trigger{border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:9px 14px;color:#f8fafc;background:rgba(15,23,42,.88);box-shadow:0 8px 24px rgba(15,23,42,.2);font:700 13px/1 inherit;cursor:pointer}.puzzle-account__panel{box-sizing:border-box;width:min(calc(100vw - 32px),330px);margin-top:10px;padding:18px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:#111827;box-shadow:0 20px 50px rgba(0,0,0,.3)}.puzzle-account__panel[hidden],.puzzle-account__form[hidden],.puzzle-account__logout[hidden]{display:none}.puzzle-account__panel h2{margin:0 0 6px;color:#f8fafc;font-size:18px}.puzzle-account__status,.puzzle-account__hint{margin:0 0 14px;color:#cbd5e1;font-size:12px}.puzzle-account__hint{margin-top:12px;margin-bottom:0;color:#94a3b8}.puzzle-account__form{display:grid;gap:9px}.puzzle-account__form input{box-sizing:border-box;width:100%;border:1px solid #475569;border-radius:9px;padding:10px 11px;color:#f8fafc;background:#1e293b;font:inherit}.puzzle-account__actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.puzzle-account__actions button,.puzzle-account__logout{border:0;border-radius:9px;padding:10px 8px;color:#0f172a;background:#93c5fd;font:700 12px/1.2 inherit;cursor:pointer}.puzzle-account__actions button[data-mode=register]{color:#e2e8f0;background:#334155}.puzzle-account__logout{width:100%;color:#fecaca;background:#451a1a}.puzzle-account__error{min-height:18px;margin:9px 0 0;color:#fca5a5;font-size:12px}.puzzle-account__busy{opacity:.65;pointer-events:none}@media(max-width:500px){.puzzle-account{top:10px;right:10px}}";
      document.head.appendChild(style);
    }

    const root = document.createElement("div");
    root.id = "puzzle-account-root";
    root.className = "puzzle-account";
    root.innerHTML = "<button class=\"puzzle-account__trigger\" type=\"button\">登入雲端</button><section class=\"puzzle-account__panel\" hidden aria-label=\"雲端帳號\"><h2>雲端存檔</h2><p class=\"puzzle-account__status\" data-role=\"status\">正在連線 Firebase…</p><form class=\"puzzle-account__form\"><input data-role=\"email\" type=\"email\" autocomplete=\"email\" placeholder=\"Email\" required><input data-role=\"password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"密碼（至少 6 個字元）\" minlength=\"6\" required><div class=\"puzzle-account__actions\"><button type=\"submit\" data-mode=\"login\">登入</button><button type=\"submit\" data-mode=\"register\">建立帳號</button></div></form><button class=\"puzzle-account__logout\" type=\"button\" hidden>登出帳號</button><p class=\"puzzle-account__hint\">登入後可在其他裝置恢復遊戲進度。</p><p class=\"puzzle-account__error\" data-role=\"error\" aria-live=\"polite\"></p></section></div>";
    document.body.appendChild(root);

    const trigger = root.querySelector(".puzzle-account__trigger");
    const panel = root.querySelector(".puzzle-account__panel");
    const form = root.querySelector(".puzzle-account__form");
    const emailInput = root.querySelector('[data-role="email"]');
    const passwordInput = root.querySelector('[data-role="password"]');
    const statusElement = root.querySelector('[data-role="status"]');
    const errorElement = root.querySelector('[data-role="error"]');
    const logoutButton = root.querySelector(".puzzle-account__logout");

    function render(snapshot) {
      const user = snapshot.user;
      const signedIn = Boolean(user && !user.isAnonymous);
      trigger.textContent = signedIn ? "雲端帳號" : "登入雲端";
      if (signedIn) {
        statusElement.textContent = "已登入：" + accountLabel(user);
      } else if (snapshot.status === "connecting") {
        statusElement.textContent = "正在連線 Firebase…";
      } else if (snapshot.status === "error") {
        statusElement.textContent = "Firebase 暫時無法連線";
      } else {
        statusElement.textContent = "目前是匿名存檔；登入後可跨裝置恢復。";
      }
      form.hidden = signedIn;
      logoutButton.hidden = !signedIn;
    }

    trigger.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorElement.textContent = "";
      const mode = event.submitter && event.submitter.dataset.mode === "register" ? "register" : "login";
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      root.classList.add("puzzle-account__busy");
      const action = mode === "register" ? registerAccount : signInAccount;
      action(email, password).then(function () {
        statusElement.textContent = "登入成功，正在載入雲端進度…";
        window.setTimeout(function () { window.location.reload(); }, 350);
      }).catch(function (error) {
        errorElement.textContent = formatAuthError(error);
      }).finally(function () {
        root.classList.remove("puzzle-account__busy");
      });
    });

    logoutButton.addEventListener("click", function () {
      errorElement.textContent = "";
      root.classList.add("puzzle-account__busy");
      signOutAccount().then(function () {
        window.location.reload();
      }).catch(function (error) {
        errorElement.textContent = formatAuthError(error);
        root.classList.remove("puzzle-account__busy");
      });
    });

    window.PuzzleFirebase.onStatus(render);
  }

  window.PuzzleFirebase = {
    enabled: configured,
    ready: ready,
    load: load,
    save: save,
    clear: clear,
    registerAccount: registerAccount,
    signInAccount: signInAccount,
    signOutAccount: signOutAccount,
    createSyncGate: createSyncGate,
    onStatus: function (listener) {
      listeners.add(listener);
      listener({ status: status, detail: statusDetail, user: currentUser });
      return function () { listeners.delete(listener); };
    },
    getStatus: function () { return { status: status, detail: statusDetail, user: currentUser }; }
  };
  window.PuzzleFirebaseReady = ready;
  installAccountUI();
}());
