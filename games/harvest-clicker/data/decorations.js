(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticData ||= {};
  globalThis.HarvestStaticData.DECORATIONS = Object.freeze([
    {
      id: "dirt_ridge", name: "牧場矮籬", category: "edge", emoji: "🪵", cost: 20,
      image: "decorations/fence-low-horizontal.png", imageHorizontal: "decorations/fence-low-horizontal.png", imageVertical: "decorations/fence-low-vertical.png",
      renderWidth: 62, contactOffsetY: 10, layer: "object", slotType: "edge", direction: "both", effect: null
    },
    {
      id: "stone_ridge", name: "斑駁矮籬", category: "edge", emoji: "🪵", cost: 60,
      image: "decorations/fence-rustic-horizontal.png", imageHorizontal: "decorations/fence-rustic-horizontal.png", imageVertical: "decorations/fence-rustic-vertical.png",
      renderWidth: 62, contactOffsetY: 10, layer: "object", slotType: "edge", direction: "both", effect: null
    },
    {
      id: "wood_ridge", name: "牧場高籬", category: "edge", emoji: "🪵", cost: 90,
      image: "decorations/fence-high-horizontal.png", imageHorizontal: "decorations/fence-high-horizontal.png", imageVertical: "decorations/fence-high-vertical.png",
      renderWidth: 62, contactOffsetY: 10, layer: "object", slotType: "edge", direction: "both", effect: null
    },
    {
      id: "wood_fence", name: "斑駁高籬", category: "edge", emoji: "🪵", cost: 50,
      image: "decorations/fence-high-rustic-horizontal.png", imageHorizontal: "decorations/fence-high-rustic-horizontal.png", imageVertical: "decorations/fence-high-rustic-vertical.png",
      renderWidth: 62, contactOffsetY: 10, layer: "object", slotType: "edge", direction: "both", effect: null
    },
    {
      id: "wood_gate", name: "開放農場門", category: "corner", emoji: "🚪", image: "decorations/farm-gate.png", cost: 180,
      renderWidth: 70, contactOffsetY: 10, layer: "object", slotType: "corner", direction: "both", effect: null
    },
    {
      id: "flower_marker", name: "曬乾草捆", category: "corner", emoji: "🌾", image: "decorations/hay-bale.png", cost: 250,
      renderWidth: 48, contactOffsetY: 8, layer: "object", slotType: "corner", direction: "both", effect: null
    },
    {
      id: "wood_stump", name: "農場補給箱", category: "corner", emoji: "📦", image: "decorations/supply-crate.png", cost: 450,
      renderWidth: 44, contactOffsetY: 8, layer: "object", slotType: "corner", direction: "both", effect: null
    },
    {
      id: "farm_lantern", name: "木梯架", category: "corner", emoji: "🪜", image: "decorations/ladder-stand.png", cost: 2500,
      renderWidth: 44, contactOffsetY: 9, layer: "object", slotType: "corner", direction: "both", effect: null
    },
    {
      id: "farm_sign", name: "疊放乾草", category: "corner", emoji: "🌾", image: "decorations/hay-stack.png", cost: 800,
      renderWidth: 58, contactOffsetY: 8, layer: "object", slotType: "corner", direction: "both", effect: null
    },
    {
      id: "water_channel", name: "舊木棧小徑", category: "edge", emoji: "🪵", cost: 8000,
      image: "decorations/wood-path-horizontal.png", imageHorizontal: "decorations/wood-path-horizontal.png", imageVertical: "decorations/wood-path-vertical.png",
      renderWidth: 68, contactOffsetY: 20, layer: "ground", slotType: "edge", direction: "both", effect: null
    }
  ]);
}(globalThis));
