import test from "node:test";
import assert from "node:assert/strict";

import { createSaveAdapter } from "../src/integration/save-adapter.js";

test("save adapter automatically restores progress before startup", async () => {
  let receivedOptions;
  const statuses = [];
  const controller = { save() {}, clear() {}, ready: Promise.resolve() };
  globalThis.window = {
    PuzzleSave: {
      create(options) {
        receivedOptions = options;
        return controller;
      },
    },
    PuzzleFirebase: {
      onStatus(listener) {
        listener({ status: "online" });
      },
    },
  };

  const core = {
    reset() {},
    replaceState() { return {}; },
    snapshot() { return { tank: { fishes: [] } }; },
  };
  const ui = {
    setSaveStatus(status) { statuses.push(status); },
    showOfflineReport() {},
    toast() {},
  };

  try {
    assert.equal(createSaveAdapter(core, ui), controller);
    assert.equal(receivedOptions.key, "happy-aquarium");
    assert.equal(receivedOptions.autoRestore, true);
    assert.deepEqual(statuses, ["雲端已同步"]);
    await controller.ready;
  } finally {
    delete globalThis.window;
  }
});
