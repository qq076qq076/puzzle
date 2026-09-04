import { isValidCheckpoint } from "../core/state.js";

export function createSaveAdapter(core, ui) {
  const controller = window.PuzzleSave.create({
    key: "happy-aquarium",
    description: "找到上次照顧水族箱的進度。",
    fresh: () => core.reset(),
    restore: (data) => {
      const report = core.replaceState(data, { offline: true });
      queueMicrotask(() => ui.showOfflineReport(report));
    },
    validate: isValidCheckpoint,
    getState: () => core.snapshot(),
    hasProgress: (data) => Boolean(data?.achievements?.launchGiftClaimed || data?.achievements?.balanceReset20260904Claimed || data?.tank?.fishes?.length || data?.stats?.eggsBought || data?.transactions?.recentIds?.length),
    autoRestore: true,
    interval: 2000,
    cloudInterval: 5000,
    onConflict: (remoteCheckpoint) => {
      try { localStorage.setItem(`puzzle-club-save:happy-aquarium:recovery:${Date.now()}`, JSON.stringify(core.snapshot())); } catch { /* Best effort. */ }
      ui.setSaveStatus("同步衝突");
      ui.toast("其他裝置已有較新進度，已停止雲端寫入。請重新載入。");
      console.warn("[Aquarium] Cloud save conflict", remoteCheckpoint?.serverRevision);
    },
  });
  if (window.PuzzleFirebase?.onStatus) {
    window.PuzzleFirebase.onStatus(({ status }) => ui.setSaveStatus(status === "online" ? "雲端已同步" : ["local", "error"].includes(status) ? "本機存檔" : "雲端連線中"));
  }
  return controller;
}
