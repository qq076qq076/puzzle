import Phaser from "phaser";
import "../style.css";
import { GameCore } from "./core/game-core.js";
import { createFreshState } from "./core/state.js";
import { createSaveAdapter } from "./integration/save-adapter.js";
import { acquireWriter } from "./integration/writer-lock.js";
import { createPhaserConfig } from "./phaser/phaser-config.js";
import { UIController } from "./ui/ui-controller.js";

const writerBlock = document.getElementById("writer-block");
const devMode = new URLSearchParams(window.location.search).get("dev") === "true";
let started = false;

if (devMode) startDevelopmentMode();
else attemptStart();

function startDevelopmentMode() {
  const state = createFreshState();
  state.inventory = Object.fromEntries(Object.keys(state.inventory).map((key) => [key, 999]));
  state.tutorial = { step: "complete", firstEggOverrideConsumed: true, claimedRewardIds: [] };
  const core = new GameCore(state, { devMode: true });
  const ui = new UIController(core);
  ui.setSaveStatus("開發模式・不儲存");
  startGame(core, ui);
}

async function attemptStart() {
  if (started) return;
  await import("./integration/shared-runtime.js");
  const writer = await acquireWriter();
  if (!writer.acquired) {
    writerBlock.hidden = false;
    window.setTimeout(attemptStart, 3000);
    return;
  }
  started = true;
  writerBlock.hidden = true;
  const core = new GameCore();
  const ui = new UIController(core);
  const saver = createSaveAdapter(core, ui);
  ui.setSaver(saver);
  await saver.ready;
  core.claimBalanceReset20260904();
  core.claimLaunchGift();
  startGame(core, ui, writer);
}

function startGame(core, ui, writer = null) {
  try {
    const game = new Phaser.Game(createPhaserConfig(core, ui));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) game.scene.pause("aquarium");
      else game.scene.resume("aquarium");
    });
  } catch (error) {
    console.error("[Aquarium] Startup failed", error);
    document.getElementById("aquarium-stage").innerHTML = '<section class="renderer-error"><h2>無法啟動水族箱</h2><p>請確認網路與 WebGL 可用，或更新瀏覽器後重試。</p></section>';
  }
  if (writer) window.addEventListener("pagehide", () => writer.release(), { once: true });
}
