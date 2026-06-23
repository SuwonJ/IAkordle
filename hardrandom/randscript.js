let gameState = "";

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
  target = answerWordList[Math.floor(Math.random() * answerWordList.length)];
  targetJamoArray = target.split("");
}

function handleKey(key) {
  if (gameState !== "playing") return;

  if (key === "←") {
    currentGuess = currentGuess.slice(0, -1);
  } else if (key === "✓") {
    if (currentGuess.length === GUESS_LENGTH) {
      if (allowedGuessList.has(currentGuess)) {
        submitGuess();
      } else {
        displayMessage("단어 목록에 없습니다!");
      }
    } else {
      displayMessage(`글자 ${GUESS_LENGTH}개를 채워주세요.`);
    }
    return;
  } else {
    if (currentGuess.length < GUESS_LENGTH) {
      currentGuess += key;
    }
  }

  if (currentGuess.length === GUESS_LENGTH) {
    if (!allowedGuessList.has(currentGuess)) {
      for (let i = 0; i < GUESS_LENGTH; i++) {
        const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
        if (cell) {
          cell.classList.add("invalid");
        }
      }
    }
  } else {
    for (let i = 0; i < GUESS_LENGTH; i++) {
      const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
      if (cell) {
        cell.classList.remove("invalid");
      }
    }
  }
  updateBoard();
}

function updateBoard() {
  if (!boardElement) return;
  for (let i = 0; i < GUESS_LENGTH; i++) {
    const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
    if (cell) {
      cell.textContent = currentGuess[i] || "";
      if (currentGuess[i]) {
        cell.classList.add("filled");
      } else {
        cell.classList.remove("filled");
      }
    }
  }
}

function updateKeyboardAppearance(keyStates) {
  if (!keyboardElement) return;
  const keys = keyboardElement.querySelectorAll(".key");
  keys.forEach((keyEl) => {
    const jamo = keyEl.textContent || "";
    if (keyStates[jamo]) {
      if (keyStates[jamo] === "correct") {
        keyEl.classList.remove("present", "wrong");
        keyEl.classList.add("correct");
      } else if (
        keyStates[jamo] === "present" &&
        !keyEl.classList.contains("correct")
      ) {
        keyEl.classList.remove("wrong");
        keyEl.classList.add("present");
      } else if (
        keyStates[jamo] === "wrong" &&
        !keyEl.classList.contains("correct") &&
        !keyEl.classList.contains("present")
      ) {
        keyEl.classList.add("wrong");
      }
    }
  });
}

function submitGuess() {
  const guessArray = currentGuess.split("");
  const resultStates = Array(GUESS_LENGTH).fill("wrong");
  const keyboardKeyStates = {};

  const targetJamoCounts = {};
  targetJamoArray.forEach((jamo) => {
    targetJamoCounts[jamo] = (targetJamoCounts[jamo] || 0) + 1;
  });

  for (let i = 0; i < GUESS_LENGTH; i++) {
    if (guessArray[i] === targetJamoArray[i]) {
      resultStates[i] = "correct";
      targetJamoCounts[guessArray[i]]--;
      keyboardKeyStates[guessArray[i]] = "correct";
    }
  }

  for (let i = 0; i < GUESS_LENGTH; i++) {
    if (resultStates[i] === "correct") continue;

    const guessedJamo = guessArray[i];
    if (targetJamoCounts[guessedJamo] && targetJamoCounts[guessedJamo] > 0) {
      resultStates[i] = "present";
      targetJamoCounts[guessedJamo]--;
      if (keyboardKeyStates[guessedJamo] !== "correct") {
        keyboardKeyStates[guessedJamo] = "present";
      }
    } else {
      if (!keyboardKeyStates[guessedJamo]) {
        keyboardKeyStates[guessedJamo] = "wrong";
      }
    }
  }

  for (let i = 0; i < GUESS_LENGTH; i++) {
    const cell = document.getElementById(`cell-${currentRowIndex}-${i}`);
    if (cell) {
      setTimeout(() => {
        cell.classList.remove("filled");
        cell.classList.add(resultStates[i]);
        cell.classList.add("revealed");
      }, i * 200);
    }
  }

  updateKeyboardAppearance(keyboardKeyStates);

  if (resultStates.every((state) => state === "correct")) {
    setTimeout(
      () => {
        displayMessage("정답입니다! 🎉", 0);
        gameState = "finished";
        disableInput();
      },
      GUESS_LENGTH * 200 + 100,
    );
  } else {
    currentRowIndex++;
    currentGuess = "";
    if (currentRowIndex >= MAX_TRIES) {
      setTimeout(
        () => {
          displayMessage(`실패! 정답: "${target}"`, 0);
          gameState = "finished";
          disableInput();
        },
        GUESS_LENGTH * 200 + 100,
      );
    } else {
      setTimeout(() => {}, GUESS_LENGTH * 200 + 100);
    }
  }
}

function disableInput() {
  if (!keyboardElement) return;
  const keys = keyboardElement.querySelectorAll(".key");
  keys.forEach((k) => {
    k.disabled = true;
  });

  const clonedKeyboard = keyboardElement.cloneNode(true);
  if (keyboardElement.parentNode) {
    keyboardElement.parentNode.replaceChild(clonedKeyboard, keyboardElement);
  }

  document.removeEventListener("keydown", handlePhysicalKeyboardInput);
}

function handlePhysicalKeyboardInput(event) {
  const key = event.key.toLowerCase();
  if (QWERTY_TO_JAMO[key]) {
    handleKey(QWERTY_TO_JAMO[key]);
  } else if (key === "backspace") {
    handleKey("←");
  } else if (key === "enter") {
    handleKey("✓");
  }
}

function startGame(ce, fe) {
  if (boardElement) {
    boardElement.innerHTML = "";
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
  chooseNewTarget();

  currentGuess = "";
  gameState = "playing";

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
  }

  document.addEventListener("keydown", handlePhysicalKeyboardInput);
}

window.onload = function () {
  Promise.all([
    loadWordsFromCSV("../wordlist/ce.csv"),
    loadWordsFromCSV("../wordlist/fe.csv"),
  ])
    .then(([ceData, feData]) => {
      startGame(feData, feData);
    })
    .catch((error) => {
      displayMessage("단어 목록을 불러오는 데 실패했습니다.", 0);
    });
};
