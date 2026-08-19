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
    // Keep the original ID so players who already claimed the earlier version
    // of this reward cannot receive a duplicate after the schedule changes.
    MONTHLY_EVENT_ID: "cherry-tree-30-day",
    MONTHLY_EVENT_REWARD_PLANT_ID: "cherry_tree",
    MONTHLY_EVENT_START_AT: Date.parse("2026-08-19T00:00:00+08:00"),
    MONTHLY_EVENT_END_AT: Date.parse("2026-09-19T00:00:00+08:00")
  });
}(globalThis));
