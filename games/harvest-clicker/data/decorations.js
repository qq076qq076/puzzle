(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.DECORATIONS = Object.freeze([
    { id: "dirt_ridge", name: "泥土田埂", category: "edge", emoji: "🟫", image: "", cost: 20, slotType: "edge", direction: "both", effect: null },
    { id: "stone_ridge", name: "石板田埂", category: "edge", emoji: "◽", image: "", cost: 60, slotType: "edge", direction: "both", effect: null },
    { id: "wood_ridge", name: "木板田埂", category: "edge", emoji: "🪵", image: "", cost: 90, slotType: "edge", direction: "both", effect: null },
    { id: "wood_fence", name: "木籬笆", category: "edge", emoji: "🪵", image: "", cost: 50, slotType: "edge", direction: "both", effect: null },
    { id: "wood_gate", name: "木門", category: "corner", emoji: "🚪", image: "", cost: 180, slotType: "corner", direction: "both", effect: null },
    { id: "flower_marker", name: "小花叢", category: "corner", emoji: "🌼", image: "", cost: 250, slotType: "corner", direction: "both", effect: null },
    { id: "wood_stump", name: "木樁", category: "corner", emoji: "🪵", image: "", cost: 450, slotType: "corner", direction: "both", effect: null },
    { id: "farm_lantern", name: "路燈", category: "corner", emoji: "🏮", image: "", cost: 2500, slotType: "corner", direction: "both", effect: null },
    { id: "farm_sign", name: "農場告示牌", category: "corner", emoji: "🪧", image: "", cost: 800, slotType: "corner", direction: "both", effect: null },
    { id: "water_channel", name: "小水溝", category: "edge", emoji: "💧", image: "", cost: 8000, slotType: "edge", direction: "both", effect: null }
  ]);
}(globalThis));
