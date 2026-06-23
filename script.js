const startDate = new Date("2022-01-02T00:00:00");
const today = new Date();
const timeDifference = today - startDate;
let daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24)) + 1;
let gameState = "";
let savedGuesses = [];

function saveGameState() {
  const rowStatesToSave = [];
  
  for (let i = 0; i < savedGuesses.length; i++) {
    const row = [];
    for (let j = 0; j < GUESS_LENGTH; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`);
      if (cell) {
        if (cell.classList.contains("correct")) row.push("correct");
        else if (cell.classList.contains("present")) row.push("present");
        else if (cell.classList.contains("wrong")) row.push("wrong");
        else row.push("");
      } else {
        row.push("");
      }
    }
    rowStatesToSave.push(row);
  }

  const gameStateToSave = {
    currentGuess,
    currentRowIndex,
    target,
    daysDifference,
    gameState,
    savedGuesses,
    rowStates: rowStatesToSave,
  };
  localStorage.setItem("gameState", JSON.stringify(gameStateToSave));
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");

  if (savedState) {
    const parsedState = JSON.parse(savedState);

    if (parsedState.daysDifference === daysDifference) {
      currentGuess = parsedState.currentGuess || ""; 
      currentRowIndex = parsedState.currentRowIndex; 
      target = parsedState.target; 
      gameState = parsedState.gameState; 
      savedGuesses = parsedState.savedGuesses || []; 
      const savedRowStates = parsedState.rowStates || []; 
      targetJamoArray = target.split(""); 

      for (let i = 0; i < savedGuesses.length; i++) {
        const guess = savedGuesses[i];
        const states = savedRowStates[i];

        for (let j = 0; j < GUESS_LENGTH; j++) {
          const cell = document.getElementById(`cell-${i}-${j}`);
          if (cell && guess[j]) {
            cell.textContent = guess[j];
            const state = states && states[j] ? states[j] : "";

            if (state) {
              cell.classList.add(state);
              cell.classList.add("revealed");
            }
          }
        }
      }
      
      for (let j = 0; j < GUESS_LENGTH; j++) {
        const cell = document.getElementById(`cell-${currentRowIndex}-${j}`);
        if (cell && currentGuess[j]) {
          cell.textContent = currentGuess[j];
          cell.classList.add("filled");
        } else if (cell) {
          cell.textContent = "";
          cell.classList.remove("filled");
        }
      }

      updateKeyboardFromBoard();
      return parsedState;
    } else {
      localStorage.removeItem("gameState");
      currentGuess = "";
      currentRowIndex = 0;
      gameState = ""; 
      savedGuesses = []; 
      target = ""; 
      targetJamoArray = [];
      return null; 
    }
  } else {
    return null; 
  }
}

function updateKeyboardFromBoard() {
  const keyboardKeyStates = {};

  for (let i = 0; i < savedGuesses.length; i++) {
    const guess = savedGuesses[i];
    for (let j = 0; j < GUESS_LENGTH; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`);
      if (cell && guess[j]) {
        const jamo = guess[j];
        let state = null;
        if (cell.classList.contains("correct")) state = "correct";
        else if (cell.classList.contains("present")) state = "present";
        else if (cell.classList.contains("wrong")) state = "wrong";

        if (state) {
          if (keyboardKeyStates[jamo] === "correct") {
            continue;
          } else if (state === "correct") {
            keyboardKeyStates[jamo] = "correct";
          } else if (keyboardKeyStates[jamo] === "present") {
            continue;
          } else if (state === "present") {
            keyboardKeyStates[jamo] = "present";
          } else if (!keyboardKeyStates[jamo]) {
            keyboardKeyStates[jamo] = "wrong";
          }
        }
      }
    }
  }
  
  updateKeyboardAppearance(keyboardKeyStates);
}

async function loadWordsFromCSV(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  return text
    .split(",")
    .map((word) => word.replace(/'/g, "").trim())
    .filter((word) => word);
}

const QWERTY_TO_JAMO = {
  q: "ㅂ", w: "ㅈ", e: "ㄷ", r: "ㄱ", t: "ㅅ", y: "ㅛ", u: "ㅕ", i: "ㅑ", o: "ㅐ", p: "ㅔ",
  a: "ㅁ", s: "ㄴ", d: "ㅇ", f: "ㄹ", g: "ㅎ", h: "ㅗ", j: "ㅓ", k: "ㅏ", l: "ㅣ",
  z: "ㅋ", x: "ㅌ", c: "ㅊ", v: "ㅍ", b: "ㅠ", n: "ㅜ", m: "ㅡ",
};

let answerWordList = [];
let allowedGuessList = new Set();
let target = "";
let targetJamoArray = [];
let currentGuess = "";
let currentRowIndex = 0;
const MAX_TRIES = 6;
const GUESS_LENGTH = 6;

const boardElement = document.getElementById("board");
const keyboardElement = document.getElementById("keyboard");
const messageArea = document.getElementById("message-area");
const gameOverButtonsElement = document.getElementById("game-over-buttons");
const shareButton = document.getElementById("share-button");
const mastodonShareButton = document.getElementById("mastodon-share-button");

function displayMessage(msg, duration = 2500) {
  messageArea.textContent = msg;
  if (duration > 0) {
    setTimeout(() => {
      if (messageArea.textContent === msg) messageArea.textContent = "";
    }, duration);
  }
}

function chooseNewTarget() {
  if (answerWordList.length === 0) {
    displayMessage("답변 목록이 비어있습니다!", 0);
    disableInput();
    return;
  }
  target = answerWordList[daysDifference % answerWordList.length];
  targetJamoArray = target.split("");
}

function handleKey(key) {
  if (gameState !== "playing") return; 

  const currentCell = document.getElementById(`cell-${currentRowIndex}-${currentGuess.length}`);

  if (currentCell && currentCell.classList.contains("invalid")) {
    for (let i = 0; i < GUESS_LENGTH; i++) {
      const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
      if (cell) cell.classList.remove("invalid");
    }
  }

  if (key === "←") {
    currentGuess = currentGuess.slice(0, -1);
    const lastCell = document.getElementById(`cell-${currentRowIndex}-${currentGuess.length}`);
    if (lastCell) {
      lastCell.textContent = "";
      lastCell.classList.remove("filled", "invalid"); 
    }
  } else if (key === "✓") {
    if (currentGuess.length === GUESS_LENGTH) {
      submitGuess();
    } else {
      displayMessage(`글자 ${GUESS_LENGTH}개를 채워주세요.`);
    }
    return; 
  } else {
    if (currentGuess.length < GUESS_LENGTH) {
      currentGuess += key;
      const newCell = document.getElementById(`cell-${currentRowIndex}-${currentGuess.length - 1}`);
      if (newCell) {
        newCell.textContent = key;
        newCell.classList.add("filled");
      }
    }
  }

  if (currentGuess.length === GUESS_LENGTH) {
    if (!allowedGuessList.has(currentGuess)) {
      for (let i = 0; i < GUESS_LENGTH; i++) {
        const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
        if (cell) cell.classList.add("invalid");
      }
    }
  } else {
    for (let i = 0; i < GUESS_LENGTH; i++) {
      const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
      if (cell) cell.classList.remove("invalid");
    }
  }
}

function updateKeyboardAppearance(keyStates) {
  if (!keyboardElement) return;
  const keys = keyboardElement.querySelectorAll(".key");
  keys.forEach((keyEl) => {
    const jamo = keyEl.textContent || "";
    keyEl.classList.remove("correct", "present", "wrong");

    if (keyStates[jamo]) {
      keyEl.classList.add(keyStates[jamo]);
    }
  });
}

function submitGuess() {
  if (gameState !== "playing") return;
  if (currentGuess.length !== GUESS_LENGTH) {
    displayMessage(`글자 ${GUESS_LENGTH}개를 채워주세요.`);
    return;
  }
  if (!allowedGuessList.has(currentGuess)) {
    displayMessage("단어 목록에 없습니다!");
    for (let i = 0; i < GUESS_LENGTH; i++) {
      const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
      if (cell) cell.classList.add("invalid");
    }
    return; 
  }

  const guessArray = currentGuess.split("");
  const resultStates = Array(GUESS_LENGTH).fill("wrong");

  savedGuesses.push(currentGuess);

  const targetJamoCounts = {};
  targetJamoArray.forEach((jamo) => {
    targetJamoCounts[jamo] = (targetJamoCounts[jamo] || 0) + 1;
  });

  for (let i = 0; i < GUESS_LENGTH; i++) {
    if (guessArray[i] === targetJamoArray[i]) {
      resultStates[i] = "correct";
      targetJamoCounts[guessArray[i]]--; 
    }
  }

  for (let i = 0; i < GUESS_LENGTH; i++) {
    if (resultStates[i] === "correct") continue; 

    const guessedJamo = guessArray[i];
    if (targetJamoCounts[guessedJamo] && targetJamoCounts[guessedJamo] > 0) {
      resultStates[i] = "present";
      targetJamoCounts[guessedJamo]--; 
    } else {
      resultStates[i] = "wrong"; 
    }
  }

  for (let i = 0; i < GUESS_LENGTH; i++) {
    const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
    if (cell) {
      cell.classList.remove("invalid");
      setTimeout(() => {
        cell.classList.remove("filled"); 
        cell.classList.add(resultStates[i]); 
        cell.classList.add("revealed"); 
      }, i * 200);
    }
  }

  setTimeout(() => {
    updateKeyboardFromBoard(); 
  }, GUESS_LENGTH * 200); 

  const isWin = resultStates.every((state) => state === "correct");
  const isLoss = currentRowIndex >= MAX_TRIES - 1; 

  if (isWin || isLoss) {
    gameState = "finished"; 
    setTimeout(() => {
      displayMessage(isWin ? "정답입니다! 🎉" : `실패! 정답: "${target}"`, 0);
      showGameOverButtons(); 
      disableInput(); 
      saveGameState(); 
    }, GUESS_LENGTH * 200 + 500);
  } else {
    currentRowIndex++; 
    currentGuess = ""; 
    
    for (let i = 0; i < GUESS_LENGTH; i++) {
      const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
      if (cell) {
        cell.textContent = "";
        cell.classList.remove("invalid");
      }
    }
    setTimeout(() => {
      saveGameState(); 
    }, GUESS_LENGTH * 200 + 100);
  }
}

function disableInput() {
  if (!keyboardElement) return;
  const keys = keyboardElement.querySelectorAll(".key");
  keys.forEach((k) => {
    k.disabled = true;
    k.classList.add("disabled"); 
  });
  document.removeEventListener("keydown", handlePhysicalKeyboardInput);
}

function enableInput() {
  if (!keyboardElement) return;
  const keys = keyboardElement.querySelectorAll(".key");
  keys.forEach((k) => {
    k.disabled = false;
    k.classList.remove("disabled");
  });
  document.addEventListener("keydown", handlePhysicalKeyboardInput);
}

function handlePhysicalKeyboardInput(event) {
  if (gameState !== "playing") return; 

  const key = event.key.toLowerCase();
  if (QWERTY_TO_JAMO[key]) {
    handleKey(QWERTY_TO_JAMO[key]);
  } else if (key === "backspace") {
    handleKey("←");
    event.preventDefault(); 
  } else if (key === "enter") {
    handleKey("✓");
    event.preventDefault(); 
  }
}

function startGame(ce, fe) {
  if (boardElement) {
    boardElement.innerHTML = ""; 
    boardElement.style.gridTemplateColumns = `repeat(${GUESS_LENGTH}, 1fr)`; 
    for (let r = 0; r < MAX_TRIES; r++) {
      for (let c = 0; c < GUESS_LENGTH; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.id = `cell-${r}-${c}`;
        boardElement.appendChild(cell);
      }
    }
  }

  answerWordList = ce;
  allowedGuessList = new Set([...fe, ...ce]);

  const loadedState = loadGameState(); 

  if (loadedState && loadedState.gameState === "finished") {
    gameState = "finished"; 
    showGameOverButtons(); 
    disableInput(); 
  } else {
    if (!loadedState) {
      chooseNewTarget();
      currentRowIndex = 0; 
      savedGuesses = []; 
      currentGuess = ""; 
    }
    gameState = "playing"; 
    hideGameOverButtons(); 
    enableInput(); 
  }

  if (keyboardElement) {
    keyboardElement.innerHTML = ""; 

    const keysLayout = [
      ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ"],
      ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
      ["✓", "ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ", "←"],
    ];

    keysLayout.forEach((keyRowArray) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "key-row";
      keyRowArray.forEach((key) => {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.textContent = key;
        btn.id = `key-${key}`;
        btn.addEventListener("click", () => handleKey(key));
        if (key === "←" || key === "✓") btn.classList.add("wide");
        rowDiv.appendChild(btn);
      });
      keyboardElement.appendChild(rowDiv);
    });

    if (loadedState) {
      updateKeyboardFromBoard(); 
    } else {
      updateKeyboardAppearance({}); 
    }

    if (gameState === "finished") {
      disableInput();
    }
  }
}

function showGameOverButtons() {
  if (gameOverButtonsElement) {
    gameOverButtonsElement.classList.remove("hidden");
  }
}

function hideGameOverButtons() {
  if (gameOverButtonsElement) {
    gameOverButtonsElement.classList.add("hidden");
  }
}

function getShareText() {
  const guessesMade = savedGuesses.length;
  if (gameState !== "finished") return ""; 

  let text = `#오늘의꼬들 ${daysDifference} ${guessesMade}/${MAX_TRIES} \n https://iakordle.suwonmars.com \n\n`;

  for (let i = 0; i < guessesMade; i++) {
    for (let j = 0; j < GUESS_LENGTH; j++) {
      const cell = document.getElementById(`cell-${i}-${j}`);
      if (cell) {
        if (cell.classList.contains("correct")) text += "🟩";
        else if (cell.classList.contains("present")) text += "🟨";
        else text += "⬜";
      } else {
        text += "⬜";
      }
    }
    text += "\n";
  }

  return text;
}

window.onload = function () {
  displayMessage("단어 목록 로딩 중...", 0);

  Promise.all([
    loadWordsFromCSV("wordlist/malsaem.csv"),
    loadWordsFromCSV("wordlist/malsaem.csv"),
  ])
    .then(([ceData, feData]) => {
      displayMessage(""); 
      startGame(ceData, feData); 

      if (shareButton) {
        shareButton.addEventListener("click", () => {
          if (gameState === "finished") {
            const shareText = getShareText();
            navigator.clipboard
              .writeText(shareText)
              .then(() => displayMessage("결과가 클립보드에 복사되었습니다.", 3000))
              .catch(() => displayMessage("결과 복사에 실패했습니다.", 3000));
          }
        });
      }

      if (mastodonShareButton) {
        mastodonShareButton.addEventListener("click", () => {
          if (gameState === "finished") {
            const shareText = getShareText();
            const mastodonURL = `https://maximux.suwonmars.com/share?text=${encodeURIComponent(shareText)}`;
            window.open(mastodonURL, "_blank");
          }
        });
      }
    })
    .catch(() => {
      displayMessage("단어 목록을 불러오는 데 실패했습니다.", 0);
      disableInput(); 
    });
};
