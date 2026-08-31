import { ASSET_INSETS, DECORATIONS, DEVICES, HELPERS, SPECIES, SPECIES_BY_ID } from "../config/game-config.js";
import { fishSellPrice } from "../core/calculations.js";
import { ERROR_MESSAGES } from "../core/game-core.js";
import { missingRequirements, requirementNames } from "../core/unlocks.js";
import { runtimeUrl } from "../phaser/asset-registry.js";

export class UIController {
  constructor(core) {
    this.core = core;
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
      clean: byId("clean-progress"), cleanLabel: byId("clean-label"), fishCount: byId("fish-count-label"), save: byId("save-status"),
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
    byId("tank-name-button").addEventListener("click", () => this.renameTank());
    byId("settings-button").addEventListener("click", () => this.openSettings());
  }

  render(snapshot, events = []) {
    this.snapshot = snapshot;
    this.elements.coins.textContent = formatNumber(snapshot.player.coins);
    this.elements.gems.textContent = formatNumber(snapshot.player.gems);
    this.elements.clean.value = snapshot.tank.cleanliness;
    this.elements.cleanLabel.textContent = Math.round(snapshot.tank.cleanliness);
    this.elements.fishCount.textContent = `${snapshot.tank.fishes.length} 隻魚`;
    this.elements.wafer.textContent = snapshot.inventory.algaeWafers;
    this.elements.medicine.textContent = snapshot.inventory.medicines;
    this.elements.tankName.textContent = snapshot.tank.name;
    this.renderShop();
    this.renderSelection();
    for (const event of events) {
      if (event.type === "saveUrgent") this.saver?.save?.(true);
      if (event.type === "tutorialAdvanced") this.toast(tutorialMessage(event.step));
    }
  }

  renderShop() {
    const ownedHelpers = new Set(this.snapshot.tank.helpers.map((item) => item.kind));
    const ownedDevices = new Set(this.snapshot.tank.devices.instances.map((item) => item.catalogId));
    let items;
    if (this.currentTab === "fish") {
      items = SPECIES.filter((item) => item.eggPrice != null).map((item) => card({
        preview: spritePreview(runtimeUrl(`fish/${item.id}/${item.id}-states.png`), "atlas"), title: item.name,
        subtitle: `${Math.round(item.growthMs / 60_000)} 分鐘 · 成魚 ${formatNumber(item.adultSellPrice)}`,
        price: item.eggPrice, missing: missingRequirements(this.snapshot, item), owned: false, command: "BUY_EGG", field: "speciesId", id: item.id,
      }));
    } else if (this.currentTab === "helpers") {
      items = HELPERS.map((item) => card({ preview: imagePreview(runtimeUrl(`helpers/${item.id}/${item.id}-idle.png`), ASSET_INSETS.helpers[`${item.id}-idle`]), title: item.name, subtitle: `清潔衰減 -${item.reduction * 100}%`, price: item.price, missing: missingRequirements(this.snapshot, item), owned: ownedHelpers.has(item.id), command: "BUY_HELPER", field: "helperId", id: item.id }));
    } else if (this.currentTab === "devices") {
      items = DEVICES.map((item) => card({ preview: spritePreview(runtimeUrl(`devices/${item.id}/${item.id}-active.png`), "strip", ASSET_INSETS.devices[item.id]), title: item.name, subtitle: deviceDescription(item), price: item.price, missing: missingRequirements(this.snapshot, item), owned: ownedDevices.has(item.id), command: "BUY_DEVICE", field: "deviceId", id: item.id }));
    } else {
      items = DECORATIONS.map((item) => card({ preview: imagePreview(runtimeUrl(`decorations/${item.id}.png`), ASSET_INSETS.decorations[item.id]), title: item.name, subtitle: `吸引力 ${item.appeal}`, price: item.price, missing: missingRequirements(this.snapshot, item), owned: false, command: "BUY_DECORATION", field: "decorationId", id: item.id }));
    }
    this.elements.shop.innerHTML = items.join("");
  }

  renderSelection() {
    if (!this.selected) {
      this.elements.selection.hidden = true;
      return;
    }
    if (this.selected.type === "fish") {
      const fish = this.snapshot.tank.fishes.find((item) => item.id === this.selected.id);
      if (!fish) { this.selected = null; this.elements.selection.hidden = true; return; }
      const species = SPECIES_BY_ID[fish.speciesId];
      const price = fishSellPrice(fish);
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">SELECTED FISH</span><h2>${escapeHtml(fish.name)}</h2><p>${species.name} · ${stageName(fish.stage)} · ${healthName(fish.health)}</p><div class="meter"><span>飽食 ${Math.round(fish.satiety)}</span><progress max="100" value="${fish.satiety}"></progress></div><div class="meter"><span>成長 ${Math.floor(fish.growth)}%</span><progress max="100" value="${fish.growth}"></progress></div><div class="selection-actions">${fish.health === "sick" ? '<button data-command="USE_MEDICINE">使用藥水</button>' : ""}${fish.health === "dead" ? '<button data-command="REVIVE_FISH">3 寶石復活</button>' : ""}${fish.growth < 100 && fish.health !== "dead" ? '<button data-command="ACCELERATE_FISH">1 寶石加速</button>' : ""}${price > 0 ? `<button class="danger" data-command="SELL_FISH">出售 ${formatNumber(price)}</button>` : ""}</div>`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
      return;
    }
    if (this.selected.type === "helper") {
      const helper = this.snapshot.tank.helpers.find((item) => item.id === this.selected.id);
      if (!helper) return;
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">CLEANING HELPER</span><h2>${HELPERS.find((item) => item.id === helper.kind)?.name}</h2><p>飽食 ${Math.round(helper.satiety)} / 100</p><button data-command="USE_WAFER">投餵藻錠</button>`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
      return;
    }
    if (this.selected.type === "device") {
      const device = this.snapshot.tank.devices.instances.find((item) => item.id === this.selected.id);
      if (!device) return;
      const config = DEVICES.find((item) => item.id === device.catalogId);
      const feeder = config.slot === "feeder";
      this.elements.selection.innerHTML = `<button class="selection-close" type="button" data-close>×</button><span class="eyebrow">DEVICE</span><h2>${config.name}</h2><p>${feeder ? `料倉 ${device.state.ammo} / ${config.capacity}` : deviceDescription(config)}</p>${feeder ? '<button data-command="REFILL_FEEDER">免費補滿</button>' : ""}`;
      this.elements.selection.querySelector("[data-close]").addEventListener("click", () => { this.selected = null; this.renderSelection(); });
      this.elements.selection.hidden = false;
    }
  }

  selectFish(id) { this.selected = { type: "fish", id }; this.renderSelection(); }
  selectHelper(id) { this.selected = { type: "helper", id }; this.renderSelection(); }
  selectDevice(id) { this.selected = { type: "device", id }; this.renderSelection(); }

  runCommand(type, payload = {}) {
    const result = this.core.dispatch(type, payload);
    if (!result.ok) this.toast(ERROR_MESSAGES[result.errorCode] || result.errorCode);
    return result;
  }

  useMedicineOnSelected() {
    if (this.selected?.type !== "fish") return this.toast("請先點選一隻生病的魚。");
    this.runCommand("USE_MEDICINE", { fishId: this.selected.id });
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
    this.elements.offline.innerHTML = `<button type="button" aria-label="關閉">×</button><strong>離線 ${hours} 小時 ${minutes} 分</strong><span>孵化 ${report.hatched} · 長成 ${report.becameAdult} · 自動餵食 ${report.autoFeeds} · 新禮物 ${report.rewardsFound}</span>`;
    this.elements.offline.hidden = false;
    this.elements.offline.querySelector("button").addEventListener("click", () => { this.elements.offline.hidden = true; });
  }

  setSaveStatus(text) { this.elements.save.textContent = text; }

  async renameTank() {
    const value = await this.ask("魚缿名稱", `<input id="dialog-input" maxlength="24" value="${escapeHtml(this.snapshot.tank.name)}" />`);
    if (value != null) this.runCommand("RENAME_TANK", { name: value });
  }

  async openSettings() {
    const value = await this.ask("設定", '<label class="setting-check"><input id="dialog-reduced" type="checkbox" /> 降低動態效果</label>', "儲存");
    if (value != null) this.toast("設定已儲存。");
  }

  ask(title, body, confirmLabel = "確認") {
    this.elements.dialogContent.innerHTML = `<h2>${title}</h2>${body}`;
    byId("dialog-confirm").textContent = confirmLabel;
    this.elements.dialog.showModal();
    return new Promise((resolve) => {
      this.elements.dialog.addEventListener("close", () => {
        resolve(this.elements.dialog.returnValue === "default" ? byId("dialog-input")?.value ?? "ok" : null);
      }, { once: true });
    });
  }
}

function card({ preview, title, subtitle, price, missing = [], owned, command, field, id }) {
  const locked = missing.length > 0;
  const disabled = locked || owned;
  const missingLabel = requirementNames(missing).join("＋");
  return `<article class="shop-card"><div class="shop-art">${preview}</div><div><h3>${title}</h3><p>${subtitle}</p></div><button type="button" data-command="${command}" data-field="${field}" data-id="${id}" ${disabled ? "disabled" : ""}>${locked ? `需 ${missingLabel}` : owned ? "已擁有" : `● ${formatNumber(price)}`}</button></article>`;
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
function stageName(stage) { return ({ egg: "魚卵", fry: "幼魚", juvenile: "亞成魚", adult: "成魚" })[stage] || stage; }
function healthName(health) { return ({ healthy: "健康", sick: "生病", dead: "死亡" })[health] || health; }
function tutorialMessage(step) { return step === "complete" ? "新手引導完成！獲得水榕。" : "新手任務進展，獎勵已領取。"; }
function formatNumber(value) { return new Intl.NumberFormat("zh-TW").format(Math.floor(Number(value) || 0)); }
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
function byId(id) { return document.getElementById(id); }
