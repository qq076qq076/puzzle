(function (globalThis) {
  "use strict";

  globalThis.HarvestStaticConfig = Object.freeze({
    BOARD_SIZE: 27,
    PLOT_GRID_SIZE: 9,
    INITIAL_PLOT_ID: 40,
    INITIAL_PLOT_IDS: Object.freeze([40, 31, 41, 49, 39, 30, 32, 50, 48]),
    SAVE_VERSION: 4,
    LAND_PRICE_BASE: 1200,
    LAND_PRICE_GROWTH: 1.45,
    LAND_SIZE: 3,
    LOWEST_GROWTH_MULTIPLIER: 0.2,
    MONTHLY_EVENT_ID: "cherry-tree-30-day",
    MONTHLY_EVENT_REWARD_PLANT_ID: "cherry_tree",
    MONTHLY_EVENT_DURATION_MS: 30 * 24 * 60 * 60 * 1000
  });
}(globalThis));
