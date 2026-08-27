import Phaser from "phaser";
import "../style.css";
import "./integration/shared-runtime.js";
import { GameCore } from "./core/game-core.js";
import { createSaveAdapter } from "./integration/save-adapter.js";
import { acquireWriter } from "./integration/writer-lock.js";
import { createPhaserConfig } from "./phaser/phaser-config.js";
import { UIController } from "./ui/ui-controller.js";

const writerBlock = document.getElementById("writer-block");
let started = false;

attemptStart();

async function attemptStart() {
  if (started) return;
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
  try {
    const game = new Phaser.Game(createPhaserConfig(core, ui));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) game.scene.pause("aquarium");
      else game.scene.resume("aquarium");
    });
  } catch (error) {
    console.error("[Aquarium] WebGL startup failed", error);
    document.getElementById("aquarium-stage").innerHTML = '<section class="renderer-error"><h2>無法啟動水族箱</h2><p>請確認瀏覽器已啟用 WebGL 或更新瀏覽器後重試。</p></section>';
  }
  window.addEventListener("pagehide", () => writer.release(), { once: true });
}
