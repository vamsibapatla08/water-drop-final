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
const startOverlay = document.getElementById("start-overlay");
const startButton = document.getElementById("start-btn");
const milestoneMessage = document.getElementById("milestone-message");
const dirtyDropNotice = document.getElementById("dirty-drop-notice");
const dirtyDropNoticeCloseButton = document.getElementById("dirty-drop-notice-close");
const difficultyLabelDisplay = document.getElementById("difficulty-label");
const roundGoalBadge = document.getElementById("round-goal-badge");
const roundGoalText = document.getElementById("round-goal-text");
const endTerrainAcknowledgement = document.getElementById("end-terrain-acknowledgement");
const endTerrainAckTitle = document.getElementById("end-terrain-ack-title");
const endTerrainAckText = document.getElementById("end-terrain-ack-text");
const dirtyDropRuleText = document.getElementById("dirty-drop-rule-text");
const bonusCanRuleText = document.getElementById("bonus-can-rule-text");
const endGameModal = document.getElementById("end-game-modal");
const endGameTitle = document.getElementById("end-game-title");
const endGameMessage = document.getElementById("end-game-message");
const finalScoreDisplay = document.getElementById("final-score-display");
const playAgainBtn = document.getElementById("play-again-btn");
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
    /* Sun halo effect */
    radial-gradient(circle at 85% 15%, rgba(255, 180, 0, 0.35) 0 8%, rgba(255, 200, 50, 0.15) 8% 18%, transparent 25%),
    /* Sun core */
    radial-gradient(circle at 85% 15%, #ffd700 0 3%, transparent 8%),
    /* Hot sky gradient */
    radial-gradient(ellipse 140% 100% at 50% 0%, rgba(255, 200, 100, 0.4) 0%, rgba(255, 160, 60, 0.2) 25%, transparent 50%),
    /* Light clouds effect */
    radial-gradient(circle at 20% 18%, rgba(255, 236, 178, 0.3) 0 16%, rgba(255, 236, 178, 0) 40%),
    radial-gradient(circle at 82% 26%, rgba(237, 170, 94, 0.28) 0 18%, rgba(237, 170, 94, 0) 45%),
    /* Sand dunes - back layer */
    radial-gradient(ellipse 180% 45% at 15% 75%, rgba(200, 140, 80, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 200% 50% at 85% 78%, rgba(180, 120, 60, 0.22) 0%, transparent 55%),
    /* Sand dunes - front layer */
    radial-gradient(ellipse 220% 60% at 50% 85%, rgba(160, 100, 40, 0.18) 0%, transparent 65%),
    /* Main sky to sand gradient */
    linear-gradient(180deg, 
      #ffe5b4 0%,
      #ffc966 15%,
      #ffb84d 30%,
      #f5a03a 45%,
      #d9843f 65%,
      #c78849 85%,
      #b5724a 100%
    )
  `,

  mountains: `
    radial-gradient(circle at 78% 16%, rgba(255, 255, 255, 0.34) 0 14%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(140deg, rgba(242, 248, 255, 0.5) 0 12%, rgba(242, 248, 255, 0) 13%),
    linear-gradient(38deg, rgba(245, 250, 255, 0.38) 0 10%, rgba(245, 250, 255, 0) 11%),
    radial-gradient(150% 62% at 22% 108%, rgba(86, 101, 120, 0.94) 0 56%, rgba(86, 101, 120, 0) 57%),
    radial-gradient(150% 58% at 78% 110%, rgba(65, 78, 95, 0.95) 0 54%, rgba(65, 78, 95, 0) 55%),
    linear-gradient(180deg, #d5e4f1 0%, #a8bdd2 44%, #7388a0 72%, #5a6d84 100%)
  `,

  frozen: `
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.6) 0 16%, rgba(255, 255, 255, 0) 42%),
    radial-gradient(140% 54% at 16% 108%, rgba(214, 236, 246, 0.94) 0 54%, rgba(214, 236, 246, 0) 55%),
    radial-gradient(140% 50% at 84% 110%, rgba(186, 221, 239, 0.95) 0 52%, rgba(186, 221, 239, 0) 53%),
    radial-gradient(72% 24% at 50% 86%, rgba(235, 248, 255, 0.42) 0 42%, rgba(235, 248, 255, 0) 43%),
    linear-gradient(180deg, #f5fcff 0%, #dceff8 42%, #b9d9ea 70%, #9fc6dc 100%)
  `,

  tundra: `
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.6) 0 16%, rgba(255, 255, 255, 0) 42%),
    radial-gradient(140% 54% at 16% 108%, rgba(214, 236, 246, 0.94) 0 54%, rgba(214, 236, 246, 0) 55%),
    radial-gradient(140% 50% at 84% 110%, rgba(186, 221, 239, 0.95) 0 52%, rgba(186, 221, 239, 0) 53%),
    radial-gradient(72% 24% at 50% 86%, rgba(235, 248, 255, 0.42) 0 42%, rgba(235, 248, 255, 0) 43%),
    linear-gradient(180deg, #f5fcff 0%, #dceff8 42%, #b9d9ea 70%, #9fc6dc 100%)
  `,

  grasslands: `
    radial-gradient(circle at 82% 16%, rgba(255, 255, 255, 0.34) 0 14%, rgba(255, 255, 255, 0) 40%),
    radial-gradient(150% 66% at 22% 108%, rgba(143, 196, 95, 0.95) 0 58%, rgba(143, 196, 95, 0) 59%),
    radial-gradient(150% 60% at 78% 108%, rgba(95, 162, 76, 0.96) 0 56%, rgba(95, 162, 76, 0) 57%),
    radial-gradient(90% 34% at 50% 94%, rgba(176, 220, 121, 0.6) 0 48%, rgba(176, 220, 121, 0) 49%),
    linear-gradient(180deg, #d8f4bf 0%, #bde89a 40%, #84c969 68%, #5ca14d 100%)
  `,
};

const terrainDropSettings = {
  default: {
    cleanAvailabilityMultiplier: 1,
    badDropChanceOverride: null,
    spawnRateMultiplierRange: [1, 1],
    fallDurationJitterRange: [1, 1],
    badDropVariants: [
      { className: "dirty-drop", weight: 1 },
    ],
  },

  desert: {
    // Scarcer clean water in the desert means more hazard drops overall.
    cleanAvailabilityMultiplier: 0.68,
    badDropChanceOverride: null,
    spawnRateMultiplierRange: [0.95, 1.08],
    fallDurationJitterRange: [0.95, 1.06],
    badDropVariants: [
      { className: "dirty-drop", weight: 0.55 },
      { className: "oil-can-drop", weight: 0.25 },
      { className: "animal-bone-drop", weight: 0.2 },
    ],
  },

  mountains: {
    // Rivers and rain can bring clean water, but runoff and trash create equal hazards.
    cleanAvailabilityMultiplier: 1,
    badDropChanceOverride: 0.5,
    spawnRateMultiplierRange: [0.76, 1.34],
    fallDurationJitterRange: [0.72, 1.36],
    badDropVariants: [
      { className: "dirty-drop", weight: 0.55 },
      { className: "plastic-trash-drop", weight: 0.45 },
    ],
  },
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
const activeTerrainDropSettings =
  terrainDropSettings[activeTerrainKey] || terrainDropSettings.default;
maxProgressScore = activeDifficulty.targetScore;
gameDurationSeconds = activeDifficulty.durationSeconds;
finalChallengeSeconds = activeDifficulty.finalChallengeSeconds;
timeLeft = gameDurationSeconds;

const winningMessages = [
  "Great work! You helped save more clean water today.",
  "Amazing catch! Clean water impact unlocked.",
  "You did it! More families can access safe water.",
  "Incredible effort! You collected enough water cans to help a community.",
  "Fantastic! Your water can collection makes a real difference.",
  "Outstanding! You've successfully collected water supplies for those in need.",
  "Brilliant work! Each water can you caught helps provide clean water access.",
  "Awesome! Together we're building a water-secure future.",
];

const milestoneMessages = [
  "Halfway there! You're collecting water cans like a pro.",
  "Great momentum! Keep catching those water cans.",
  "You're doing amazing! Halfway to victory and water collection goal.",
  "Nice work! 50% of the water cans are in your collection.",
  "Excellent progress! Your water can gathering is making an impact.",
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
let hasShownMilestoneMessage = false;

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

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    playClickSound();
    hideEndGameModal();
    startGame();
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
  hasShownMilestoneMessage = false;
  updateScoreDisplay();
  updateTimeDisplay();
  clearEndMessage();
  clearConfetti();
  hideDirtyDropNotice(true);
  hideMilestoneMessage();
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

  // In desert mode, clean drops are intentionally scarcer.
  const isBonusCanDrop = Math.random() < activeDifficulty.bonusCanChance;
  const adjustedBadDropChance = getAdjustedBadDropChance();
  const isBadDrop = !isBonusCanDrop && Math.random() < adjustedBadDropChance;
  const badDropClassName = isBadDrop ? getRandomBadDropClassName() : null;

  if (isBonusCanDrop) {
    drop.classList.add("bonus-can-drop");
  }

  if (isBadDrop && badDropClassName) {
    drop.classList.add(badDropClassName);
  }

  let pointChange = activeDifficulty.cleanDropPoints;
  if (isBadDrop) {
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

function getAdjustedBadDropChance() {
  if (typeof activeTerrainDropSettings.badDropChanceOverride === "number") {
    return clamp(activeTerrainDropSettings.badDropChanceOverride, 0, 0.96);
  }

  const baseBadDropChance = getDirtyDropChance();
  const cleanAvailabilityMultiplier =
    activeTerrainDropSettings.cleanAvailabilityMultiplier || 1;

  const adjustedBadDropChance = 1 - (1 - baseBadDropChance) * cleanAvailabilityMultiplier;
  return clamp(adjustedBadDropChance, 0, 0.96);
}

function getRandomBadDropClassName() {
  const badDropVariants = activeTerrainDropSettings.badDropVariants;
  if (!Array.isArray(badDropVariants) || badDropVariants.length === 0) {
    return "dirty-drop";
  }

  const totalWeight = badDropVariants.reduce((sum, variant) => sum + variant.weight, 0);
  if (totalWeight <= 0) {
    return badDropVariants[0].className;
  }

  let randomValue = Math.random() * totalWeight;

  for (const variant of badDropVariants) {
    randomValue -= variant.weight;
    if (randomValue <= 0) {
      return variant.className;
    }
  }

  return badDropVariants[badDropVariants.length - 1].className;
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
  const terrainSpawnRateMultiplier = getTerrainRangeValue(
    activeTerrainDropSettings.spawnRateMultiplierRange,
    1
  );
  const dropsPerSecond =
    baseDropsPerSecond * getCurrentPhaseMultiplier() * terrainSpawnRateMultiplier;
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

  const terrainFallDurationMultiplier = getTerrainRangeValue(
    activeTerrainDropSettings.fallDurationJitterRange,
    1
  );
  const fallDuration =
    ((phaseBaseDuration / getScoreRateDifficultyScale()) / activeDifficulty.fallSpeedMultiplier) *
    terrainFallDurationMultiplier;
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

function applyEndTerrainAcknowledgement() {
  if (!endTerrainAcknowledgement) return;

  if (activeTerrainKey !== "desert") {
    endTerrainAcknowledgement.classList.add("d-none");
    return;
  }

  endTerrainAcknowledgement.classList.remove("d-none");

  if (endTerrainAckTitle) {
    endTerrainAckTitle.textContent = "Desert Water Reality";
  }

  if (endTerrainAckText) {
    endTerrainAckText.textContent =
      "In many desert communities, water is found only rarely and families may walk miles each day to collect it. charity: water works to fund clean, reliable water projects so people can spend less time walking for water and more time building their future.";
  }
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

function getTerrainRangeValue(range, fallbackValue) {
  if (!Array.isArray(range) || range.length !== 2) {
    return fallbackValue;
  }

  const minValue = Number(range[0]);
  const maxValue = Number(range[1]);

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return fallbackValue;
  }

  if (minValue === maxValue) {
    return minValue;
  }

  const lower = Math.min(minValue, maxValue);
  const upper = Math.max(minValue, maxValue);
  return lower + Math.random() * (upper - lower);
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
  hasShownMilestoneMessage = false;
  updateScoreDisplay();
  updateTimeDisplay();
  clearEndMessage();
  clearConfetti();
  hideDirtyDropNotice(true);
  hideMilestoneMessage();
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

  // Check if milestone (50% progress) has been reached
  if (progressRatio >= 0.5 && !hasShownMilestoneMessage && gameRunning) {
    hasShownMilestoneMessage = true;
    showMilestoneMessage();
  }

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

  endGameTitle.textContent = wonRound ? "You Won!" : "Game Over";
  endGameMessage.textContent = baseMessage;
  finalScoreDisplay.textContent = `Final Score: ${score}`;
  applyEndTerrainAcknowledgement();

  showEndGameModal();

  if (wonRound) {
    playWinSound();
    launchConfetti();
  } else {
    clearConfetti();
  }
}

function showMilestoneMessage() {
  if (!milestoneMessage) return;

  const message = getRandomMessage(milestoneMessages);
  milestoneMessage.textContent = message;
  milestoneMessage.setAttribute("aria-hidden", "false");
  milestoneMessage.classList.add("show");

  // Auto-hide after 4 seconds
  setTimeout(() => {
    hideMilestoneMessage();
  }, 4000);
}

function hideMilestoneMessage() {
  if (!milestoneMessage) return;

  milestoneMessage.classList.remove("show");
  milestoneMessage.setAttribute("aria-hidden", "true");
}

function clearEndMessage() {
  hideEndGameModal();
}

function showEndGameModal() {
  if (!endGameModal) return;
  endGameModal.classList.remove("hidden");
  endGameModal.setAttribute("aria-hidden", "false");
}

function hideEndGameModal() {
  if (!endGameModal) return;
  endGameModal.classList.add("hidden");
  endGameModal.setAttribute("aria-hidden", "true");
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

// Always show the Round Briefing before gameplay starts, regardless of mode or terrain
showStartOverlay();
