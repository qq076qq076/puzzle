(function () {
  "use strict";

  const KNIVES_PER_LEVEL = 8;
  const COLLISION_ANGLE = 14;
  const PRESET_MIN_DISTANCE = COLLISION_ANGLE * 1.8;
  const FLIGHT_DURATION = 300;
  const KNIFE_ASSET = "assets/stick_wood.png";

  const stageElement = document.getElementById("knife-stage");
  const targetElement = document.getElementById("knife-target");
  const flyingLayerElement = document.getElementById("knife-flying-layer");
  const stuckKnivesElement = document.getElementById("stuck-knives");
  const statusElement = document.getElementById("knife-status");
  const levelElement = document.getElementById("level-number");
  const scoreElement = document.getElementById("score");
  const knivesRemainingElement = document.getElementById("knives-remaining");
  const trayElement = document.getElementById("knife-tray");
  const throwButton = document.getElementById("throw-knife");
  const restartButton = document.getElementById("restart-level");
  const messageElement = document.getElementById("knife-message");
  const messageKickerElement = document.getElementById("knife-message-kicker");
  const messageTitleElement = document.getElementById("knife-message-title");
  const messageDescriptionElement = document.getElementById("knife-message-description");
  const nextLevelButton = document.getElementById("knife-next-level");
  const retryButton = document.getElementById("knife-retry");

  let level = 1;
  let score = 0;
  let levelScore = 0;
  let knivesRemaining = KNIVES_PER_LEVEL;
  let targetRotation = 0;
  let targetDirection = 1;
  let targetSpeed = 34;
  let stuckAngles = [];
  let isAnimating = false;
  let gameOver = false;
  let animationFrame = null;
  let lastFrameTime = null;

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function angleDistance(firstAngle, secondAngle) {
    const difference = Math.abs(normalizeAngle(firstAngle) - normalizeAngle(secondAngle));
    return Math.min(difference, 360 - difference);
  }

  function getPresetKnifeCount() {
    if (level < 2) {
      return 0;
    }
    return Math.min(level, 6);
  }

  function createPresetAngles(count) {
    const angles = [];
    let attempts = 0;

    while (angles.length < count && attempts < 500) {
      const candidate = Math.random() * 360;
      const isSafe = angles.every(function (angle) {
        return angleDistance(candidate, angle) >= PRESET_MIN_DISTANCE;
      });

      if (isSafe) {
        angles.push(candidate);
      }
      attempts += 1;
    }

    return angles;
  }

  function createKnifeSprite(className) {
    const knife = document.createElement("div");
    knife.className = className;

    const image = document.createElement("img");
    image.src = KNIFE_ASSET;
    image.alt = "";
    image.draggable = false;
    knife.appendChild(image);
    return knife;
  }

  function renderTray() {
    trayElement.innerHTML = "";

    for (let index = 0; index < KNIVES_PER_LEVEL; index += 1) {
      const knife = createKnifeSprite("knife-tray-item");
      if (index >= knivesRemaining) {
        knife.classList.add("is-used");
      }
      trayElement.appendChild(knife);
    }

    knivesRemainingElement.textContent = knivesRemaining + " 把";
    throwButton.disabled = gameOver || isAnimating || knivesRemaining === 0;
  }

  function setTargetRotation() {
    targetElement.style.transform = "translate(-50%, -50%) rotate(" + targetRotation + "deg)";
  }

  function animateTarget(timestamp) {
    if (gameOver) {
      animationFrame = null;
      return;
    }

    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
    }

    const elapsed = Math.min(timestamp - lastFrameTime, 50);
    lastFrameTime = timestamp;
    targetRotation += targetDirection * targetSpeed * elapsed / 1000;
    setTargetRotation();
    animationFrame = window.requestAnimationFrame(animateTarget);
  }

  function startTargetRotation() {
    window.cancelAnimationFrame(animationFrame);
    lastFrameTime = null;
    animationFrame = window.requestAnimationFrame(animateTarget);
  }

  function stopTargetRotation() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastFrameTime = null;
  }

  function setStatus(message, tone) {
    statusElement.textContent = message;
    statusElement.className = "knife-status" + (tone ? " is-" + tone : "");
  }

  function clearMessage() {
    messageElement.hidden = true;
  }

  function showMessage(options) {
    messageKickerElement.textContent = options.kicker;
    messageTitleElement.textContent = options.title;
    messageDescriptionElement.textContent = options.description;
    nextLevelButton.hidden = !options.showNext;
    retryButton.textContent = options.retryLabel;
    messageElement.hidden = false;
  }

  function renderStuckKnife(angle, isCollision) {
    const knife = createKnifeSprite("stuck-knife");
    const targetSize = targetElement.getBoundingClientRect().width;
    if (isCollision) {
      knife.classList.add("is-collision");
    }
    knife.style.setProperty("--target-radius", targetSize * 0.45 + "px");
    knife.style.transform = "rotate(" + angle + "deg)";
    stuckKnivesElement.appendChild(knife);
  }

  function hasCollision(angle) {
    return stuckAngles.some(function (stuckAngle) {
      return angleDistance(angle, stuckAngle) < COLLISION_ANGLE;
    });
  }

  function finishLevel() {
    gameOver = true;
    stopTargetRotation();
    score += levelScore + level * 100;
    levelScore = 0;
    scoreElement.textContent = String(score);
    setStatus("漂亮！本關所有飛刀都安全落點。", "success");
    showMessage({
      kicker: "NICE THROW",
      title: "關卡完成！",
      description: "你用 " + KNIVES_PER_LEVEL + " 把飛刀完成了第 " + level + " 關。",
      showNext: true,
      retryLabel: "重玩本關"
    });
    renderTray();
  }

  function failLevel(angle) {
    gameOver = true;
    stopTargetRotation();
    renderStuckKnife(angle, true);
    scoreElement.textContent = String(score);
    setStatus("飛刀撞上了！找一個更大的空隙再試。", "fail");
    showMessage({
      kicker: "WATCH THE GAP",
      title: "再差一點。",
      description: "這一把碰到了已插入的飛刀，關卡需要重新挑戰。",
      showNext: false,
      retryLabel: "再試一次"
    });
    renderTray();
  }

  function resolveImpact() {
    const impactAngle = normalizeAngle(180 - targetRotation);
    if (hasCollision(impactAngle)) {
      failLevel(impactAngle);
      return;
    }

    stuckAngles.push(impactAngle);
    renderStuckKnife(impactAngle, false);
    knivesRemaining -= 1;
    levelScore += 100;
    isAnimating = false;
    scoreElement.textContent = String(score + levelScore);
    renderTray();

    if (knivesRemaining === 0) {
      finishLevel();
      return;
    }

    setStatus("漂亮！還有 " + knivesRemaining + " 把，繼續找空隙。", "success");
  }

  function animateFlyingKnife(knife, startY, impactY, startTime, timestamp) {
    const progress = Math.min((timestamp - startTime) / FLIGHT_DURATION, 1);
    const currentY = startY + (impactY - startY) * progress;
    knife.style.transform = "translate(-50%, " + (currentY - startY) + "px)";

    if (progress < 1) {
      window.requestAnimationFrame(function (nextTimestamp) {
        animateFlyingKnife(knife, startY, impactY, startTime, nextTimestamp);
      });
      return;
    }

    knife.remove();
    resolveImpact();
  }

  function throwKnife() {
    if (gameOver || isAnimating || knivesRemaining === 0) {
      return;
    }

    isAnimating = true;
    renderTray();
    setStatus("飛刀飛行中……", "ready");

    const knife = createKnifeSprite("flying-knife");
    const stageHeight = stageElement.getBoundingClientRect().height;
    const targetSize = targetElement.getBoundingClientRect().width;
    const startY = stageHeight + 10;
    const impactY = stageHeight / 2 + targetSize * 0.45;
    knife.style.left = "50%";
    knife.style.top = startY + "px";
    flyingLayerElement.appendChild(knife);

    window.requestAnimationFrame(function (startTime) {
      animateFlyingKnife(knife, startY, impactY, startTime, startTime);
    });
  }

  function startLevel(nextLevel) {
    stopTargetRotation();
    level = nextLevel;
    levelScore = 0;
    knivesRemaining = KNIVES_PER_LEVEL;
    targetRotation = 0;
    targetDirection = level % 2 === 0 ? -1 : 1;
    targetSpeed = 34 + Math.min(level - 1, 7) * 5;
    stuckAngles = [];
    isAnimating = false;
    gameOver = false;

    levelElement.textContent = String(level).padStart(2, "0");
    scoreElement.textContent = String(score);
    stuckKnivesElement.innerHTML = "";
    flyingLayerElement.innerHTML = "";
    stuckAngles = createPresetAngles(getPresetKnifeCount());
    stuckAngles.forEach(function (angle) {
      renderStuckKnife(angle, false);
    });
    setTargetRotation();
    clearMessage();
    renderTray();
    const presetCount = stuckAngles.length;
    setStatus(
      presetCount > 0
        ? "本關已預先插入 " + presetCount + " 把飛刀，找準空隙再發射。"
        : "找準空隙，點擊靶面或按 Space 發射。",
      "ready"
    );
    startTargetRotation();
  }

  function restoreLevel(saved) {
    stopTargetRotation();
    level = saved.level;
    score = saved.score;
    levelScore = saved.levelScore;
    knivesRemaining = saved.knivesRemaining;
    targetRotation = saved.targetRotation;
    targetDirection = saved.targetDirection;
    targetSpeed = saved.targetSpeed;
    stuckAngles = saved.stuckAngles.slice();
    isAnimating = false;
    gameOver = Boolean(saved.gameOver);
    levelElement.textContent = String(level).padStart(2, "0");
    scoreElement.textContent = String(score + levelScore);
    stuckKnivesElement.innerHTML = "";
    flyingLayerElement.innerHTML = "";
    stuckAngles.forEach(function (angle) { renderStuckKnife(angle, false); });
    setTargetRotation();
    renderTray();
    if (gameOver && saved.message) {
      setStatus(saved.statusText, saved.statusTone);
      showMessage(saved.message);
    } else {
      clearMessage();
      setStatus("已恢復上次的關卡，找準空隙繼續發射。", "ready");
      startTargetRotation();
    }
  }

  stageElement.addEventListener("click", function (event) {
    if (event.target.closest("button")) {
      return;
    }
    throwKnife();
  });

  throwButton.addEventListener("click", throwKnife);
  restartButton.addEventListener("click", function () {
    startLevel(level);
  });
  retryButton.addEventListener("click", function () {
    startLevel(level);
  });
  nextLevelButton.addEventListener("click", function () {
    startLevel(level + 1);
  });

  document.addEventListener("keydown", function (event) {
    if ((event.code === "Space" || event.code === "Enter") && !event.target.closest("button")) {
      event.preventDefault();
      throwKnife();
    }
  });

  window.PuzzleSave.create({
    key: "knife-throw",
    fresh: function () { level = 1; score = 0; startLevel(1); },
    restore: restoreLevel,
    validate: function (saved) {
      return saved && Number.isInteger(saved.level) && saved.level > 0 && Number.isFinite(saved.score) &&
        Number.isInteger(saved.knivesRemaining) && Array.isArray(saved.stuckAngles);
    },
    getState: function () {
      const message = messageElement.hidden ? null : {
        kicker: messageKickerElement.textContent, title: messageTitleElement.textContent,
        description: messageDescriptionElement.textContent, showNext: !nextLevelButton.hidden,
        retryLabel: retryButton.textContent
      };
      return {
        level: level, score: score, levelScore: levelScore, knivesRemaining: knivesRemaining,
        targetRotation: targetRotation, targetDirection: targetDirection, targetSpeed: targetSpeed,
        stuckAngles: stuckAngles, gameOver: gameOver, message: message,
        statusText: statusElement.textContent,
        statusTone: statusElement.className.includes("success") ? "success" : statusElement.className.includes("fail") ? "fail" : "ready"
      };
    }
  });
})();
