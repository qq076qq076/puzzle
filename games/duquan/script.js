(() => {
  "use strict";

  const CONFIG = Object.freeze({
    canvasWidth: 960,
    canvasHeight: 620,
    iconsPerType: 30,
    tickMs: 100,
    tokenRadius: 14,
    collisionDistance: 27,
    moveDistance: 7.5,
    steering: 0.42,
    speedBoostChance: 0.05,
    speedBoostDurationMs: 3000,
    speedBoostMultiplier: 1.7,
    gridSize: 40,
    typeOrder: ["scissors", "rock", "paper"]
  });

  const TYPES = Object.freeze({
    scissors: Object.freeze({ name: "剪刀", english: "SCISSORS", color: "#ec7667", light: "#ffab91", iconPath: "assets/scissors.svg" }),
    rock: Object.freeze({ name: "石頭", english: "ROCK", color: "#77818b", light: "#c9d1d7", iconPath: "assets/rock.svg" }),
    paper: Object.freeze({ name: "布", english: "PAPER", color: "#6e9fd0", light: "#b7dcff", iconPath: "assets/paper.svg" })
  });

  const canvas = document.querySelector("#duquan-canvas");
  const context = canvas.getContext("2d");
  const arenaSection = document.querySelector("#arena-section");
  const choiceButtons = Array.from(document.querySelectorAll(".duquan-choice"));
  const statusValue = document.querySelector("#status-value");
  const lastEvent = document.querySelector("#last-event");
  const resultCard = document.querySelector("#result-card");
  const resultTitle = document.querySelector("#result-title");
  const resultCopy = document.querySelector("#result-copy");
  const resetButton = document.querySelector("#reset-button");
  const nextRoundButton = document.querySelector("#next-round-button");
  const populationPanel = document.querySelector("#population-panel");

  const state = {
    actors: [],
    userChoice: null,
    tick: 0,
    running: false,
    finished: false,
    timerId: null,
    animationId: null,
    lastTimestamp: 0,
    pulse: 0,
    collisionFlash: [],
    counts: { scissors: 0, rock: 0, paper: 0 }
  };

  const iconImages = Object.fromEntries(CONFIG.typeOrder.map((typeId) => {
    const image = new Image();
    image.src = TYPES[typeId].iconPath;
    return [typeId, image];
  }));

  const iconSprites = {};
  function createIconSprite(typeId) {
    const image = iconImages[typeId];
    if (!image.complete || image.naturalWidth === 0) return;
    const sprite = document.createElement("canvas");
    sprite.width = 128;
    sprite.height = 128;
    const spriteContext = sprite.getContext("2d");
    spriteContext.drawImage(image, 0, 0, sprite.width, sprite.height);
    spriteContext.globalCompositeOperation = "source-in";
    spriteContext.fillStyle = TYPES[typeId].color;
    spriteContext.fillRect(0, 0, sprite.width, sprite.height);
    iconSprites[typeId] = sprite;
  }

  CONFIG.typeOrder.forEach((typeId) => {
    const image = iconImages[typeId];
    const ready = () => {
      createIconSprite(typeId);
      render();
    };
    if (image.complete && image.naturalWidth > 0) ready();
    else image.addEventListener("load", ready, { once: true });
  });

  function beats(first, second) {
    return (first === "scissors" && second === "paper")
      || (first === "rock" && second === "scissors")
      || (first === "paper" && second === "rock");
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [items[index], items[target]] = [items[target], items[index]];
    }
    return items;
  }

  function formatType(typeId) {
    return TYPES[typeId]?.name || "—";
  }

  function setStatus(message) {
    statusValue.textContent = message;
  }

  function updateCounts() {
    const counts = state.actors.reduce((summary, actor) => {
      summary[actor.type] += 1;
      return summary;
    }, { scissors: 0, rock: 0, paper: 0 });
    const aliveTypes = CONFIG.typeOrder.filter((typeId) => counts[typeId] > 0);
    const total = state.actors.length;
    state.counts = counts;
    if (total > 0) {
      CONFIG.typeOrder.forEach((typeId) => {
        const percentage = (counts[typeId] / total) * 100;
        const roundedPercentage = Math.round(percentage);
        document.querySelector(`#population-fill-${typeId}`).style.width = `${percentage}%`;
        document.querySelector(`#population-value-${typeId}`).textContent = `${roundedPercentage}% · ${counts[typeId]}`;
      });
    }
    return { counts, aliveTypes };
  }

  function createActors() {
    const actors = [];
    const safeMargin = CONFIG.tokenRadius + 16;
    const minDistance = CONFIG.tokenRadius * 1.65;
    const positions = [];
    let id = 1;

    for (const typeId of CONFIG.typeOrder) {
      for (let index = 0; index < CONFIG.iconsPerType; index += 1) {
        let x = 0;
        let y = 0;
        let tries = 0;
        do {
          x = randomBetween(safeMargin, CONFIG.canvasWidth - safeMargin);
          y = randomBetween(safeMargin, CONFIG.canvasHeight - safeMargin);
          tries += 1;
        } while (positions.some((point) => Math.hypot(point.x - x, point.y - y) < minDistance) && tries < 180);
        positions.push({ x, y });
        const angle = Math.random() * Math.PI * 2;
        actors.push({
          id: id++,
          type: typeId,
          x,
          y,
          visualX: x,
          visualY: y,
          angle,
          velocityX: Math.cos(angle) * 0.35,
          velocityY: Math.sin(angle) * 0.35,
          bob: Math.random() * Math.PI * 2,
          flash: 0,
          speedBoostRemaining: 0
        });
      }
    }
    return shuffle(actors);
  }

  function startRound(choice) {
    stopSimulation();
    state.actors = createActors();
    state.userChoice = choice;
    state.tick = 0;
    state.running = true;
    state.finished = false;
    state.pulse = 0;
    state.collisionFlash = [];
    choiceButtons.forEach((button) => {
      const isSelected = button.dataset.choice === choice;
      button.disabled = true;
      button.setAttribute("aria-pressed", String(isSelected));
    });
    arenaSection.hidden = false;
    populationPanel.hidden = false;
    resultCard.hidden = true;
    setStatus("模擬啟動中：所有圖示正在尋找自己的優勢。 ");
    lastEvent.textContent = "等待第一次碰撞";
    updateCounts();
    render();
    state.timerId = window.setInterval(tick, CONFIG.tickMs);
    state.lastTimestamp = performance.now();
    state.animationId = window.requestAnimationFrame(animate);
  }

  function stopSimulation() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
    if (state.animationId !== null) {
      window.cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    state.running = false;
  }

  function getDirection(actor, actors) {
    let directionX = 0;
    let directionY = 0;
    let nearestOpponent = null;
    let nearestOpponentDistance = Infinity;

    for (const other of actors) {
      if (other.id === actor.id) continue;
      const dx = other.x - actor.x;
      const dy = other.y - actor.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.001) continue;
      if (actor.type !== other.type && distance < nearestOpponentDistance) {
        nearestOpponent = other;
        nearestOpponentDistance = distance;
      }
      const closeness = 1 / Math.pow(Math.max(distance, 16), 1.24);
      const sameType = actor.type === other.type;
      const polarity = sameType
        ? (distance < CONFIG.collisionDistance * 1.8 ? -0.24 : 0)
        : (beats(actor.type, other.type) ? 1 : -1);
      directionX += (dx / distance) * closeness * polarity;
      directionY += (dy / distance) * closeness * polarity;
    }

    const edgePadding = 108;
    const edgeStrength = 4.8;
    const leftPressure = Math.max(0, (edgePadding - actor.x) / edgePadding);
    const rightPressure = Math.max(0, (edgePadding - (CONFIG.canvasWidth - actor.x)) / edgePadding);
    const topPressure = Math.max(0, (edgePadding - actor.y) / edgePadding);
    const bottomPressure = Math.max(0, (edgePadding - (CONFIG.canvasHeight - actor.y)) / edgePadding);
    directionX += (leftPressure * leftPressure - rightPressure * rightPressure) * edgeStrength;
    directionY += (topPressure * topPressure - bottomPressure * bottomPressure) * edgeStrength;

    if (Math.abs(directionX) + Math.abs(directionY) < 0.0001) {
      directionX = Math.cos(actor.angle) * 0.1;
      directionY = Math.sin(actor.angle) * 0.1;
    }

    const magnitude = Math.hypot(directionX, directionY) || 1;
    const edgeDistance = Math.min(actor.x, CONFIG.canvasWidth - actor.x, actor.y, CONFIG.canvasHeight - actor.y);
    const boundaryBoost = edgeDistance < edgePadding ? 1 + ((edgePadding - edgeDistance) / edgePadding) * 0.4 : 1;
    const baseSpeed = nearestOpponent
      ? (beats(actor.type, nearestOpponent.type) ? 1.08 : 0.72) * boundaryBoost
      : 0.92 * boundaryBoost;
    const speed = actor.speedBoostRemaining > 0
      ? baseSpeed * CONFIG.speedBoostMultiplier
      : baseSpeed;
    return {
      x: directionX / magnitude,
      y: directionY / magnitude,
      speed
    };
  }

  function updateSpeedBoosts() {
    const counts = state.counts;
    const minimumCount = Math.min(...CONFIG.typeOrder.map((typeId) => counts[typeId]));
    const maximumCount = Math.max(...CONFIG.typeOrder.map((typeId) => counts[typeId]));
    const underdogTypes = new Set(
      maximumCount > minimumCount
        ? CONFIG.typeOrder.filter((typeId) => counts[typeId] === minimumCount)
        : []
    );

    for (const actor of state.actors) {
      actor.speedBoostRemaining = Math.max(0, actor.speedBoostRemaining - CONFIG.tickMs);
      if (actor.speedBoostRemaining === 0
        && underdogTypes.has(actor.type)
        && Math.random() < CONFIG.speedBoostChance) {
        actor.speedBoostRemaining = CONFIG.speedBoostDurationMs;
      }
    }
  }

  function moveActors() {
    updateSpeedBoosts();
    const directions = new Map();
    for (const actor of state.actors) directions.set(actor.id, getDirection(actor, state.actors));
    for (const actor of state.actors) {
      const direction = directions.get(actor.id);
      const desiredVelocityX = direction.x * direction.speed;
      const desiredVelocityY = direction.y * direction.speed;
      actor.velocityX += (desiredVelocityX - actor.velocityX) * CONFIG.steering;
      actor.velocityY += (desiredVelocityY - actor.velocityY) * CONFIG.steering;
      actor.angle = Math.atan2(actor.velocityY, actor.velocityX);

      const minX = CONFIG.tokenRadius + 1;
      const maxX = CONFIG.canvasWidth - CONFIG.tokenRadius - 1;
      const minY = CONFIG.tokenRadius + 1;
      const maxY = CONFIG.canvasHeight - CONFIG.tokenRadius - 1;
      actor.x += actor.velocityX * CONFIG.moveDistance;
      actor.y += actor.velocityY * CONFIG.moveDistance;
      if (actor.x <= minX) {
        actor.x = minX;
        actor.velocityX = Math.max(0.68, Math.abs(actor.velocityX) * 0.88);
      } else if (actor.x >= maxX) {
        actor.x = maxX;
        actor.velocityX = -Math.max(0.68, Math.abs(actor.velocityX) * 0.88);
      }
      if (actor.y <= minY) {
        actor.y = minY;
        actor.velocityY = Math.max(0.68, Math.abs(actor.velocityY) * 0.88);
      } else if (actor.y >= maxY) {
        actor.y = maxY;
        actor.velocityY = -Math.max(0.68, Math.abs(actor.velocityY) * 0.88);
      }
      actor.bob += 0.25;
      actor.flash = Math.max(0, actor.flash - 0.16);
    }
  }

  function resolveCollisions() {
    const collisions = [];
    for (let firstIndex = 0; firstIndex < state.actors.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < state.actors.length; secondIndex += 1) {
        const first = state.actors[firstIndex];
        const second = state.actors[secondIndex];
        if (first.type === second.type) continue;
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (distance <= CONFIG.collisionDistance) collisions.push({ first, second, distance });
      }
    }
    collisions.sort((first, second) => first.distance - second.distance);
    const converted = new Set();
    let event = null;

    for (const collision of collisions) {
      const { first, second } = collision;
      if (converted.has(first.id) || converted.has(second.id)) continue;
      const winner = beats(first.type, second.type) ? first : second;
      const loser = winner === first ? second : first;
      const previousType = loser.type;
      loser.type = winner.type;
      loser.flash = 1;
      converted.add(loser.id);
      state.collisionFlash.push({ x: loser.x, y: loser.y, color: TYPES[winner.type].color, life: 1 });
      event = `${formatType(winner.type)} 吃掉 ${formatType(previousType)}`;
    }
    state.collisionFlash = state.collisionFlash.filter((flash) => {
      flash.life -= 0.11;
      return flash.life > 0;
    });
    if (event) {
      lastEvent.textContent = event;
    }
    return collisions.length;
  }

  function tick() {
    if (!state.running || state.finished) return;
    state.tick += 1;
    moveActors();
    const collisionCount = resolveCollisions();
    const { counts, aliveTypes } = updateCounts();
    if (collisionCount > 0) {
      setStatus(`${formatType(aliveTypes[0])} 正在靠近優勢目標，碰撞已轉化 ${collisionCount} 組。`);
    } else if (state.tick % 4 === 0) {
      setStatus(`第 ${state.tick} 回合：所有圖示依距離權重重新選擇方向。`);
    }
    if (aliveTypes.length === 1) {
      finishRound(aliveTypes[0]);
    }
  }

  function finishRound(winnerType) {
    if (state.finished) return;
    stopSimulation();
    state.finished = true;
    const isWin = winnerType === state.userChoice;
    const winnerName = formatType(winnerType);
    resultTitle.textContent = `${winnerName}稱霸`;
    resultCopy.textContent = isWin
      ? `猜中了！${winnerName} 留到最後，你的判斷完全命中。`
      : `這次沒押中。${winnerName} 活到最後，下輪再試一次。`;
    setStatus(isWin ? `猜中！${winnerName} 是拳台最後霸主。` : `${winnerName} 勝出；你的下注是${formatType(state.userChoice)}。`);
    lastEvent.textContent = `FINAL · ${winnerName}`;
    updateCounts();
    resultCard.hidden = false;
    render();
  }

  function resetForNextRound() {
    stopSimulation();
    state.actors = [];
    state.userChoice = null;
    state.tick = 0;
    state.finished = false;
    state.pulse = 0;
    state.collisionFlash = [];
    choiceButtons.forEach((button) => {
      button.disabled = false;
      button.setAttribute("aria-pressed", "false");
    });
    arenaSection.hidden = true;
    populationPanel.hidden = true;
    resultCard.hidden = true;
    setStatus("先押一拳，讓拳台開始運轉。 ");
    lastEvent.textContent = "等待第一輪配置";
    renderEmptyState();
  }

  function drawRoundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawToken(actor) {
    const type = TYPES[actor.type];
    const lift = Math.sin(actor.bob) * 0.8;
    const x = actor.visualX ?? actor.x;
    const y = (actor.visualY ?? actor.y) + lift;
    const radius = CONFIG.tokenRadius;
    context.save();
    context.translate(x, y);
    context.shadowColor = actor.flash > 0 ? "rgba(255,245,184,0.85)" : "rgba(0,0,0,0.58)";
    context.shadowBlur = actor.flash > 0 ? 10 : 5;
    context.shadowOffsetY = 2;

    const iconSprite = iconSprites[actor.type];
    const iconImage = iconImages[actor.type];
    if (iconSprite) {
      context.drawImage(iconSprite, -radius * 1.04, -radius * 1.04, radius * 2.08, radius * 2.08);
    } else if (iconImage?.complete && iconImage.naturalWidth > 0) {
      context.drawImage(iconImage, -radius * 1.04, -radius * 1.04, radius * 2.08, radius * 2.08);
    } else {
      context.scale(1.16, 1.16);
      context.strokeStyle = "rgba(255,255,255,0.9)";
      context.fillStyle = "rgba(255,255,255,0.94)";
      context.lineWidth = 2.1;
      context.lineCap = "round";
      if (actor.type === "scissors") {
        context.beginPath();
        context.moveTo(-4, -3);
        context.lineTo(5, -8);
        context.moveTo(-4, 3);
        context.lineTo(5, 8);
        context.stroke();
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(-5, -4, 2.8, 0, Math.PI * 2);
        context.arc(-5, 4, 2.8, 0, Math.PI * 2);
        context.stroke();
      } else if (actor.type === "rock") {
        context.save();
        context.rotate(-0.15);
        context.beginPath();
        context.moveTo(-7, 4);
        context.lineTo(-8, -3);
        context.lineTo(-3, -8);
        context.lineTo(5, -7);
        context.lineTo(8, -1);
        context.lineTo(5, 7);
        context.lineTo(-3, 8);
        context.closePath();
        context.fillStyle = "rgba(255,255,255,0.85)";
        context.fill();
        context.restore();
      } else {
        drawRoundedRect(-7, -8, 14, 17, 2);
        context.fillStyle = "rgba(255,255,255,0.88)";
        context.fill();
        context.strokeStyle = "rgba(75,106,133,0.7)";
        context.lineWidth = 1;
        context.stroke();
        context.beginPath();
        context.moveTo(2, -8);
        context.lineTo(2, -3);
        context.lineTo(7, -3);
        context.stroke();
      }
    }
    context.restore();
  }

  function drawBackground() {
    const width = CONFIG.canvasWidth;
    const height = CONFIG.canvasHeight;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#1a1815");
    background.addColorStop(0.52, "#121110");
    background.addColorStop(1, "#1b1714");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.strokeStyle = "rgba(246,235,222,0.055)";
    context.lineWidth = 1;
    for (let x = CONFIG.gridSize; x < width; x += CONFIG.gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = CONFIG.gridSize; y < height; y += CONFIG.gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    const glow = context.createRadialGradient(width * 0.52, height * 0.48, 20, width * 0.52, height * 0.48, width * 0.66);
    glow.addColorStop(0, "rgba(236,118,103,0.06)");
    glow.addColorStop(1, "rgba(236,118,103,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.setLineDash([6, 10]);
    context.strokeStyle = "rgba(241,195,107,0.16)";
    context.beginPath();
    context.arc(width / 2, height / 2, Math.min(width, height) * 0.29, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawFlash(flash) {
    const innerRadius = 9 + (1 - flash.life) * 9;
    const outerRadius = innerRadius + 7;
    context.save();
    context.globalAlpha = Math.max(0, flash.life) * 0.45;
    context.strokeStyle = flash.color;
    context.lineWidth = 1.8;
    context.lineCap = "round";
    context.beginPath();
    for (let ray = 0; ray < 4; ray += 1) {
      const angle = ray * Math.PI / 2;
      context.moveTo(flash.x + Math.cos(angle) * innerRadius, flash.y + Math.sin(angle) * innerRadius);
      context.lineTo(flash.x + Math.cos(angle) * outerRadius, flash.y + Math.sin(angle) * outerRadius);
    }
    context.stroke();
    context.restore();
  }

  function render() {
    drawBackground();
    if (state.actors.length === 0) return;
    state.collisionFlash.forEach(drawFlash);
    state.actors.forEach(drawToken);
    context.save();
    context.fillStyle = "rgba(246,235,222,0.48)";
    context.font = '700 10px "SFMono-Regular", Consolas, monospace';
    context.letterSpacing = "0.12em";
    context.fillText("FIST RING // LIVE", 25, CONFIG.canvasHeight - 22);
    context.fillText(`${String(state.tick).padStart(3, "0")} · 100MS`, CONFIG.canvasWidth - 104, CONFIG.canvasHeight - 22);
    context.restore();
  }

  function renderEmptyState() {
    drawBackground();
  }

  function updateVisualPositions(delta) {
    const blend = 1 - Math.exp(-delta / 42);
    for (const actor of state.actors) {
      actor.visualX += (actor.x - actor.visualX) * blend;
      actor.visualY += (actor.y - actor.visualY) * blend;
    }
  }

  function animate(timestamp) {
    if (!state.running) return;
    const delta = Math.min(60, Math.max(16, timestamp - state.lastTimestamp || 16));
    state.lastTimestamp = timestamp;
    state.pulse += delta / 1000;
    updateVisualPositions(delta);
    render();
    state.animationId = window.requestAnimationFrame(animate);
  }

  choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.running && !state.finished) startRound(button.dataset.choice);
    });
  });

  resetButton.addEventListener("click", () => {
    resetForNextRound();
  });

  nextRoundButton.addEventListener("click", () => {
    resetForNextRound();
    choiceButtons[0]?.focus();
  });

})();
