import test from "node:test";
import assert from "node:assert/strict";

await import("./save-resolution.js");
const { inferredSyncedRevision, hasUnsyncedLocalChanges, resolveBootstrapCheckpoint } = globalThis.HarvestSaveResolution;

function checkpoint(overrides = {}) {
  return {
    savedAt: 100,
    clientSavedAt: 100,
    serverSavedAt: 100,
    serverRevision: 3,
    revision: 7,
    syncedRevision: 7,
    data: { gold: 10 },
    ...overrides
  };
}

test("沒有存檔時建立新農場，只有單側存檔時直接採用", () => {
  const local = checkpoint();
  const remote = checkpoint({ data: { gold: 20 } });
  assert.equal(resolveBootstrapCheckpoint(null, null).source, "new");
  assert.equal(resolveBootstrapCheckpoint(local, null).source, "local");
  assert.equal(resolveBootstrapCheckpoint(null, remote).source, "remote");
});

test("本機沒有未同步變更且雲端已前進時自動載入雲端", () => {
  const local = checkpoint();
  const remote = checkpoint({ serverRevision: 4, revision: 8, syncedRevision: 8, data: { gold: 30 } });
  const result = resolveBootstrapCheckpoint(local, remote);
  assert.equal(result.source, "remote");
  assert.equal(result.checkpoint.data.gold, 30);
});

test("本機與雲端都從共同版本前進時回報衝突", () => {
  const local = checkpoint({ revision: 8, syncedRevision: 7, data: { gold: 15 } });
  const remote = checkpoint({ serverRevision: 4, revision: 9, syncedRevision: 9, data: { gold: 30 } });
  assert.equal(hasUnsyncedLocalChanges(local), true);
  assert.equal(resolveBootstrapCheckpoint(local, remote).source, "conflict");
});

test("雲端仍是共同版本時保留本機未同步操作", () => {
  const local = checkpoint({ revision: 8, syncedRevision: 7, clientSavedAt: 120, savedAt: 120, data: { gold: 15 } });
  const remote = checkpoint({ data: { gold: 10 } });
  assert.equal(resolveBootstrapCheckpoint(local, remote).source, "local");
});

test("舊版存檔可由伺服器時間推斷最後同步版本", () => {
  const legacySynced = checkpoint({ syncedRevision: undefined });
  const legacyDirty = checkpoint({ syncedRevision: undefined, savedAt: 130 });
  assert.equal(inferredSyncedRevision(legacySynced), 7);
  assert.equal(hasUnsyncedLocalChanges(legacySynced), false);
  assert.equal(inferredSyncedRevision(legacyDirty), 0);
  assert.equal(hasUnsyncedLocalChanges(legacyDirty), true);
});

test("資料相同時不製造衝突並採用較新的雲端封包", () => {
  const local = checkpoint({ revision: 8, syncedRevision: 7 });
  const remote = checkpoint({ serverRevision: 4, revision: 9, syncedRevision: 9 });
  assert.equal(resolveBootstrapCheckpoint(local, remote).source, "remote");
});
