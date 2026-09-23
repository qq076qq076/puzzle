const EMPTY = Object.freeze([
  "......", "......", "......", "......", "......", "......", "......",
  "......", "......", "......", "......", "......", "......"
]);

function level(id, title, subtitle, options = {}) {
  return Object.freeze({
    id,
    title,
    subtitle,
    chapter: options.chapter || 1,
    colors: Object.freeze(options.colors || [1, 2, 3, 4]),
    startLevel: options.startLevel || 1,
    initialBoard: Object.freeze(options.initialBoard || [...EMPTY]),
    objective: Object.freeze(options.objective || { type: "score", amount: 3000 }),
    starScores: Object.freeze(options.starScores || [0, 3000, 6000]),
    fixedPairs: Object.freeze(options.fixedPairs || [])
  });
}

export const LEVELS = Object.freeze([
  level("stage-01", "第一個咒語", "湊出四顆同色氣泡。", {
    colors: [1, 2, 3], objective: { type: "score", amount: 1200 }, starScores: [0, 1800, 3200]
  }),
  level("stage-02", "紅焰練習", "集中消除火焰紅氣泡。", {
    colors: [1, 2, 3], objective: { type: "clearColor", color: 1, amount: 16 }, starScores: [0, 2600, 5000]
  }),
  level("stage-03", "重力回聲", "讓氣泡掉落，完成二連鎖。", {
    colors: [1, 2, 3], objective: { type: "chain", amount: 2 }, starScores: [0, 3000, 6000]
  }),
  level("stage-04", "四元素門", "第四種元素加入試煉。", {
    colors: [1, 2, 3, 4], startLevel: 2, objective: { type: "score", amount: 5500 }, starScores: [0, 7000, 10000]
  }),
  level("stage-05", "封印石陣", "消除彩色氣泡旁的封印石。", {
    chapter: 2,
    initialBoard: [
      "......", "......", "......", "......", "......", "......", "......",
      "......", "......", "......", "......", ".#..#.", "##..##"
    ],
    objective: { type: "clearGarbage", amount: 6 }, starScores: [0, 5000, 9000]
  }),
  level("stage-06", "藍月潮汐", "累積魔力藍的消除數量。", {
    chapter: 2, startLevel: 3, objective: { type: "clearColor", color: 4, amount: 24 }, starScores: [0, 6500, 11000]
  }),
  level("stage-07", "三重詠唱", "完成一次三連鎖。", {
    chapter: 2, startLevel: 3, objective: { type: "chain", amount: 3 }, starScores: [0, 9000, 15000]
  }),
  level("stage-08", "元素洪流", "高速累積試煉分數。", {
    chapter: 2, startLevel: 4, objective: { type: "score", amount: 12000 }, starScores: [0, 15000, 22000]
  }),
  level("stage-09", "星塔封鎖", "打破盤底的全部封印。", {
    chapter: 3,
    startLevel: 5,
    initialBoard: [
      "......", "......", "......", "......", "......", "......", "......",
      "......", "......", "......", "......", "#.#.#.", "######"
    ],
    objective: { type: "clearGarbage", amount: 9 }, starScores: [0, 10000, 18000]
  }),
  level("stage-10", "疾速咒文", "在更快的節奏中組成連鎖。", {
    chapter: 3, startLevel: 6, objective: { type: "chain", amount: 3 }, starScores: [0, 13000, 22000]
  }),
  level("stage-11", "大魔法陣", "用連鎖累積高分。", {
    chapter: 3, startLevel: 7, objective: { type: "score", amount: 22000 }, starScores: [0, 28000, 40000]
  }),
  level("stage-12", "星穹畢業試", "完成魔法塔的最終考驗。", {
    chapter: 3, startLevel: 8, objective: { type: "score", amount: 35000 }, starScores: [0, 45000, 65000]
  })
]);

export const TUTORIALS = Object.freeze([
  level("tutorial-01", "移動與落下", "使用左右移動，旋轉後把氣泡落到盤底。", {
    colors: [1, 2], objective: { type: "score", amount: 20 }, starScores: [0, 20, 40], fixedPairs: [[1, 2], [2, 1]]
  }),
  level("tutorial-02", "四顆相連", "把火焰紅接在一起，湊滿四顆。", {
    colors: [1, 2],
    initialBoard: [
      "......", "......", "......", "......", "......", "......", "......",
      "......", "......", "......", "......", "......", "RRR..."
    ],
    objective: { type: "clearColor", color: 1, amount: 4 }, starScores: [0, 40, 100], fixedPairs: [[1, 2], [1, 1]]
  }),
  level("tutorial-03", "重力連鎖", "消除紅色支架，讓綠色落下形成二連鎖。", {
    colors: [1, 2, 3],
    initialBoard: [
      "......", "......", "......", "......", "......", "......", "......",
      "......", "......", "...G..", "...R..", "...RRR", "GGG..."
    ],
    objective: { type: "chain", amount: 2 }, starScores: [0, 360, 700], fixedPairs: [[2, 2], [1, 3]]
  }),
  level("tutorial-04", "解除封印", "消除旁邊的彩色氣泡，打破灰色封印石。", {
    colors: [1, 2, 3],
    initialBoard: [
      "......", "......", "......", "......", "......", "......", "......",
      "......", "......", "......", "......", "......", "#RRR#."
    ],
    objective: { type: "clearGarbage", amount: 2 }, starScores: [0, 40, 100], fixedPairs: [[1, 2], [1, 1]]
  })
]);

export function getLevel(id) {
  return LEVELS.find((entry) => entry.id === id) || LEVELS[0];
}

export function getTutorial(id) {
  return TUTORIALS.find((entry) => entry.id === id) || TUTORIALS[0];
}

export function objectiveText(objective, progress = 0) {
  if (objective.type === "score") return `取得 ${objective.amount.toLocaleString()} 分（${Math.min(progress, objective.amount).toLocaleString()}）`;
  if (objective.type === "chain") return `完成 ${objective.amount} 連鎖（最高 ${progress}）`;
  if (objective.type === "clearGarbage") return `清除 ${objective.amount} 顆封印石（${Math.min(progress, objective.amount)}）`;
  if (objective.type === "clearColor") return `消除 ${objective.amount} 顆指定氣泡（${Math.min(progress, objective.amount)}）`;
  return "完成關卡目標";
}
