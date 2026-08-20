(function initHarvestSaveResolution(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HarvestSaveResolution = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createHarvestSaveResolution() {
  "use strict";

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function inferredSyncedRevision(checkpoint) {
    if (!checkpoint) return 0;
    if (checkpoint.syncedRevision != null && Number.isFinite(Number(checkpoint.syncedRevision))) {
      return Math.max(0, number(checkpoint.syncedRevision));
    }
    const revision = Math.max(0, number(checkpoint.revision));
    const serverSavedAt = number(checkpoint.serverSavedAt);
    const savedAt = number(checkpoint.savedAt);
    return number(checkpoint.serverRevision) > 0 && serverSavedAt > 0 && savedAt === serverSavedAt ? revision : 0;
  }

  function hasUnsyncedLocalChanges(checkpoint) {
    return Boolean(checkpoint && number(checkpoint.revision) > inferredSyncedRevision(checkpoint));
  }

  function sameData(left, right) {
    if (!left || !right) return false;
    try { return JSON.stringify(left.data) === JSON.stringify(right.data); } catch (error) { return false; }
  }

  function compareFreshness(left, right) {
    for (const key of ["serverRevision", "serverSavedAt", "clientSavedAt", "savedAt", "revision"]) {
      const difference = number(left?.[key]) - number(right?.[key]);
      if (difference) return difference > 0 ? 1 : -1;
    }
    return 0;
  }

  function resolveBootstrapCheckpoint(local, remote) {
    if (!local && !remote) return { source: "new", checkpoint: null, reason: "no-save" };
    if (!remote) return { source: "local", checkpoint: local, reason: "local-only" };
    if (!local) return { source: "remote", checkpoint: remote, reason: "remote-only" };
    if (sameData(local, remote)) {
      const useRemote = compareFreshness(remote, local) >= 0;
      return { source: useRemote ? "remote" : "local", checkpoint: useRemote ? remote : local, reason: "same-data" };
    }

    const localServerRevision = number(local.serverRevision);
    const remoteServerRevision = number(remote.serverRevision);
    const localIsDirty = hasUnsyncedLocalChanges(local);

    if (remoteServerRevision > localServerRevision) {
      if (localIsDirty) return { source: "conflict", checkpoint: null, reason: "both-changed" };
      return { source: "remote", checkpoint: remote, reason: "cloud-advanced" };
    }
    if (localServerRevision > remoteServerRevision) {
      return { source: "local", checkpoint: local, reason: "local-has-newer-cloud-base" };
    }
    if (localServerRevision === 0 && localIsDirty && compareFreshness(remote, local) > 0) {
      return { source: "conflict", checkpoint: null, reason: "legacy-both-changed" };
    }
    if (localIsDirty) return { source: "local", checkpoint: local, reason: "local-unsynced" };

    const useRemote = compareFreshness(remote, local) >= 0;
    return { source: useRemote ? "remote" : "local", checkpoint: useRemote ? remote : local, reason: "newer-checkpoint" };
  }

  return Object.freeze({
    inferredSyncedRevision,
    hasUnsyncedLocalChanges,
    compareFreshness,
    resolveBootstrapCheckpoint
  });
}));
