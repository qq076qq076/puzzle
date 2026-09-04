import { ASSET_INSETS, CONSUMABLES, DECORATIONS, DECORATION_SCALE, DEVICES, DEVICE_SCALE, FISH_FOOD_BY_ID, FISH_FOODS, HABITATS, HELPERS, PERSONALITY_BY_ID, SPECIES, SPECIES_BY_ID } from "../config/game-config.js";
import { fishHappiness } from "../core/calculations.js";
import { ERROR_MESSAGES } from "../core/game-core.js";
import { missingRequirements, requirementNames } from "../core/unlocks.js";
import { runtimeUrl } from "../phaser/asset-registry.js";

export class UIController {
  constructor(core) {
    this.core = core;
    this.devMode = core.devMode;
    this.snapshot = core.snapshot();
    this.currentTab = "fish";
    this.selected = null;
    this.saver = null;
    this.toastTimer = 0;
    this.bindElements();
    this.bindEvents();
    this.unsubscribe = core.subscribe((snapshot, events) => this.render(snapshot, events));
  }

  setSaver(saver) { this.saver = saver; }

  bindElements() {
    this.elements = {
      coins: byId("coins-value"), gems: byId("gems-value"),
      wafer: byId("wafer-count"), medicine: byId("medicine-count"), shop: byId("shop-panel"), selection: byId("selection-panel"),
      tankName: byId("tank-name"), toast: byId("toast"), offline: byId("offline-report"), dialog: byId("game-dialog"), dialogContent: byId("dialog-content"),
    };
    byId("icon-coin").src = runtimeUrl("ui/coin.png");
    byId("icon-gem").src = runtimeUrl("ui/gem.png");
  }

  bindEvents() {
    document.querySelector(".tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (!button) return;
      this.currentTab = button.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
      this.renderShop();
    });
    document.querySelector(".tool-row").addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "clean") this.runCommand("CLEAN");
      if (action === "wafer") this.runCommand("USE_WAFER");
      if (action === "medicine") this.useMedicineOnSelected();
      if (action === "reward") this.runCommand("OPEN_REWARD");
    });
    this.elements.shop.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-command]");
      if (!button) return;
      this.runCommand(button.dataset.command, { [button.dataset.field]: button.dataset.id });
    });
    this.elements.selection.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-command]");
      if (!button) return;
      const payload = this.selected?.type === "fish" ? { fishId: this.selected.id } : {};
      this.runCommand(button.dataset.command, payload);
    });
    this.elements.selection.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-scale-command]");
      if (!input || !this.selected) return;
      this.runCommand(input.dataset.scaleCommand, { instanceId: this.selected.id, scale: Number(input.value) });
    });
    byId("tank-name-button").addEventListener("click", () => this.renameTank());
    byId("care-journal-button").addEventListener("click", () => this.openCareJournal());
    byId("settings-button").addEventListener("click", () => this.openSettings());
  }

  render(snapshot, events = []) {
    this.snapshot = snapshot;
    this.elements.coins.textContent = this.devMode ? "∞" : formatNumber(snapshot.player.coins);
    this.elements.gems.textContent = formatNumber(snapshot.player.gems);
    this.elements.wafer.textContent = snapshot.inventory.algaeWafers;
    this.elements.medicine.textContent = snapshot.inventory.medicines;
    this.elements.tankName.textContent = snapshot.tank.name;
    this.renderShop();
    this.renderSelection();
    for (const event of events) {
      if (event.type === "saveUrgent") this.saver?.save?.(true);
      if (event.type === "tutorialAdvanced") this.toast(tutorialMessage(event.step));
      if (event.type === "dailyGoalCompleted") this.toast(`每日目標完成：+${event.reward} 金幣`);
      if (event.type === "legendaryFishGranted") this.toast("長期照護里程碑完成：獲得彩虹美人魚魚卵！");
      if (event.type === "launchGiftClaimed") this.toast(`開缸禮物：獲得 ${formatNumber(event.amount)} 金幣！`);
    }
  }

  renderShop() {
    const ownedHelpers = new Set(this.snapshot.tank.helpers.map((item) => item.kind));
    const ownedDevices = new Set(this.snapshot.tank.devices.instances.map((item) => item.catalogId));
    let items;
    if (this.currentTab === "fish") {
      items = SPECIES.filter((item) => item.eggPrice != null).map((item) => card({
        preview: spritePreview(runtimeUrl(`fish/${item.id}/${item.id}-states.png`), "atlas"), title: item.name,
        subtitle: "",
        price: item.eggPrice, missing: this.devMode ? [] : missingRequirements(this.snapshot, item), owned: false, command: "BUY_EGG", field: "speciesId", id: item.id, devMode: this.devMode,
      }));
    } else if (this.currentTab === "helpers") {
      items = HELPERS.map((item) => card({ preview: imagePreview(runtimeUrl(`helpers/${item.id}/${item.id}-idle.png`), ASSET_INSETS.helpers[`${item.id}-idle`]), title: item.name, subtitle: helperDescription(item), price: item.price, missing: this.devMode ? [] : missingRequirements(this.snapshot, item), owned: ownedHelpers.has(item.id), command: "BUY_HELPER", field: "helperId", id: item.id, devMode: this.devMode }));
    } else if (this.currentTab === "devices") {
      items = DEVICES.map((item) => card({ preview: spritePreview(runtimeUrl(`devices/${item.id}/${item.id}-active.png`), "strip", ASSET_INSETS.devices[item.id]), title: item.name, subtitle: deviceDescription(item), price: item.price, missing: this.devMode ? [] : missingRequirements(this.snapshot, item), owned: ownedDevices.has(item.id), command: "BUY_DEVICE", field: "deviceId", id: item.id, devMode: this.devMode }));
    } else if (this.currentTab === "decorations") {
      items = DECORATIONS.map((item) => card({ preview: spritePreview(runtimeUrl(`decorations/${item.id}-animated.png`), "decoration", ASSET_INSETS.decorations[item.id]), title: item.name, subtitle: `吸引力 ${item.appeal}`, price: item.price, missing: this.devMode ? [] : missingRequirements(this.snapshot, item), owned: false, command: "BUY_DECORATION", field: "decorationId", id: item.id, devMode: this.devMode }));
    } else {
      items = this.renderConsumables();
    }
    this.elements.shop.innerHTML = items.join("");
  }

  renderConsumables() {
    const selectedFoodId = this.snapshot.inventory.selectedFishFoodId;
    const foodCards = FISH_FOODS.map((item) => {
      const count = item.price == null ? Infinity : this.snapshot.inventory.fishFoods[item.id] || 0;
      const selected = selectedFoodId === item.id;
      const cannotSelect = !this.devMode && item.price != null && count <= 0;
      const purchase = item.price == null ? "" : `<button type="button" data-command="BUY_CONSUMABLE" data-field="itemId" data-id="${item.id}">${this.devMode ? "免費取得" : `購買 ● ${formatNumber(item.price)}`}</button>`;
      const countLabel = Number.isFinite(count) ? `庫存 ${count}` : "無限供應";
      return consumableCard({
        preview: imagePreview(runtimeUrl("ui/fish-food.png")),
        title: item.name,
        subtitle: `營養值 ${item.nutrition} · ${countLabel}`,
        actions: `${purchase}<button type="button" data-command="SELECT_FOOD" data-field="foodTypeId" data-id="${item.id}" ${selected || cannotSelect ? "disabled" : ""}>${selected ? "使用中" : "選用"}</button>`,
      });
    });
    const utilityCards = CONSUMABLES.filter((item) => item.kind !== "fish-food").map((item) => {
      const missing = this.devMode ? [] : missingRequirements(this.snapshot, item);
      const count = item.kind === "medicine" ? this.snapshot.inventory.medicines : this.snapshot.inventory.algaeWafers;
      const icon = item.kind === "medicine" ? "medicine" : "algae-wafer";
      return consumableCard({
        preview: imagePreview(runtimeUrl(`ui/${icon}.png`)),
        title: item.name,
        subtitle: `庫存 ${count}`,
        actions: `<button type="button" data-command="BUY_CONSUMABLE" data-field="itemId" data-id="${item.id}" ${missing.length ? "disabled" : ""}>${missing.length ? `需 ${requirementNames(missing).join("＋")}` : this.devMode ? "免費取得" : `購買 ● ${formatNumber(item.price)}`}</button>`,
      });
    });
    return [...foodCards, ...utilityCards];
  }

  renderSelection() {
    if (!this.selected) {
      this.elements.selection.hidden = true;
      return;
    }
    if (this.selected.type === "fish") {
      const fish = this.snapshot.tank.fishes.find((item) => item.id === this.selected.id);
      if (!fish || fish.health !== "dead") {
        this.selected = null;
        this.elements.selection.hidden = true;
        return;
      }
      const species = SPECIES_BY_ID[fish.speciesId];
      const reviveRemaining = Math.max(0, 24 * 3_600_000 - (Date.now() - fish.diedAt));
      const canRevive = reviveRemaining > 0;
      const hours = Math.max(1, Math.ceil(reviveRemaining / 3_600_000));
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">已死亡魚隻</span><h2>${escapeHtml(fish.name || species?.name || "魚")}</h2><p>${canRevive ? `可在 ${hours} 小時內花費 3 顆寶石復活` : "已超過復活期限，只能移除"}</p><div class="selection-actions"><button data-command="REVIVE_FISH" ${canRevive ? "" : "disabled"}>復活・◆ 3</button><button data-command="REMOVE_DEAD_FISH">移除</button></div>`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
      return;
    }
    if (this.selected.type === "helper") {
      const helper = this.snapshot.tank.helpers.find((item) => item.id === this.selected.id);
      if (!helper) return;
      const config = HELPERS.find((item) => item.id === helper.kind);
      const collector = config?.role === "coin-collector";
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">HELPER</span><h2>${config?.name}</h2><p>${collector ? "會在線上與離線期間自動收集金幣" : `飽食 ${Math.round(helper.satiety)} / 100`}</p>${collector ? "" : '<button data-command="USE_WAFER">投餵藻錠</button>'}`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
      return;
    }
    if (this.selected.type === "device") {
      const device = this.snapshot.tank.devices.instances.find((item) => item.id === this.selected.id);
      if (!device) return;
      const config = DEVICES.find((item) => item.id === device.catalogId);
      const feeder = config.slot === "feeder";
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">DEVICE</span><h2>${config.name}</h2><p>${feeder ? `料倉 ${device.state.ammo} / ${config.capacity}` : deviceDescription(config)}</p>${scaleControl("RESIZE_DEVICE", device.scale ?? DEVICE_SCALE.default, DEVICE_SCALE)}${feeder ? '<button data-command="REFILL_FEEDER">免費補滿</button>' : ""}`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
      return;
    }
    if (this.selected.type === "decoration") {
      const decoration = this.snapshot.tank.decorations.find((item) => item.id === this.selected.id);
      if (!decoration) { this.selected = null; this.elements.selection.hidden = true; return; }
      const config = DECORATIONS.find((item) => item.id === decoration.catalogId);
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">DECORATION</span><h2>${config?.name}</h2><p>拖曳可改變位置</p>${scaleControl("RESIZE_DECORATION", decoration.scale ?? DECORATION_SCALE.default, DECORATION_SCALE)}`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
    }
  }

  selectFish(id) { this.selected = { type: "fish", id }; this.renderSelection(); }
  selectHelper(id) { this.selected = { type: "helper", id }; this.renderSelection(); }
  selectDevice(id) { this.selected = { type: "device", id }; this.renderSelection(); }
  selectDecoration(id) { this.selected = { type: "decoration", id }; this.renderSelection(); }

  runCommand(type, payload = {}) {
    const result = this.core.dispatch(type, payload);
    if (!result.ok) this.toast(ERROR_MESSAGES[result.errorCode] || result.errorCode);
    return result;
  }

  useMedicineOnSelected() {
    const selected = this.selected?.type === "fish" ? this.snapshot.tank.fishes.find((fish) => fish.id === this.selected.id && fish.health === "sick") : null;
    const target = selected || this.snapshot.tank.fishes.find((fish) => fish.health === "sick");
    if (!target) return this.toast("目前沒有需要治療的魚。");
    this.runCommand("USE_MEDICINE", { fishId: target.id });
  }

  toast(message) {
    window.clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => this.elements.toast.classList.remove("is-visible"), 2600);
  }

  showOfflineReport(report) {
    if (!report || report.elapsedMs < 60_000) return;
    const hours = Math.floor(report.elapsedMs / 3_600_000);
    const minutes = Math.floor((report.elapsedMs % 3_600_000) / 60_000);
    this.elements.offline.innerHTML = `<button type="button" aria-label="關閉">×</button><strong>離線 ${hours} 小時 ${minutes} 分</strong><span>孵化 ${report.hatched} · 長成 ${report.becameAdult} · 自動餵食 ${report.autoFeeds} · 收幣 ${formatNumber(report.coinsCollected)} · 新禮物 ${report.rewardsFound}</span>`;
    this.elements.offline.hidden = false;
    this.elements.offline.querySelector("button").addEventListener("click", () => { this.elements.offline.hidden = true; });
  }

  setSaveStatus(text) { this.saveStatus = text; }

  async renameTank() {
    const value = await this.ask("魚缿名稱", `<input id="dialog-input" maxlength="24" value="${escapeHtml(this.snapshot.tank.name)}" />`);
    if (value != null) this.runCommand("RENAME_TANK", { name: value });
  }

  async openCareJournal() {
    const goals = this.snapshot.quests.items.map((goal) => `<li class="care-goal ${goal.completed ? "is-complete" : ""}"><span>${goal.completed ? "✓" : "○"} ${escapeHtml(goal.label)}</span><strong>${goal.progress}/${goal.target} · ● ${formatNumber(goal.reward)}</strong></li>`).join("");
    const fishes = this.snapshot.tank.fishes.map((fish) => {
      const personality = PERSONALITY_BY_ID[fish.personalityId]?.name || "獨特";
      const food = FISH_FOOD_BY_ID[fish.preferredFoodTypeId]?.name || "基本飼料";
      const habitat = HABITATS[fish.habitatPreference] || "水草";
      const happiness = Math.round(fishHappiness(this.snapshot, fish));
      return `<article class="fish-profile"><header><strong>${escapeHtml(fish.name || SPECIES_BY_ID[fish.speciesId]?.name || "魚")}</strong><span>幸福 ${happiness}</span></header><p>${personality}個性 · 喜歡${food} · 偏好${habitat}</p><p>體型潛力 ${Math.round((fish.sizePotential || 1) * 100)}%</p></article>`;
    }).join("") || '<p class="care-empty">魚缸裡還沒有魚，先從魚卵開始吧。</p>';
    await this.ask("照護日誌", `<section class="care-journal"><h3>今日目標</h3><ul>${goals}</ul><p class="care-total">累計完成 ${formatNumber(this.snapshot.stats.dailyGoalsCompleted)} 個目標</p><h3>魚隻檔案</h3><div class="fish-profile-list">${fishes}</div></section>`, "關閉", false);
  }

  async openSettings() {
    const value = await this.ask("設定", '<label class="setting-check"><input id="dialog-reduced" type="checkbox" /> 降低動態效果</label>', "儲存");
    if (value != null) this.toast("設定已儲存。");
  }

  ask(title, body, confirmLabel = "確認", showCancel = true) {
    this.elements.dialogContent.innerHTML = `<h2>${title}</h2>${body}`;
    byId("dialog-confirm").textContent = confirmLabel;
    byId("dialog-cancel").hidden = !showCancel;
    this.elements.dialog.showModal();
    return new Promise((resolve) => {
      this.elements.dialog.addEventListener("close", () => {
        resolve(this.elements.dialog.returnValue === "default" ? byId("dialog-input")?.value ?? "ok" : null);
      }, { once: true });
    });
  }
}

function card({ preview, title, subtitle, price, missing = [], owned, command, field, id, devMode = false }) {
  const locked = missing.length > 0;
  const disabled = locked || owned;
  const missingLabel = requirementNames(missing).join("＋");
  const availableLabel = devMode ? command === "BUY_EGG" ? "生成成魚" : "免費使用" : `● ${formatNumber(price)}`;
  return `<article class="shop-card"><div class="shop-art">${preview}</div><div><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button type="button" data-command="${command}" data-field="${field}" data-id="${id}" ${disabled ? "disabled" : ""}>${locked ? `需 ${missingLabel}` : owned ? "已擁有" : availableLabel}</button></article>`;
}

function consumableCard({ preview, title, subtitle, actions }) {
  return `<article class="shop-card"><div class="shop-art">${preview}</div><div><h3>${title}</h3><p>${subtitle}</p></div><div class="shop-card__actions">${actions}</div></article>`;
}

function spritePreview(url, layout, inset) { return `<span class="sprite-preview sprite-preview--${layout}" style="background-image:url('${url}');${clipStyle(inset)}"></span>`; }
function imagePreview(url, inset) { return `<img class="single-preview" src="${url}" alt="" style="${clipStyle(inset)}" />`; }
function clipStyle(inset) { return inset ? `clip-path:inset(${inset.top || 0}px 0 ${inset.bottom || 0}px 0)` : ""; }
function deviceDescription(item) {
  if (item.reduction) return `清潔衰減 -${item.reduction * 100}%`;
  if (item.capacity) return `料倉 ${item.capacity} 份`;
  if (item.growthMultiplier) return "成長速度 +10%";
  return "阻止新的低水質疾病";
}
function helperDescription(item) { return item.role === "coin-collector" ? "自動收集線上與離線金幣" : `清潔衰減 -${item.reduction * 100}%`; }
function scaleControl(command, value, range) {
  return `<label class="meter"><span>大小 ${Number(value).toFixed(2)}×</span><input type="range" min="${range.min}" max="${range.max}" step="0.05" value="${value}" data-scale-command="${command}" /></label>`;
}
function tutorialMessage(step) { return step === "complete" ? "新手引導完成！獲得水榕。" : "新手任務進展，獎勵已領取。"; }
function formatNumber(value) { return new Intl.NumberFormat("zh-TW").format(Math.floor(Number(value) || 0)); }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
function byId(id) { return document.getElementById(id); }
