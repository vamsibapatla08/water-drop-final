// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let gameTimer;
let collisionChecker;
let score = 0;
let maxProgressScore = 20;
const dropSizePx = 48;
const spawnTickMs = 250;
let gameDurationSeconds = 30;
let finalChallengeSeconds = 6;
let timeLeft = gameDurationSeconds;
let spawnAccumulator = 0;

const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const gameContainer = document.getElementById("game-container");
const scoreProgressFill = document.getElementById("score-progress-fill");
const bucket = document.getElementById("bucket");
const gameMessage = document.getElementById("game-message");
const startOverlay = document.getElementById("start-overlay");
const startButton = document.getElementById("start-btn");
const dirtyDropNotice = document.getElementById("dirty-drop-notice");
const dirtyDropNoticeCloseButton = document.getElementById("dirty-drop-notice-close");
const difficultyLabelDisplay = document.getElementById("difficulty-label");
const roundGoalBadge = document.getElementById("round-goal-badge");
const roundGoalText = document.getElementById("round-goal-text");
const dirtyDropRuleText = document.getElementById("dirty-drop-rule-text");
const bonusCanRuleText = document.getElementById("bonus-can-rule-text");
const urlParams = new URLSearchParams(window.location.search);

// Audio system - using Web Audio API with data URIs for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to play a sound using Web Audio API synthetically
function playSound(frequency, duration, type = 'sine', volume = 0.3) {
  try {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.log('Audio playback error:', e);
  }
}

// Play positive sound when catching a clean drop
function playCollectSound() {
  playSound(800, 0.15, 'sine', 0.2);
  setTimeout(() => playSound(1200, 0.15, 'sine', 0.2), 80);
}

// Play celebration sound when catching a bonus can
function playBonusSound() {
  playSound(1000, 0.1, 'sine', 0.25);
  setTimeout(() => playSound(1300, 0.1, 'sine', 0.25), 60);
  setTimeout(() => playSound(1600, 0.15, 'sine', 0.25), 120);
}

// Play negative sound when hitting a dirty drop
function playMissSound() {
  playSound(400, 0.2, 'sine', 0.2);
  setTimeout(() => playSound(300, 0.25, 'sine', 0.2), 150);
}

// Play UI click sound
function playClickSound() {
  playSound(600, 0.08, 'sine', 0.15);
}

// Play victory fanfare when winning
function playWinSound() {
  playSound(800, 0.15, 'sine', 0.25);
  setTimeout(() => playSound(1000, 0.15, 'sine', 0.25), 150);
  setTimeout(() => playSound(1200, 0.3, 'sine', 0.25), 300);
}

const terrainBackgrounds = {
  desert: `
    radial-gradient(circle at 20% 18%, rgba(255, 236, 178, 0.28) 0 16%, rgba(255, 236, 178, 0) 40%),
    radial-gradient(circle at 82% 26%, rgba(237, 170, 94, 0.25) 0 18%, rgba(237, 170, 94, 0) 45%),
    linear-gradient(180deg, #ffe5ab 0%, #e8b366 45%, #c78849 100%)
  `,
  mountains: `
    radial-gradient(circle at 52% 18%, rgba(236, 242, 248, 0.26) 0 18%, rgba(236, 242, 248, 0) 44%),
    linear-gradient(165deg, rgba(95, 104, 118, 0.9) 0%, rgba(79, 88, 102, 0.9) 35%, rgba(53, 62, 73, 0.92) 100%),
    linear-gradient(180deg, #b9c4d1 0%, #8e9aa8 50%, #657383 100%)
  `,
  frozen: `
    radial-gradient(circle at 50% 14%, rgba(255, 255, 255, 0.48) 0 14%, rgba(255, 255, 255, 0) 40%),
    radial-gradient(circle at 14% 78%, rgba(147, 208, 244, 0.26) 0 22%, rgba(147, 208, 244, 0) 52%),
    linear-gradient(180deg, #eef9ff 0%, #ccecff 45%, #95cfee 100%)
  `,
  grasslands: `
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.34) 0 14%, rgba(255, 255, 255, 0) 40%),
    radial-gradient(circle at 84% 26%, rgba(149, 219, 112, 0.26) 0 18%, rgba(149, 219, 112, 0) 46%),
    linear-gradient(180deg, #d8f4b9 0%, #9ed97a 46%, #61a950 100%)
  `,
};

const difficultySettings = {
  easy: {
    label: "Easy",
    targetScore: 16,
    durationSeconds: 36,
    finalChallengeSeconds: 7,
    cleanDropPoints: 1,
    dirtyDropDamage: 1,
    bonusCanPoints: 5,
    bonusCanChance: 0.03,
    spawnRateMultiplier: 0.88,
    phaseMultiplierScale: 0.92,
    dirtyDropChance: {
      early: 0.3,
      mid: 0.38,
      late: 0.46,
      final: 0.54,
    },
    fallSpeedMultiplier: 0.9,
    minDropsPerSecond: 1,
    maxDropsPerSecond: 6.4,
    minFallDuration: 1.35,
    maxFallDuration: 5,
  },

  medium: {
    label: "Medium",
    targetScore: 20,
    durationSeconds: 30,
    finalChallengeSeconds: 6,
    cleanDropPoints: 1,
    dirtyDropDamage: 2,
    bonusCanPoints: 5,
    bonusCanChance: 0.03,
    spawnRateMultiplier: 1,
    phaseMultiplierScale: 1,
    dirtyDropChance: {
      early: 0.38,
      mid: 0.45,
      late: 0.52,
      final: 0.62,
    },
    fallSpeedMultiplier: 1,
    minDropsPerSecond: 1.1,
    maxDropsPerSecond: 7.5,
    minFallDuration: 1.2,
    maxFallDuration: 4.6,
  },
  
  hard: {
    label: "Hard",
    targetScore: 26,
    durationSeconds: 28,
    finalChallengeSeconds: 5,
    cleanDropPoints: 2,
    dirtyDropDamage: 3,
    bonusCanPoints: 4,
    bonusCanChance: 0.03,
    spawnRateMultiplier: 1.24,
    phaseMultiplierScale: 1.1,
    dirtyDropChance: {
      early: 0.45,
      mid: 0.56,
      late: 0.64,
      final: 0.72,
    },
    fallSpeedMultiplier: 1.22,
    minDropsPerSecond: 1.25,
    maxDropsPerSecond: 8.8,
    minFallDuration: 0.95,
    maxFallDuration: 4.2,
  },
};

const activeDifficultyKey = getDifficultyKeyFromQuery(urlParams.get("difficulty"));
const activeDifficulty = difficultySettings[activeDifficultyKey];
const activeTerrainKey = getTerrainKeyFromQuery(urlParams.get("terrain"));
maxProgressScore = activeDifficulty.targetScore;
gameDurationSeconds = activeDifficulty.durationSeconds;
finalChallengeSeconds = activeDifficulty.finalChallengeSeconds;
timeLeft = gameDurationSeconds;

const winningMessages = [
  "Great work! You helped save more clean water today.",
  "Amazing catch! Clean water impact unlocked.",
  "You did it! More families can access safe water.",
];

const losingMessages = [
  "Nice effort. Try again to collect even more clean water.",
  "Keep going. One more round can make a bigger splash.",
  "So close. Reset and catch a few more good drops.",
];

const confettiColors = ["#FFC907", "#2E9DF7", "#8BD1CB", "#4FCB53", "#FF902A", "#F5402C"];

let bucketX = 0;
let bucketTargetX = 0;
let bucketAnimationFrame = null;
let activePointerId = null;
const bucketStep = 28;
const bucketSmoothing = 0.22;
let confettiLayer = null;
let hasShownDirtyDropNotice = false;
let dirtyDropNoticeTimeoutId = null;

// Wait for button click to start the game
startButton.addEventListener("click", () => {
  playClickSound();
  startGame();
});
document.getElementById("reset-btn").addEventListener("click", () => {
  playClickSound();
  resetGame();
});
gameContainer.addEventListener("pointerdown", startPointerControl);
gameContainer.addEventListener("pointermove", moveBucketWithPointer);
gameContainer.addEventListener("pointerup", stopPointerControl);
gameContainer.addEventListener("pointercancel", stopPointerControl);
document.addEventListener("keydown", moveBucketWithKeyboard);
window.addEventListener("resize", handleWindowResize);

if (dirtyDropNoticeCloseButton) {
  dirtyDropNoticeCloseButton.addEventListener("click", () => {
    playClickSound();
    hideDirtyDropNotice(true);
  });
}

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  hideStartOverlay();
  gameRunning = true;
  startButton.disabled = true;
  score = 0;
  timeLeft = gameDurationSeconds;
  spawnAccumulator = 0;
  updateScoreDisplay();
  updateTimeDisplay();
  clearEndMessage();
  clearConfetti();
  hideDirtyDropNotice(true);
  centerBucket();

  // Spawn drops in short ticks so drop count can scale with difficulty
  dropMaker = setInterval(runDropSpawnerTick, spawnTickMs);
  gameTimer = setInterval(updateTimer, 1000);
  collisionChecker = setInterval(checkBucketCollisions, 50);
}

function createDrop() {
  if (!gameRunning) return;

  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.className = "water-drop";

  // Randomly mark some drops as dirty so both drop types appear
  const isBonusCanDrop = Math.random() < activeDifficulty.bonusCanChance;
  const isDirtyDrop = !isBonusCanDrop && Math.random() < getDirtyDropChance();

  if (isBonusCanDrop) {
    drop.classList.add("bonus-can-drop");
  }

  if (isDirtyDrop) {
    drop.classList.add("dirty-drop");
  }

  let pointChange = activeDifficulty.cleanDropPoints;
  if (isDirtyDrop) {
    pointChange = -activeDifficulty.dirtyDropDamage;
  } else if (isBonusCanDrop) {
    pointChange = activeDifficulty.bonusCanPoints;
  }

  drop.dataset.pointChange = String(pointChange);

  // Keep all drops at one consistent medium size.
  drop.style.width = drop.style.height = `${dropSizePx}px`;

  // Position the drop randomly across the game width
  const gameWidth = gameContainer.offsetWidth;
  const xPosition = Math.random() * Math.max(gameWidth - dropSizePx, 0);
  drop.style.left = xPosition + "px";

  // Fall speed increases over time and scales with target score rate
  drop.style.animationDuration = `${getDropFallDurationSeconds()}s`;
  drop.style.setProperty("--drop-fall-distance", `${gameContainer.clientHeight + 30}px`);

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Remove drops that reach the bottom without being caught
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}

function runDropSpawnerTick() {
  if (!gameRunning) return;

  const dropsPerSecond = getDropsPerSecondForCurrentTime();
  spawnAccumulator += (dropsPerSecond * spawnTickMs) / 1000;

  const dropsToCreate = Math.floor(spawnAccumulator); //lowest value 
  if (dropsToCreate <= 0) return;

  spawnAccumulator -= dropsToCreate;
  for (let i = 0; i < dropsToCreate; i += 1) {
    createDrop();
  }
}

function getDropsPerSecondForCurrentTime() {
  const baseDropsPerSecond =
    (maxProgressScore / gameDurationSeconds) * 2.75 * activeDifficulty.spawnRateMultiplier;
  const dropsPerSecond = baseDropsPerSecond * getCurrentPhaseMultiplier();
  return clamp(dropsPerSecond, activeDifficulty.minDropsPerSecond, activeDifficulty.maxDropsPerSecond);
}

function getDropFallDurationSeconds() {
  let phaseBaseDuration = 3.9;

  if (timeLeft <= finalChallengeSeconds) {
    phaseBaseDuration = 1.55;
  } else if (timeLeft <= gameDurationSeconds / 3) {
    phaseBaseDuration = 2.1;
  } else if (timeLeft <= (gameDurationSeconds * 2) / 3) {
    phaseBaseDuration = 2.9;
  }

  const fallDuration = (phaseBaseDuration / getScoreRateDifficultyScale()) / activeDifficulty.fallSpeedMultiplier;
  return clamp(fallDuration, activeDifficulty.minFallDuration, activeDifficulty.maxFallDuration);
}

function getCurrentPhaseMultiplier() {
  const phaseScale = activeDifficulty.phaseMultiplierScale;
  if (timeLeft <= finalChallengeSeconds) return 2.35 * phaseScale;
  if (timeLeft <= gameDurationSeconds / 3) return 1.85 * phaseScale;
  if (timeLeft <= (gameDurationSeconds * 2) / 3) return 1.35 * phaseScale;
  return 1;
}

function getDirtyDropChance() {
  if (timeLeft <= finalChallengeSeconds) return activeDifficulty.dirtyDropChance.final;
  if (timeLeft <= gameDurationSeconds / 3) return activeDifficulty.dirtyDropChance.late;
  if (timeLeft <= (gameDurationSeconds * 2) / 3) return activeDifficulty.dirtyDropChance.mid;
  return activeDifficulty.dirtyDropChance.early;
}

function getScoreRateDifficultyScale() {
  const targetScoreRate = maxProgressScore / gameDurationSeconds;
  return clamp(targetScoreRate * 1.5, 0.8, 1.8);
}

function getDifficultyKeyFromQuery(rawDifficulty) {
  const normalizedDifficulty = (rawDifficulty || "medium").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(difficultySettings, normalizedDifficulty)) {
    return normalizedDifficulty;
  }
  return "medium";
}

function getTerrainKeyFromQuery(rawTerrain) {
  const normalizedTerrain = (rawTerrain || "desert").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(terrainBackgrounds, normalizedTerrain)) {
    return normalizedTerrain;
  }
  return "desert";
}

function applyTerrainBackground() {
  if (!gameContainer) return;
  gameContainer.style.background = terrainBackgrounds[activeTerrainKey] || terrainBackgrounds.desert;
}

function getSecondWord(secondsValue) {
  return secondsValue === 1 ? "second" : "seconds";
}

function applyDifficultyDetailsToUi() {
  if (difficultyLabelDisplay) {
    difficultyLabelDisplay.textContent = activeDifficulty.label;
  }

  if (roundGoalBadge) {
    roundGoalBadge.textContent = `${maxProgressScore}+`;
  }

  if (roundGoalText) {
    roundGoalText.textContent = `Reach ${maxProgressScore} points before ${gameDurationSeconds} ${getSecondWord(gameDurationSeconds)} ends.`;
  }

  if (dirtyDropRuleText) {
    dirtyDropRuleText.textContent = `Avoid it to prevent -${activeDifficulty.dirtyDropDamage} score.`;
  }

  if (bonusCanRuleText) {
    bonusCanRuleText.textContent = `Very rare bonus catch worth +${activeDifficulty.bonusCanPoints} score.`;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateTimer() {
  timeLeft = Math.max(0, timeLeft - 1);
  updateTimeDisplay();

  if (timeLeft === 0) {
    endGame();
  }
}

function updateTimeDisplay() {
  timeDisplay.textContent = timeLeft;
}

function endGame() {
  gameRunning = false;
  startButton.disabled = false;
  activePointerId = null;
  clearInterval(dropMaker);
  clearInterval(gameTimer);
  clearInterval(collisionChecker);
  spawnAccumulator = 0;

  // Remove remaining drops when the round is over
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());

  showEndMessage();
}

function resetGame() {
  gameRunning = false;
  startButton.disabled = false;
  activePointerId = null;
  clearInterval(dropMaker);
  clearInterval(gameTimer);
  clearInterval(collisionChecker);

  score = 0;
  timeLeft = gameDurationSeconds;
  spawnAccumulator = 0;
  updateScoreDisplay();
  updateTimeDisplay();
  clearEndMessage();
  clearConfetti();
  hideDirtyDropNotice(true);
  showStartOverlay();
  centerBucket();

  // Clear any drops currently visible in the game area
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
}

function moveBucketWithPointer(event) {
  if (!gameRunning) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;

  const containerRect = gameContainer.getBoundingClientRect();
  const targetX = event.clientX - containerRect.left - bucket.offsetWidth / 2;
  setBucketTarget(targetX);
}

function startPointerControl(event) {
  if (!gameRunning) return;

  activePointerId = event.pointerId;
  gameContainer.setPointerCapture(event.pointerId);
  moveBucketWithPointer(event);
}

function stopPointerControl(event) {
  if (activePointerId !== event.pointerId) return;

  if (gameContainer.hasPointerCapture(event.pointerId)) {
    gameContainer.releasePointerCapture(event.pointerId);
  }

  activePointerId = null;
}

function moveBucketWithKeyboard(event) {
  if (!gameRunning) return;

  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    setBucketTarget(bucketTargetX - bucketStep);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    setBucketTarget(bucketTargetX + bucketStep);
  }
}

function setBucketPositionImmediate(nextX) {
  bucketTargetX = clamp(nextX, 0, getBucketMaxX());
  bucketX = bucketTargetX;
  bucket.style.left = `${bucketX}px`;

  if (bucketAnimationFrame !== null) {
    cancelAnimationFrame(bucketAnimationFrame);
    bucketAnimationFrame = null;
  }
}

function setBucketTarget(nextX) {
  bucketTargetX = clamp(nextX, 0, getBucketMaxX());

  if (bucketAnimationFrame === null) {
    bucketAnimationFrame = requestAnimationFrame(animateBucketMovement);
  }
}

function animateBucketMovement() {
  const distance = bucketTargetX - bucketX;

  if (Math.abs(distance) < 0.5) {
    bucketX = bucketTargetX;
    bucket.style.left = `${bucketX}px`;
    bucketAnimationFrame = null;
    return;
  }

  bucketX += distance * bucketSmoothing;
  bucket.style.left = `${bucketX}px`;
  bucketAnimationFrame = requestAnimationFrame(animateBucketMovement);
}

function getBucketMaxX() {
  return Math.max(0, gameContainer.clientWidth - bucket.offsetWidth);
}

function centerBucket() {
  const centeredX = getBucketMaxX() / 2;
  setBucketPositionImmediate(centeredX);
}

function checkBucketCollisions() {
  if (!gameRunning) return;

  const bucketRect = bucket.getBoundingClientRect();

  gameContainer.querySelectorAll(".water-drop").forEach((drop) => {
    const dropRect = drop.getBoundingClientRect();
    const overlapsBucket =
      dropRect.bottom >= bucketRect.top &&
      dropRect.top <= bucketRect.bottom &&
      dropRect.right >= bucketRect.left &&
      dropRect.left <= bucketRect.right;

    if (overlapsBucket) {
      const pointChange = Number(drop.dataset.pointChange || "1");
      
      // Play appropriate sound based on drop type
      if (pointChange < 0) {
        // Dirty drop - negative sound
        playMissSound();
        showDirtyDropNoticeOnce();
      } else if (pointChange > activeDifficulty.cleanDropPoints) {
        // Bonus can - celebration sound
        playBonusSound();
      } else {
        // Clean drop - positive sound
        playCollectSound();
      }
      
      score = Math.max(0, score + pointChange);
      updateScoreDisplay();
      drop.remove();
    }
  });
}

function updateScoreDisplay() {
  scoreDisplay.textContent = score;

  const progressRatio = Math.min(score / maxProgressScore, 1);
  const progressPercent = `${progressRatio * 100}%`;
  const isMobileScreen = window.matchMedia("(max-width: 560px)").matches;

  if (isMobileScreen) {
    scoreProgressFill.style.width = progressPercent;
    scoreProgressFill.style.height = "100%";
    return;
  }

  scoreProgressFill.style.height = progressPercent;
  scoreProgressFill.style.width = "100%";
}

function handleWindowResize() {
  centerBucket();
  updateScoreDisplay();
}

function showEndMessage() {
  const wonRound = score >= maxProgressScore;
  const baseMessage = getRandomMessage(wonRound ? winningMessages : losingMessages);
  const finalMessage = `${baseMessage} Final score: ${score}.`;

  gameMessage.textContent = finalMessage;
  gameMessage.classList.remove("win", "lose");
  gameMessage.classList.add(wonRound ? "win" : "lose");

  if (wonRound) {
    playWinSound();
    launchConfetti();
  } else {
    clearConfetti();
  }
}

function clearEndMessage() {
  gameMessage.textContent = "";
  gameMessage.classList.remove("win", "lose");
}

function showStartOverlay() {
  if (!startOverlay) return;
  startOverlay.classList.remove("hidden");
  startOverlay.setAttribute("aria-hidden", "false");
}

function hideStartOverlay() {
  if (!startOverlay) return;
  startOverlay.classList.add("hidden");
  startOverlay.setAttribute("aria-hidden", "true");
}

function showDirtyDropNoticeOnce() {
  if (hasShownDirtyDropNotice || !dirtyDropNotice) return;

  hasShownDirtyDropNotice = true;
  hideDirtyDropNotice(true);
  dirtyDropNotice.classList.remove("d-none");
  requestAnimationFrame(() => dirtyDropNotice.classList.add("show"));

  dirtyDropNoticeTimeoutId = setTimeout(() => {
    hideDirtyDropNotice();
  }, 5200);
}

function hideDirtyDropNotice(immediate = false) {
  if (!dirtyDropNotice) return;

  if (dirtyDropNoticeTimeoutId !== null) {
    clearTimeout(dirtyDropNoticeTimeoutId);
    dirtyDropNoticeTimeoutId = null;
  }

  dirtyDropNotice.classList.remove("show");

  if (immediate) {
    dirtyDropNotice.classList.add("d-none");
    return;
  }

  setTimeout(() => {
    if (!dirtyDropNotice.classList.contains("show")) {
      dirtyDropNotice.classList.add("d-none");
    }
  }, 180);
}

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function launchConfetti() {
  clearConfetti();

  confettiLayer = document.createElement("div");
  confettiLayer.style.position = "fixed";
  confettiLayer.style.inset = "0";
  confettiLayer.style.pointerEvents = "none";
  confettiLayer.style.overflow = "hidden";
  confettiLayer.style.zIndex = "9999";
  document.body.appendChild(confettiLayer);

  const pieceCount = 110;
  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 7;
    const drift = (Math.random() - 0.5) * 240;
    const rotate = (Math.random() - 0.5) * 1440;
    const duration = 1800 + Math.random() * 1400;
    const delay = Math.random() * 450;

    piece.style.position = "absolute";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.top = "-14vh";
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (1.2 + Math.random() * 1.4)}px`;
    piece.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.borderRadius = `${Math.random() * 3}px`;
    piece.style.opacity = "0.95";

    confettiLayer.appendChild(piece);

    const animation = piece.animate(
      [
        { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate3d(${drift}px, 112vh, 0) rotate(${rotate}deg)`,
          opacity: 0.9,
        },
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(0.2, 0.78, 0.25, 1)",
        fill: "forwards",
      }
    );

    animation.onfinish = () => piece.remove();
  }

  setTimeout(() => {
    clearConfetti();
  }, 3800);
}

function clearConfetti() {
  if (!confettiLayer) return;
  confettiLayer.remove();
  confettiLayer = null;
}

function isPageReloadNavigation() {
  const navigationEntries = performance.getEntriesByType("navigation");
  if (navigationEntries.length > 0) {
    return navigationEntries[0].type === "reload";
  }

  if (performance.navigation) {
    return performance.navigation.type === 1;
  }

  return false;
}

applyDifficultyDetailsToUi();
applyTerrainBackground();
updateScoreDisplay();
updateTimeDisplay();
centerBucket();
clearEndMessage();

if (isPageReloadNavigation()) {
  window.location.replace("index.html");
}

const shouldAutoStart = ["1", "true", "yes"].includes((urlParams.get("autostart") || "").toLowerCase());

if (shouldAutoStart) {
  startGame();
} else {
  showStartOverlay();
}
