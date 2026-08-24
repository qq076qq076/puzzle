import { BUFFS } from "../data/buffs.js";
import Phaser from "phaser";
import { getDungeonAudio } from "../systems/audio-system.js";
import { getBuffStack } from "../systems/buff-system.js";
import { makeTouchOnlyButton } from "./input.js";
import { moveMenuSelection } from "./menu-selection.js";

export function createCombatHud(scene, options = {}) {
  const hud = {
    avatar: scene.add.image(30, 36, "provided-player").setScale(1.35).setScrollFactor(0).setDepth(110),
    health: scene.add.text(58, 18, "HP 100/100", scene.hudStyle(12, "#f5f1da")).setScrollFactor(0).setDepth(110),
    healthBarBack: scene.add.rectangle(58, 48, 168, 10, 0x151722, 0.96).setOrigin(0, 0.5).setStrokeStyle(2, 0x69718d, 0.95).setScrollFactor(0).setDepth(109),
    healthBarFill: scene.add.rectangle(60, 48, 164, 6, 0x77bd88, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(110),
    buffs: scene.add.text(24, 496, "BUFFS —", scene.hudStyle(10, "#b9a9d4")).setScrollFactor(0).setDepth(110),
    gold: scene.add.text(590, 496, "GOLD 0", scene.hudStyle(10, "#dfb84f")).setOrigin(0, 1).setScrollFactor(0).setDepth(110),
    potionIcon: scene.add.image(734, 486, "potion-icon").setScale(2).setScrollFactor(0).setDepth(110),
    potion: scene.add.text(750, 496, "POTION 0 [Q]", scene.hudStyle(10, "#77bd88")).setOrigin(0, 1).setScrollFactor(0).setDepth(110),
  };
  const audio = scene.audio || getDungeonAudio();
  hud.soundButton = makeTouchOnlyButton(scene, 920, 30, 40, 32, audio.enabled ? "🔊" : "🔇", () => {
    audio.toggle();
    updateSoundIcon(hud, audio.enabled);
    options.onSound?.(audio.enabled);
  }, {
    color: 0x20283b,
    strokeColor: 0x69718d,
    fontSize: "18px",
    depth: 112,
  });
  updateSoundIcon(hud, audio.enabled);
  return hud;
}

export function updateSoundIcon(hud, enabled) {
  if (!hud?.soundButton) return;
  hud.soundButton.text.setText(enabled ? "🔊" : "🔇");
  hud.soundButton.background.setAlpha(enabled ? 1 : 0.58);
}

export function updateCombatHud(hud, player) {
  if (!hud || !player) return;
  hud.health.setText(`HP ${Math.ceil(player.health)}/${player.maxHealth}`);
  const healthRatio = Phaser.Math.Clamp(player.health / Math.max(1, player.maxHealth), 0, 1);
  hud.healthBarFill.setScale(healthRatio, 1).setVisible(healthRatio > 0);
  hud.healthBarFill.setFillStyle(healthRatio > 0.5 ? 0x77bd88 : healthRatio > 0.25 ? 0xdfb84f : 0xe17b70, 1);
  const buffNames = player.buffs.map((id) => `${BUFFS[id]?.name ?? id}×${getBuffStack(player, id)}`).filter((value, index, all) => all.indexOf(value) === index);
  hud.buffs.setText(buffNames.length ? `BUFFS ${buffNames.join(" · ")}` : "BUFFS —");
  hud.gold.setText(`GOLD ${player.gold || 0}`);
  hud.potion.setText(`POTION ${player.consumables || 0} [Q]`);
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
  group.add(scene.add.rectangle(480, 270, 620, 360, 0x080a11, 0.96).setStrokeStyle(2, 0xdfb84f, 0.95));
  group.add(scene.add.text(480, 136, "PAUSED", scene.hudStyle(30, "#dfb84f")).setOrigin(0.5));
  group.add(scene.add.text(480, 194, "↑／↓ 或 W／S 選擇 · Enter／Space 確認 · Esc 返回", scene.hudStyle(10, "#77798a")).setOrigin(0.5));

  const menuItems = [
    { label: "繼續遊戲", color: 0x303a55, strokeColor: 0x9aa2c1, action: callbacks.onResume },
    { label: "重新開始", color: 0x4c303d, strokeColor: 0xe17b70, action: callbacks.onRestart },
  ];
  let selectedIndex = 0;
  const buttons = [];

  const updateSelection = () => {
    buttons.forEach((button, index) => {
      const item = menuItems[index];
      const selected = index === selectedIndex;
      button.background.setFillStyle(selected ? 0x4b526f : item.color, 1);
      button.background.setStrokeStyle(selected ? 4 : 2, selected ? 0xf5f1da : item.strokeColor, 0.98);
      button.text.setText(`${selected ? "▶" : " "} ${item.label}`).setColor(selected ? "#f6d36c" : "#f5f1da");
    });
  };

  const activate = (index) => {
    if (!menuItems[index]) return false;
    selectedIndex = index;
    updateSelection();
    menuItems[index].action?.();
    return true;
  };

  menuItems.forEach((item, index) => {
    const button = makeTouchOnlyButton(scene, 480, 286 + index * 72, 260, 48, item.label, () => activate(index), {
      color: item.color,
      strokeColor: item.strokeColor,
      depth: 262,
    });
    buttons.push(button);
    group.add([button.background, button.text]);
  });
  updateSelection();

  return {
    container: group,
    get selectedIndex() {
      return selectedIndex;
    },
    moveSelection(direction) {
      selectedIndex = moveMenuSelection(selectedIndex, direction, menuItems.length);
      updateSelection();
      return selectedIndex;
    },
    activateSelection() {
      return activate(selectedIndex);
    },
    destroy() {
      group.destroy(true);
    },
  };
}
