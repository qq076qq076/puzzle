(function () {
  "use strict";

  const CODE_LENGTH = 4;

  const guessForm = document.getElementById("guess-form");
  const guessInput = document.getElementById("guess-input");
  const guessStatus = document.getElementById("guess-status");
  const roundNumberElement = document.getElementById("round-number");
  const roundStatusElement = document.getElementById("round-status");
  const recordCountElement = document.getElementById("record-count");
  const recordListElement = document.getElementById("record-list");
  const recordEmptyElement = document.getElementById("record-empty");
  const submitButton = guessForm.querySelector("button[type=submit]");
  const nextRoundButton = document.getElementById("next-round");
  const clearGuessButton = document.getElementById("clear-guess");
  const numberButtons = Array.from(document.querySelectorAll("[data-digit]"));

  let secretCode = "";
  let records = [];
  let roundNumber = 1;

  function createSecretCode() {
    const digits = Array.from({ length: 10 }, function (_, index) {
      return String(index);
    });

    for (let index = digits.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const temporaryDigit = digits[index];
      digits[index] = digits[randomIndex];
      digits[randomIndex] = temporaryDigit;
    }

    return digits.slice(0, CODE_LENGTH).join("");
  }

  function formatRoundNumber(value) {
    return String(value).padStart(2, "0");
  }

  function evaluateGuess(guess) {
    let exactMatches = 0;
    const unmatchedSecretDigits = [];
    const unmatchedGuessDigits = [];

    for (let index = 0; index < CODE_LENGTH; index += 1) {
      if (guess[index] === secretCode[index]) {
        exactMatches += 1;
      } else {
        unmatchedSecretDigits.push(secretCode[index]);
        unmatchedGuessDigits.push(guess[index]);
      }
    }

    const misplacedMatches = unmatchedGuessDigits.reduce(function (matches, digit) {
      return matches + (unmatchedSecretDigits.includes(digit) ? 1 : 0);
    }, 0);

    return { a: exactMatches, b: misplacedMatches };
  }

  function renderRecords() {
    recordListElement.innerHTML = "";
    recordCountElement.textContent = String(records.length) + " 次";
    recordEmptyElement.hidden = records.length !== 0;
    recordListElement.appendChild(recordEmptyElement);

    records.forEach(function (record, index) {
      const item = document.createElement("li");
      item.className = "record-item";

      const number = document.createElement("span");
      number.className = "record-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const guess = document.createElement("strong");
      guess.className = "record-guess";
      guess.textContent = record.guess;

      const result = document.createElement("span");
      result.className = "record-result";
      result.setAttribute("aria-label", record.a + "A" + record.b + "B");

      const aResult = document.createElement("span");
      aResult.className = "result-a";
      aResult.textContent = record.a + "A";

      const bResult = document.createElement("span");
      bResult.className = "result-b";
      bResult.textContent = record.b + "B";

      result.append(aResult, bResult);
      item.append(number, guess, result);
      recordListElement.appendChild(item);
    });
  }

  function setStatus(message, statusClass) {
    guessStatus.textContent = message;
    guessStatus.className = "guess-status" + (statusClass ? " " + statusClass : "");
  }

  function startRound(isNextRound) {
    if (isNextRound) {
      roundNumber += 1;
    }

    secretCode = createSecretCode();
    records = [];
    roundNumberElement.textContent = formatRoundNumber(roundNumber);
    roundStatusElement.textContent = "題目已準備好";
    guessInput.disabled = false;
    submitButton.disabled = false;
    numberButtons.forEach(function (button) { button.disabled = false; });
    clearGuessButton.disabled = false;
    nextRoundButton.hidden = true;
    guessInput.value = "";
    setStatus(isNextRound ? "新題目已準備好，回答紀錄已清空。" : "電腦已出題，開始猜吧。", "is-ready");
    renderRecords();
    guessInput.focus();
  }

  function restoreRound(saved) {
    secretCode = saved.secretCode;
    records = saved.records;
    roundNumber = saved.roundNumber;
    const solved = records.some(function (record) { return record.a === CODE_LENGTH; });
    roundNumberElement.textContent = formatRoundNumber(roundNumber);
    roundStatusElement.textContent = solved ? "答對了！可以復盤" : "題目已準備好";
    guessInput.disabled = solved;
    submitButton.disabled = solved;
    numberButtons.forEach(function (button) { button.disabled = solved; });
    clearGuessButton.disabled = solved;
    nextRoundButton.hidden = !solved;
    guessInput.value = "";
    renderRecords();
    setStatus(solved ? "已恢復答題紀錄，可以開始下一題。" : "已恢復上次的題目與回答紀錄。", solved ? "is-success" : "is-ready");
  }

  function validateGuess(guess) {
    if (!/^\d{4}$/.test(guess)) {
      return "請輸入 4 位數字。";
    }

    if (new Set(guess).size !== CODE_LENGTH) {
      return "數字不可重複，請換一組猜測。";
    }

    if (records.some(function (record) { return record.guess === guess; })) {
      return "這組數字已經猜過了，換一組吧。";
    }

    return null;
  }

  function handleGuess(event) {
    event.preventDefault();
    const guess = guessInput.value.trim();
    const validationMessage = validateGuess(guess);

    if (validationMessage) {
      setStatus(validationMessage, "is-error");
      guessInput.focus();
      return;
    }

    const result = evaluateGuess(guess);
    records.unshift({ guess: guess, a: result.a, b: result.b });
    renderRecords();
    guessInput.value = "";

    if (result.a === CODE_LENGTH) {
      guessInput.disabled = true;
      submitButton.disabled = true;
      numberButtons.forEach(function (button) { button.disabled = true; });
      clearGuessButton.disabled = true;
      nextRoundButton.hidden = false;
      roundStatusElement.textContent = "答對了！可以復盤";
      setStatus("答對了！先看看這題的回答紀錄，準備好後開始下一題。", "is-success");
      nextRoundButton.focus();
      return;
    }

    setStatus("這次是 " + result.a + "A" + result.b + "B，再試一組。", "is-result");
    guessInput.focus();
  }

  function appendDigit(digit) {
    if (guessInput.disabled || guessInput.value.length >= CODE_LENGTH) {
      return;
    }

    if (guessInput.value.includes(digit)) {
      setStatus("數字不可重複，請選擇其他數字。", "is-error");
      guessInput.focus();
      return;
    }

    guessInput.value += digit;
    guessInput.focus();
  }

  function clearGuess() {
    if (guessInput.disabled) {
      return;
    }

    guessInput.value = "";
    setStatus("已清除目前猜測。", "is-ready");
    guessInput.focus();
  }

  numberButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      appendDigit(button.dataset.digit);
    });
  });

  clearGuessButton.addEventListener("click", clearGuess);
  nextRoundButton.addEventListener("click", function () {
    startRound(true);
  });
  guessForm.addEventListener("submit", handleGuess);
  window.PuzzleSave.create({
    key: "1a2b",
    fresh: function () { roundNumber = 1; startRound(false); },
    restore: restoreRound,
    validate: function (saved) {
      return saved && /^\d{4}$/.test(saved.secretCode) && new Set(saved.secretCode).size === CODE_LENGTH &&
        Array.isArray(saved.records) && Number.isInteger(saved.roundNumber) && saved.roundNumber > 0;
    },
    getState: function () { return { secretCode: secretCode, records: records, roundNumber: roundNumber }; }
  });
}());
