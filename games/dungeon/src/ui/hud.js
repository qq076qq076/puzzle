import { BUFFS } from "../data/buffs.js";
import { getDungeonAudio } from "../systems/audio-system.js";
import { getBuffStack } from "../systems/buff-system.js";
import { makeTouchOnlyButton } from "./input.js";

export function createCombatHud(scene, options = {}) {
  const hud = {
    avatar: scene.add.image(30, 54, "provided-player").setScale(2.2).setScrollFactor(0).setDepth(110),
    room: scene.add.text(58, 20, options.roomLabel || "FLOOR 1 · ROOM 1/6", scene.hudStyle(14, "#dfb84f")).setScrollFactor(0).setDepth(110),
    health: scene.add.text(58, 48, "HP 100/100", scene.hudStyle(12, "#f5f1da")).setScrollFactor(0).setDepth(110),
    status: scene.add.text(58, 70, "房間準備中", scene.hudStyle(10, "#aaa8b5")).setScrollFactor(0).setDepth(110),
    seed: scene.add.text(480, 20, `SEED ${options.seed || "—"}`, scene.hudStyle(10, "#77798a")).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110),
    dodge: scene.add.text(936, 64, "DODGE READY", scene.hudStyle(10, "#82a8d8")).setOrigin(1, 0).setScrollFactor(0).setDepth(110),
    buffs: scene.add.text(24, 496, "BUFFS —", scene.hudStyle(10, "#b9a9d4")).setScrollFactor(0).setDepth(110),
    inventory: scene.add.text(590, 496, "GOLD 0 · POTION 0", scene.hudStyle(10, "#dfb84f")).setOrigin(0, 1).setScrollFactor(0).setDepth(110),
  };
  const audio = scene.audio || getDungeonAudio();
  hud.pauseButton = makeTouchOnlyButton(scene, 778, 30, 72, 28, "PAUSE", () => options.onPause?.(), {
    color: 0x20283b,
    strokeColor: 0x69718d,
    fontSize: "9px",
    depth: 112,
  });
  hud.soundButton = makeTouchOnlyButton(scene, 872, 30, 72, 28, audio.enabled ? "SOUND" : "MUTE", () => {
    audio.toggle();
    hud.soundButton.text.setText(audio.enabled ? "SOUND" : "MUTE");
    options.onSound?.(audio.enabled);
  }, {
    color: 0x20283b,
    strokeColor: 0x69718d,
    fontSize: "9px",
    depth: 112,
  });
  hud.buffButton = makeTouchOnlyButton(scene, 690, 30, 66, 28, "BUFFS", () => options.onBuff?.(), {
    color: 0x352c50,
    strokeColor: 0xb9a9d4,
    fontSize: "9px",
    depth: 112,
  });
  return hud;
}

export function updateCombatHud(hud, player, options = {}) {
  if (!hud || !player) return;
  hud.health.setText(`HP ${Math.ceil(player.health)}/${player.maxHealth}`);
  const dodgeReady = player.dodgeCooldownRemaining <= 0;
  hud.dodge.setText(dodgeReady ? "DODGE READY" : `DODGE ${(player.dodgeCooldownRemaining / 1000).toFixed(1)}s`);
  hud.dodge.setColor(dodgeReady ? "#82a8d8" : "#77798a");
  const buffNames = player.buffs.map((id) => `${BUFFS[id]?.name ?? id}×${getBuffStack(player, id)}`).filter((value, index, all) => all.indexOf(value) === index);
  hud.buffs.setText(buffNames.length ? `BUFFS ${buffNames.join(" · ")}` : "BUFFS —");
  hud.inventory.setText(`GOLD ${player.gold || 0} · POTION ${player.consumables || 0}`);
  if (options.status) hud.status.setText(options.status);
  if (options.roomLabel) hud.room.setText(options.roomLabel);
  if (options.seed) hud.seed.setText(`SEED ${options.seed}`);
}

export function toggleBuffPanel(scene, hud, player) {
  if (hud.buffPanel) {
    hud.buffPanel.destroy(true);
    hud.buffPanel = null;
    return;
  }
  hud.buffPanel = scene.add.container(0, 0).setDepth(240).setScrollFactor(0);
  hud.buffPanel.add(scene.add.rectangle(480, 280, 690, 330, 0x0b0d16, 0.97).setStrokeStyle(2, 0xb9a9d4, 0.95));
  hud.buffPanel.add(scene.add.text(480, 142, "當局 Buff", scene.hudStyle(22, "#f5f1da")).setOrigin(0.5));
  const rows = player.buffs.length ? player.buffs.filter((id, index, all) => all.indexOf(id) === index) : [];
  if (!rows.length) {
    hud.buffPanel.add(scene.add.text(480, 270, "尚未取得 Buff", scene.hudStyle(14, "#aaa8b5")).setOrigin(0.5));
  } else {
    rows.forEach((id, index) => {
      const buff = BUFFS[id];
      const y = 194 + index * 34;
      hud.buffPanel.add(scene.add.text(175, y, `${buff.name} ×${getBuffStack(player, id)}/${buff.maxStacks}`, scene.hudStyle(12, "#b9a9d4")).setOrigin(0, 0.5));
      hud.buffPanel.add(scene.add.text(470, y, buff.description, scene.hudStyle(11, "#f5f1da")).setOrigin(0, 0.5));
    });
  }
  const close = makeTouchOnlyButton(scene, 480, 420, 150, 38, "關閉 · B", () => toggleBuffPanel(scene, hud, player), {
    color: 0x303a55,
    strokeColor: 0x9aa2c1,
    depth: 242,
    fontSize: "11px",
  });
  hud.buffPanel.add(close.background);
  hud.buffPanel.add(close.text);
}

export function createPauseOverlay(scene, callbacks = {}) {
  const group = scene.add.container(0, 0).setDepth(260).setScrollFactor(0);
  group.add(scene.add.rectangle(480, 270, 620, 300, 0x080a11, 0.96).setStrokeStyle(2, 0xdfb84f, 0.95));
  group.add(scene.add.text(480, 175, "PAUSED", scene.hudStyle(30, "#dfb84f")).setOrigin(0.5));
  group.add(scene.add.text(480, 222, "戰鬥計時與敵人 AI 已暫停", scene.hudStyle(12, "#aaa8b5")).setOrigin(0.5));
  const resume = makeTouchOnlyButton(scene, 380, 330, 180, 44, "繼續遊戲", () => callbacks.onResume?.(), {
    color: 0x303a55,
    strokeColor: 0x9aa2c1,
    depth: 262,
  });
  const restart = makeTouchOnlyButton(scene, 580, 330, 180, 44, "重新開始", () => callbacks.onRestart?.(), {
    color: 0x4c303d,
    strokeColor: 0xe17b70,
    depth: 262,
  });
  group.add([resume.background, resume.text, restart.background, restart.text]);
  return group;
}
