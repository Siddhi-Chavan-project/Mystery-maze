
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas
  ? confettiCanvas.getContext("2d")
  : null;

const TILE = 40;
const COLS = 13;
const ROWS = 9;

// ==========================================
// FIVE GAME LEVELS
// ==========================================

const levels = [
  {
    name: "The Forgotten Entrance",
    time: 120,
    requiredKeys: 1,
    map: [
      "#############",
      "#P....#.....#",
      "#..##.#.###.#",
      "#....##.....#",
      "#K.#...T.#..#",
      "#..#...#....#",
      "#.....#..E..#",
      "#..T........#",
      "#############"
    ]
  },
  {
    name: "The Cursed Passage",
    time: 100,
    requiredKeys: 1,
    map: [
      "#############",
      "#P..#....T..#",
      "##..#..##...#",
      "#...#..#....#",
      "#.T....#.#K.#",
      "#.####...#..#",
      "#......T....#",
      "#..#.....E..#",
      "#############"
    ]
  },
  {
    name: "The Hidden Chamber",
    time: 90,
    requiredKeys: 2,
    map: [
      "#############",
      "#P....#.....#",
      "#.#...#..#..#",
      "#.#...#..#..#",
      "#K....#....K#",
      "#.....#.....#",
      "#...........#",
      "#....T...E..#",
      "#############"
    ]
  },
  {
    name: "The Shadow Guardian",
    time: 75,
    requiredKeys: 1,
    map: [
      "#############",
      "#P....#.....#",
      "#.##..#.##..#",
      "#..T....#...#",
      "###.##..#.K.#",
      "#...##..T...#",
      "#.####.##.#.#",
      "#..........E#",
      "#############"
    ]
  },
  {
    name: "The Final Seal",
    time: 70,
    requiredKeys: 2,
    map: [
      "#############",
      "#P....#.....#",
      "#.##..#.###.#",
      "#..K..#.....#",
      "####.##.##..#",
      "#....T..#K..#",
      "#.######.#..#",
      "#....R.....E#",
      "#############"
    ]
  }
];

// ==========================================
// GAME STATE
// ==========================================

let levelIndex = 0;
let map = [];
let player = { x: 1, y: 1 };

let lives = 3;
let keysCollected = 0;
let hasRelic = false;
let timeLeft = 120;

let active = false;
let paused = false;
let ended = false;

let lastTime = 0;
let elapsed = 0;
let totalMoves = 0;

let guardian = {
  x: 5,
  y: 7,
  direction: 1,
  stepTime: 0
};

const $ = id => document.getElementById(id);

const startScreen = $("startScreen");
const messageScreen = $("messageScreen");
const endScreen = $("endScreen");
const pauseBtn = $("pauseBtn");

// ==========================================
// CONFETTI CELEBRATION
// ==========================================

let confettiPieces = [];
let confettiAnimationId = null;

function resizeConfettiCanvas() {
  if (!confettiCanvas || !confettiCtx) return;

  const dpr = window.devicePixelRatio || 1;

  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;

  confettiCanvas.style.width = window.innerWidth + "px";
  confettiCanvas.style.height = window.innerHeight + "px";

  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeConfettiCanvas);
resizeConfettiCanvas();

function stopConfetti() {
  if (confettiAnimationId !== null) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }

  confettiPieces = [];

  if (confettiCtx) {
    confettiCtx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }
}

function startConfetti() {
  if (!confettiCanvas || !confettiCtx) return;

  stopConfetti();
  resizeConfettiCanvas();

  const colors = [
    "#FFD700",
    "#FF4D6D",
    "#00E5FF",
    "#A855F7",
    "#7CFF6B",
    "#FFFFFF",
    "#FF9F43"
  ];

  for (let i = 0; i < 180; i++) {
    confettiPieces.push({
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight,
      width: Math.random() * 8 + 4,
      height: Math.random() * 12 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 3 + 2,
      drift: Math.random() * 2 - 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: Math.random() * 0.12 - 0.06
    });
  }

  const startTime = performance.now();
  const duration = 7000;

  function animateConfetti(now) {
    if (!confettiCtx) return;

    confettiCtx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

    const progress = now - startTime;

    confettiPieces.forEach(piece => {
      piece.x += piece.drift;
      piece.y += piece.speed;
      piece.rotation += piece.rotationSpeed;

      // Wrap pieces horizontally.
      if (piece.x < -20) {
        piece.x = window.innerWidth + 20;
      } else if (piece.x > window.innerWidth + 20) {
        piece.x = -20;
      }

      confettiCtx.save();

      confettiCtx.translate(piece.x, piece.y);
      confettiCtx.rotate(piece.rotation);

      confettiCtx.fillStyle = piece.color;
      confettiCtx.shadowColor = piece.color;
      confettiCtx.shadowBlur = 8;

      confettiCtx.fillRect(
        -piece.width / 2,
        -piece.height / 2,
        piece.width,
        piece.height
      );

      confettiCtx.restore();
    });

    if (progress < duration) {
      confettiAnimationId =
        requestAnimationFrame(animateConfetti);
    } else {
      stopConfetti();
    }
  }

  confettiAnimationId =
    requestAnimationFrame(animateConfetti);
}

// ==========================================
// LOAD LEVEL
// ==========================================

function loadLevel(index) {
  levelIndex = index;
  map = levels[index].map.map(row => row.split(""));

  player = { x: 1, y: 1 };

  keysCollected = 0;
  hasRelic = false;
  timeLeft = levels[index].time;

  elapsed = 0;
  lastTime = 0;

  guardian = {
    x: 5,
    y: 7,
    direction: 1,
    stepTime: 0
  };

  updateHUD();
  drawGame();
}

// ==========================================
// NEW GAME
// ==========================================

function newGame() {
  stopConfetti();

  lives = 3;
  totalMoves = 0;

  active = false;
  paused = false;
  ended = false;

  startScreen.hidden = false;
  messageScreen.hidden = true;
  endScreen.hidden = true;
  pauseBtn.hidden = true;

  pauseBtn.textContent = "Ⅱ Pause";

  $("gameStatus").textContent = "AWAITING EXPLORER";

  loadLevel(0);
}

// ==========================================
// UPDATE HUD
// ==========================================

function updateHUD() {
  const level = levels[levelIndex];

  $("levelDisplay").textContent =
    `${String(levelIndex + 1).padStart(2, "0")} / 05`;

  $("levelName").textContent = level.name;

  $("lives").textContent =
    "♥ ".repeat(lives).trim() +
    (lives < 3 ? " ♡".repeat(3 - lives) : "");

  if (levelIndex === 4) {
    $("keyStatus").textContent = hasRelic
      ? `${keysCollected}/2 KEYS · RELIC ✓`
      : `${keysCollected}/2 KEYS · FIND RELIC`;
  } else {
    $("keyStatus").textContent =
      `${keysCollected}/${level.requiredKeys} KEYS`;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);

  $("timer").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ==========================================
// START / RESUME GAME
// ==========================================

function startGame() {
  if (ended) newGame();

  active = true;
  paused = false;

  startScreen.hidden = true;
  messageScreen.hidden = true;
  endScreen.hidden = true;
  pauseBtn.hidden = false;

  pauseBtn.textContent = "Ⅱ Pause";

  $("gameStatus").textContent =
    `EXPLORING LEVEL ${levelIndex + 1}`;

  lastTime = 0;
  requestAnimationFrame(gameLoop);
}

// ==========================================
// BETWEEN-LEVEL MESSAGE
// ==========================================

function showMessage({ icon, eyebrow, title, text, button, action }) {
  active = false;
  paused = false;

  messageScreen.hidden = false;
  pauseBtn.hidden = true;

  $("messageIcon").textContent = icon;
  $("messageEyebrow").textContent = eyebrow;
  $("messageTitle").textContent = title;
  $("messageText").textContent = text;
  $("messageBtn").innerHTML = `${button} <span>→</span>`;

  $("messageBtn").onclick = action;

  drawGame();
}

// ==========================================
// LEVEL COMPLETION
// ==========================================

function completeLevel() {
  if (levelIndex === levels.length - 1) {
    winGame();
    return;
  }

  const nextName = levels[levelIndex + 1].name;

  showMessage({
    icon: "✧",
    eyebrow: `CHAPTER ${levelIndex + 1} CLEARED`,
    title: "Level Complete",
    text: `You escaped ${levels[levelIndex].name}. ${lives} lives remain. Next: ${nextName}.`,
    button: "NEXT LEVEL",

    action: () => {
      messageScreen.hidden = true;
      loadLevel(levelIndex + 1);
      startGame();
    }
  });

  $("gameStatus").textContent =
    `LEVEL ${levelIndex + 1} COMPLETE`;
}

// ==========================================
// FINAL VICTORY
// ==========================================

function winGame() {
  active = false;
  paused = false;
  ended = true;

  startConfetti();

  pauseBtn.hidden = true;
  messageScreen.hidden = true;
  endScreen.hidden = false;

  $("endIcon").textContent = "✦";
  $("endEyebrow").textContent = "THE CURSE IS BROKEN";
  $("endTitle").textContent = "Temple Conquered";

  $("endMessage").textContent =
    `You conquered all five levels with ${lives} lives remaining and ${totalMoves} moves. The lost relic is yours.`;

  $("gameStatus").textContent = "ALL FIVE LEVELS COMPLETE";

  drawGame();
}

// ==========================================
// GAME OVER
// ==========================================

function loseGame(reason) {
  if (ended) return;

  active = false;
  paused = false;
  ended = true;

  stopConfetti();

  pauseBtn.hidden = true;
  messageScreen.hidden = true;
  endScreen.hidden = false;

  $("endIcon").textContent = "☠";
  $("endEyebrow").textContent = "LOST TO THE DARKNESS";
  $("endTitle").textContent = "The Temple Wins";
  $("endMessage").textContent = reason;

  $("gameStatus").textContent = "MISSION FAILED";

  drawGame();
}

// ==========================================
// PAUSE / RESUME
// ==========================================

function togglePause() {
  if (!active || ended) return;

  paused = !paused;

  pauseBtn.textContent =
    paused ? "▶ Resume" : "Ⅱ Pause";

  $("gameStatus").textContent = paused
    ? "GAME PAUSED"
    : `EXPLORING LEVEL ${levelIndex + 1}`;

  if (!paused) {
    lastTime = 0;
    requestAnimationFrame(gameLoop);
  } else {
    drawGame();
  }
}

// ==========================================
// PLAYER MOVEMENT
// ==========================================

function movePlayer(dx, dy) {
  if (!active || paused || ended) return;

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (
    nx < 0 || nx >= COLS ||
    ny < 0 || ny >= ROWS
  ) {
    return;
  }

  const tile = map[ny][nx];

  // Walls block movement.
  if (tile === "#") return;

  const requiredKeys = levels[levelIndex].requiredKeys;

  // Check exit requirements.
  if (tile === "E" && keysCollected < requiredKeys) {
    $("gameStatus").textContent =
      "THE GATE REQUIRES MORE KEYS";
    return;
  }

  if (tile === "E" && levelIndex === 4 && !hasRelic) {
    $("gameStatus").textContent =
      "THE FINAL RELIC IS STILL MISSING";
    return;
  }

  // Guardian collision in Level 4.
  if (
    levelIndex === 3 &&
    nx === guardian.x &&
    ny === guardian.y
  ) {
    lives--;
    player = { x: 1, y: 1 };

    $("gameStatus").textContent =
      "THE GUARDIAN CAUGHT YOU";

    updateHUD();
    drawGame();

    if (lives <= 0) {
      loseGame(
        "The Shadow Guardian has claimed your last life."
      );
    }

    return;
  }

  player.x = nx;
  player.y = ny;

  totalMoves++;

  // Collect keys.
  if (tile === "K") {
    keysCollected++;
    map[ny][nx] = ".";

    $("gameStatus").textContent =
      "ANCIENT KEY ACQUIRED";
  }

  // Collect final relic.
  else if (tile === "R") {
    hasRelic = true;
    map[ny][nx] = ".";

    $("gameStatus").textContent =
      "THE LOST RELIC IS YOURS";
  }

  // Cursed tiles cost one life.
  else if (tile === "T") {
    lives--;
    player = { x: 1, y: 1 };

    $("gameStatus").textContent =
      "CURSED TILE! RETURNED TO START";

    updateHUD();
    drawGame();

    if (lives <= 0) {
      loseGame(
        "The cursed chambers have claimed all your lives. Try again."
      );
    }

    return;
  }

  // Exit reached.
  else if (tile === "E") {
    updateHUD();
    drawGame();
    completeLevel();
    return;
  }

  else {
    $("gameStatus").textContent =
      "EXPLORING THE RUINS";
  }

  updateHUD();
  drawGame();
}

// ==========================================
// GAME LOOP AND TIMER
// ==========================================

function gameLoop(timestamp) {
  if (!active || paused || ended) return;

  if (lastTime === 0) {
    lastTime = timestamp;
  }

  const delta = Math.min(
    (timestamp - lastTime) / 1000,
    0.1
  );

  lastTime = timestamp;
  elapsed += delta;

  if (elapsed >= 1) {
    const seconds = Math.floor(elapsed);

    timeLeft = Math.max(0, timeLeft - seconds);
    elapsed -= seconds;

    updateHUD();
  }

  if (levelIndex === 3) {
    updateGuardian(delta);
  }

  if (ended) return;

  if (timeLeft <= 0) {
    drawGame();
    loseGame("Time ran out. The temple sealed its gates.");
    return;
  }

  drawGame();
  requestAnimationFrame(gameLoop);
}

// ==========================================
// SHADOW GUARDIAN PATROL
// ==========================================

function updateGuardian(delta) {
  guardian.stepTime += delta;

  if (guardian.stepTime < 0.65) return;

  guardian.stepTime = 0;

  const nextX = guardian.x + guardian.direction;
  const row = guardian.y;

  if (
    nextX < 1 ||
    nextX > 11 ||
    map[row][nextX] === "#"
  ) {
    guardian.direction *= -1;
  } else {
    guardian.x = nextX;
  }

  if (
    player.x === guardian.x &&
    player.y === guardian.y
  ) {
    lives--;
    player = { x: 1, y: 1 };

    $("gameStatus").textContent =
      "THE GUARDIAN CAUGHT YOU";

    updateHUD();

    if (lives <= 0) {
      loseGame(
        "The Shadow Guardian caught you for the final time."
      );
    }
  }
}

// ==========================================
// GLOW EFFECT
// ==========================================

function drawGlow(x, y, radius, color) {
  const gradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, radius
  );

  gradient.addColorStop(0, color + "88");
  gradient.addColorStop(1, color + "00");

  ctx.fillStyle = gradient;

  ctx.fillRect(
    x - radius,
    y - radius,
    radius * 2,
    radius * 2
  );
}

// ==========================================
// TEXT RENDERING
// ==========================================

function drawText(text, x, y, size, color) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${size}px Georgia, serif`;
  ctx.fillStyle = color;

  ctx.fillText(text, x, y);
}

// ==========================================
// DRAW MAZE, OBJECTS AND PLAYER
// ==========================================

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = map[y][x];

      const px = x * TILE;
      const py = y * TILE;

      // Walls.
      if (tile === "#") {
        ctx.fillStyle = "#202a3a";
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = "#344258";

        ctx.strokeRect(
          px + 2,
          py + 2,
          TILE - 4,
          TILE - 4
        );

        ctx.fillStyle = "#29364a";

        ctx.fillRect(
          px + 5,
          py + 5,
          TILE - 10,
          2
        );
      }

      // Floor and objects.
      else {
        ctx.fillStyle = "#111a29";
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = "#1d2a3d";
        ctx.strokeRect(px, py, TILE, TILE);

        // Keys.
        if (tile === "K") {
          drawGlow(
            px + 20,
            py + 20,
            18,
            "#e5bc65"
          );

          drawText(
            "⚿",
            px + 20,
            py + 21,
            22,
            "#f3d58b"
          );
        }

        // Cursed traps.
        if (tile === "T") {
          drawGlow(
            px + 20,
            py + 20,
            16,
            "#d34d66"
          );

          ctx.fillStyle = "#ff6379";

          ctx.beginPath();
          ctx.moveTo(px + 20, py + 8);
          ctx.lineTo(px + 31, py + 30);
          ctx.lineTo(px + 9, py + 30);
          ctx.closePath();
          ctx.fill();
        }

        // Relic.
        if (tile === "R") {
          drawGlow(
            px + 20,
            py + 20,
            22,
            "#c084fc"
          );

          drawText(
            "◆",
            px + 20,
            py + 21,
            21,
            "#e9c5ff"
          );
        }

        // Exit.
        if (tile === "E") {
          drawGlow(
            px + 20,
            py + 20,
            23,
            "#66b8ff"
          );

          ctx.strokeStyle = "#9bdbff";
          ctx.lineWidth = 3;

          ctx.strokeRect(
            px + 9,
            py + 5,
            22,
            31
          );

          ctx.fillStyle = "#40506b";

          ctx.fillRect(
            px + 14,
            py + 10,
            12,
            21
          );
        }
      }
    }
  }

  // Draw Level 4 guardian.
  if (levelIndex === 3) {
    const gx = guardian.x * TILE + TILE / 2;
    const gy = guardian.y * TILE + TILE / 2;

    drawGlow(gx, gy, 30, "#ff3d59");

    drawText(
      "☠",
      gx,
      gy + 1,
      25,
      "#ff697d"
    );
  }

  // Draw player.
  const cx = player.x * TILE + TILE / 2;
  const cy = player.y * TILE + TILE / 2;

  drawGlow(cx, cy, 30, "#5ba9ff");

  ctx.fillStyle = "#b5dcff";

  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0f8ff";

  ctx.beginPath();
  ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Cinematic darkness.
  const light = ctx.createRadialGradient(
    cx, cy, 18,
    cx, cy, 155
  );

  light.addColorStop(0, "rgba(0,0,0,0)");
  light.addColorStop(0.48, "rgba(0,0,0,0.22)");
  light.addColorStop(1, "rgba(0,0,0,0.91)");

  ctx.fillStyle = light;
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Pause overlay.
  if (paused) {
    ctx.fillStyle = "rgba(5,8,15,0.8)";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawText(
      "PAUSED",
      canvas.width / 2,
      canvas.height / 2,
      24,
      "#e4c78b"
    );
  }
}

// ==========================================
// KEYBOARD CONTROLS
// ==========================================

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (
    [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " "
    ].includes(key)
  ) {
    event.preventDefault();
  }

  if (key === "p" || key === "escape") {
    togglePause();
    return;
  }

  const directions = {
    arrowup: [0, -1],
    w: [0, -1],

    arrowdown: [0, 1],
    s: [0, 1],

    arrowleft: [-1, 0],
    a: [-1, 0],

    arrowright: [1, 0],
    d: [1, 0]
  };

  if (directions[key]) {
    movePlayer(...directions[key]);
  }
});

// ==========================================
// BUTTON EVENTS
// ==========================================

$("startBtn").addEventListener("click", startGame);
$("restartBtn").addEventListener("click", newGame);
pauseBtn.addEventListener("click", togglePause);

// ==========================================
// INITIALIZE GAME
// ==========================================

newGame();
