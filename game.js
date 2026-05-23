const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const scoreEl = document.querySelector("#score");
const coinsEl = document.querySelector("#coins");
const speedEl = document.querySelector("#speed");
const overlay = document.querySelector("#overlay");
const overlayText = document.querySelector("#overlayText");
const overlayTitle = overlay.querySelector("h1");
const deathChoices = document.querySelector("#deathChoices");
const deathYes = document.querySelector("#deathYes");
const deathNo = document.querySelector("#deathNo");
const pauseChoices = document.querySelector("#pauseChoices");
const pauseResume = document.querySelector("#pauseResume");
const pauseRestart = document.querySelector("#pauseRestart");

const W = canvas.width;
const H = canvas.height;
const FLOOR_Y = 390;
const GRAVITY = 2550;
const JUMP_VELOCITY = -660;
const JUMP_HOLD_FORCE = 1850;
const JUMP_HOLD_TIME = 0.22;
const JUMP_RELEASE_CUT = -360;
const PLAYER_X = 160;
const TILE = 32;
const DROP_MIN = 520;
const DROP_VARIANCE = 210;
const LANDING_SAFE_RUN = 420;
const EVENT_DURATION = 20;
const PUSH_DURATION = 3.6;
const PUSH_SPEED_GAIN = 157.5;
const HISTORY_SECONDS = 4.2;
const REWIND_SECONDS = 3;
const CLEAR_WATCH_TARGET = 523;
const PLAYER_DRAW_H = 62;
const PLAYER_HITBOX = {
  x: 8,
  y: 6,
  w: 28,
  h: 54,
};

const playerRunSprites = [
  loadPlayerSprite("assets/player/run_1.png", { x: 11, y: 10, w: 98, h: 118 }),
  loadPlayerSprite("assets/player/run_2.png", { x: 34, y: 6, w: 63, h: 122 }),
  loadPlayerSprite("assets/player/run_3.png", { x: 11, y: 5, w: 101, h: 123 }),
];
const playerCliffFallSprite = loadPlayerSprite("assets/player/fall_cliff.png", { x: 5, y: 1, w: 157, h: 123 });
const backgroundImage = loadImage("assets/background/background.png");

const specialTrack = new Audio("assets/sfx/523-time.mp3");
specialTrack.loop = true;
specialTrack.volume = 0.55;
const rewindTrack = new Audio("assets/sfx/rewind.mp3");
rewindTrack.volume = 0.72;
const sfx = {
  jump: new Audio("assets/sfx/jump.wav"),
  jumpOver: new Audio("assets/sfx/jump-over.wav"),
  death: new Audio("assets/sfx/death.wav"),
  deathShame: new Audio("assets/sfx/death-shame.wav"),
  deathMystery: new Audio("assets/sfx/death-mystery.wav"),
  speedUp: new Audio("assets/sfx/speed-up.wav"),
  fall: new Audio("assets/sfx/fall.wav"),
  cliffFall: new Audio("assets/sfx/cliff-fall.wav"),
};
Object.values(sfx).forEach((audio) => {
  audio.volume = 0.85;
});
window.__cliffRunnerPaused = false;

const state = {
  mode: "ready",
  previousMode: "ready",
  distance: 0,
  score: 0,
  coins: 0,
  clearTime: 0,
  speed: 315,
  difficulty: 1,
  cameraY: 0,
  nextPlatformX: 0,
  lastPlatformY: FLOOR_Y,
  platforms: [],
  obstacles: [],
  pickups: [],
  particles: [],
  clouds: [],
  dropCount: 0,
  time: 0,
  timeEvent: {
    active: false,
    timer: 0,
    nextAt: 5,
    spawnTimer: 0,
    startSpeed: 315,
    targetSpeed: 315,
  },
  pushEvent: {
    active: false,
    timer: 0,
    nextAt: 3,
    duration: PUSH_DURATION,
    startSpeed: 315,
    targetSpeed: 315,
  },
  history: [],
  historyTimer: 0,
  deathTime: 0,
  rewind: null,
};

const player = {
  x: PLAYER_X,
  y: FLOOR_Y - 62,
  w: 42,
  h: 62,
  vy: 0,
  grounded: true,
  dead: false,
  runFrame: 0,
  jumpHolding: false,
  jumpHoldTimer: 0,
  fallingSfxPlayed: false,
  cliffFallSfxPlayed: false,
  airFromJump: false,
};

let escapeHeld = false;
let spaceHeld = false;

function resetGame() {
  stopSpecialTrack();
  stopRewindTrack();
  state.mode = "playing";
  state.previousMode = "playing";
  state.distance = 0;
  state.score = 0;
  state.coins = 0;
  state.clearTime = 0;
  state.speed = 315;
  state.difficulty = 1;
  state.cameraY = 0;
  state.nextPlatformX = 0;
  state.lastPlatformY = FLOOR_Y;
  state.platforms = [];
  state.obstacles = [];
  state.pickups = [];
  state.particles = [];
  state.dropCount = 0;
  state.time = 0;
  state.timeEvent.active = false;
  state.timeEvent.timer = 0;
  state.timeEvent.nextAt = 4 + Math.random() * 2;
  state.timeEvent.spawnTimer = 0;
  state.timeEvent.startSpeed = 315;
  state.timeEvent.targetSpeed = 315;
  state.pushEvent.active = false;
  state.pushEvent.timer = 0;
  state.pushEvent.nextAt = 2 + Math.random() * 1.5;
  state.pushEvent.duration = PUSH_DURATION;
  state.pushEvent.startSpeed = 315;
  state.pushEvent.targetSpeed = 315;
  state.history = [];
  state.historyTimer = 0;
  state.deathTime = 0;
  state.rewind = null;
  window.__cliffRunnerPaused = false;

  player.y = FLOOR_Y - player.h;
  player.vy = 0;
  player.grounded = true;
  player.dead = false;
  player.runFrame = 0;
  player.jumpHolding = false;
  player.jumpHoldTimer = 0;
  player.fallingSfxPlayed = false;
  player.cliffFallSfxPlayed = false;
  player.airFromJump = false;

  makeClouds();
  hideDeathChoices();
  hidePauseChoices();
  overlay.classList.remove("clear");
  overlayTitle.textContent = "CLIFF RUNNER";
  state.nextPlatformX = addPlayableRun(0, 1280, FLOOR_Y, {
    isDropLanding: false,
    safeStart: 0,
    cliffExit: true,
    allowBreaks: true,
  });

  while (state.nextPlatformX < W + 2800) {
    generateNextChunk();
  }

  overlay.classList.add("hidden");
  updateHud();
  recordHistory(true);
}

function makeClouds() {
  state.clouds = Array.from({ length: 9 }, (_, i) => ({
    x: i * 150 + Math.random() * 90,
    y: 48 + Math.random() * 118,
    s: 0.7 + Math.random() * 1.2,
    drift: 8 + Math.random() * 12,
  }));
}

function loadPlayerSprite(src, crop) {
  const image = new Image();
  image.src = src;
  return { image, crop };
}

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function getPlayerHitbox() {
  return {
    x: player.x + PLAYER_HITBOX.x,
    y: player.y + PLAYER_HITBOX.y,
    w: PLAYER_HITBOX.w,
    h: PLAYER_HITBOX.h,
  };
}

function isCliffFalling() {
  return !player.grounded && !player.airFromJump && player.vy > 80;
}

function addPlatform(x, w, y, options = {}) {
  const platform = {
    x,
    w,
    y,
    isDropLanding: Boolean(options.isDropLanding),
    passedDrop: false,
    safeStart: options.safeStart ?? 0,
    cliffExit: Boolean(options.cliffExit),
    cliffSeed: Math.random() * 1000,
  };
  state.platforms.push(platform);

  if (x <= 300 || options.spawnContent === false) return;

  const obstacleStart = x + platform.safeStart + 110;
  const obstacleRoom = x + w - obstacleStart - 90;
  const obstacleChance = Math.min(0.26 + state.difficulty * 0.045, 0.62);

  if (x > 1700 && obstacleRoom > 80 && Math.random() < obstacleChance) {
    const count = Math.random() < 0.16 + state.difficulty * 0.012 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      state.obstacles.push({
        x: obstacleStart + i * 66 + Math.random() * Math.max(30, obstacleRoom - i * 70),
        y: y - 38,
        w: 34,
        h: 38,
        type: Math.random() < 0.52 ? "spike" : "stone",
      });
    }
  }

  const coinStart = x + Math.max(100, platform.safeStart * 0.42);
  const coinRoom = w - (coinStart - x) - 70;
  const coinCount = Math.max(2, Math.min(18, Math.floor(Math.max(coinRoom, 120) / 78)));

  for (let i = 0; i < coinCount && coinRoom > 40; i += 1) {
    const laneX = coinStart + i * 72 + Math.random() * Math.max(18, coinRoom / Math.max(coinCount, 1) - 18);
    const laneHeight = i % 3 === 0 ? 74 : i % 3 === 1 ? 114 : 146;
    state.pickups.push({
      kind: "coin",
      x: Math.min(x + w - 56, laneX),
      y: y - laneHeight - Math.random() * 18,
      r: 15,
      taken: false,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function addPlayableRun(x, width, y, options = {}) {
  const allowBreaks = options.allowBreaks !== false;
  const speedScale = getSpeedScale();
  const safeStart = options.safeStart ?? 0;
  let cursor = x;
  let remaining = width;
  const segments = [];

  const firstWidth = Math.min(
    remaining,
    Math.max(safeStart + 360, allowBreaks ? 620 + speedScale * 150 + Math.random() * 160 : remaining),
  );

  segments.push({
    x: cursor,
    w: firstWidth,
    y,
    isDropLanding: Boolean(options.isDropLanding),
    safeStart,
  });

  cursor += firstWidth;
  remaining -= firstWidth;

  if (allowBreaks && remaining > 590) {
    const firstGap = getJumpGap();
    cursor += firstGap;
    remaining -= firstGap;

    const raised = remaining > 760 && Math.random() < 0.58;
    const midY = raised ? y - (48 + Math.random() * 28) : y;
    const midWidth = Math.min(remaining, raised ? 460 + speedScale * 120 + Math.random() * 140 : 330 + speedScale * 120 + Math.random() * 150);

    segments.push({
      x: cursor,
      w: midWidth,
      y: midY,
      isDropLanding: false,
      safeStart: 0,
    });

    cursor += midWidth;
    remaining -= midWidth;

    if (remaining > 330) {
      const secondGap = getJumpGap() * 0.92;
      cursor += secondGap;
      remaining -= secondGap;
    }
  }

  if (remaining > 180) {
    segments.push({
      x: cursor,
      w: remaining,
      y,
      isDropLanding: false,
      safeStart: 0,
    });
  }

  segments.forEach((segment, index) => {
    addPlatform(segment.x, segment.w, segment.y, {
      isDropLanding: segment.isDropLanding,
      safeStart: segment.safeStart,
      cliffExit: Boolean(options.cliffExit && index === segments.length - 1),
    });
  });

  if (options.cliffExit && segments.length > 0) {
    state.platforms[state.platforms.length - 1].cliffExit = true;
  }

  return Math.max(...segments.map((segment) => segment.x + segment.w));
}

function generateNextChunk() {
  const speedScale = getSpeedScale();
  const safeRun = getFlatRunWidth();
  const gap = 106 + Math.random() * 36;
  const drop = DROP_MIN + Math.random() * DROP_VARIANCE + state.difficulty * 4;
  const nextY = state.lastPlatformY + drop;
  const width = safeRun + Math.random() * (260 + speedScale * 160);

  state.nextPlatformX += gap;
  const endX = addPlayableRun(state.nextPlatformX, width, nextY, {
    isDropLanding: true,
    safeStart: getLandingSafeRun(),
    cliffExit: true,
    allowBreaks: true,
  });
  state.lastPlatformY = nextY;
  state.nextPlatformX = endX;
}

function startOrJump() {
  if (state.mode === "paused") {
    resumePause();
    return;
  }

  if (state.mode === "ready" || state.mode === "finaldead" || state.mode === "clear") {
    resetGame();
    return;
  }

  if (state.mode !== "playing" || window.__cliffRunnerPaused) return;

  if (player.grounded) {
    player.vy = JUMP_VELOCITY;
    player.grounded = false;
    player.jumpHolding = true;
    player.jumpHoldTimer = 0;
    player.fallingSfxPlayed = false;
    player.cliffFallSfxPlayed = false;
    player.airFromJump = true;
    playSfx("jump");
    if (hasObstacleAhead()) playSfx("jumpOver");
    spawnDust(player.x + 16, player.y + player.h, "#d7c18d", 9);
  }
}

function releaseJump() {
  player.jumpHolding = false;
  if (state.mode === "playing" && player.vy < JUMP_RELEASE_CUT) {
    player.vy = JUMP_RELEASE_CUT;
  }
}

function togglePause() {
  if (state.mode === "playing") {
    state.previousMode = "playing";
    state.mode = "paused";
    window.__cliffRunnerPaused = true;
    overlayTitle.textContent = "PAUSED";
    overlayText.textContent = "Press SPACE to resume";
    hideDeathChoices();
    showPauseChoices();
    overlay.classList.remove("hidden");
    specialTrack.pause();
  }
}

function resumePause() {
  if (state.mode !== "paused") return;
  state.mode = state.previousMode;
  window.__cliffRunnerPaused = false;
  overlayTitle.textContent = "CLIFF RUNNER";
  hidePauseChoices();
  overlay.classList.add("hidden");
  if (state.timeEvent.active) playSpecialTrack();
}

document.body.tabIndex = 0;
canvas.tabIndex = 0;
document.body.focus();

function handleKeyDown(event) {
  if (event.__cliffHandled) return;
  if (isSpaceInput(event)) {
    event.__cliffHandled = true;
    event.preventDefault();
    if (!spaceHeld && !event.repeat) {
      spaceHeld = true;
      startOrJump();
    }
  }

  if (isEscapeInput(event)) {
    event.__cliffHandled = true;
    event.preventDefault();
    if (!escapeHeld && !event.repeat) {
      escapeHeld = true;
      togglePause();
    }
  }
}

function handleKeyUp(event) {
  if (isSpaceInput(event)) {
    spaceHeld = false;
    releaseJump();
  }

  if (isEscapeInput(event)) {
    escapeHeld = false;
  }
}

function handlePointerDown(event) {
  if (event.__cliffHandled) return;
  if (event.target instanceof HTMLButtonElement) return;
  event.__cliffHandled = true;
  spaceHeld = true;
  startOrJump();
}

function handlePointerUp() {
  spaceHeld = false;
  releaseJump();
}

window.addEventListener("keydown", handleKeyDown);
document.addEventListener("keydown", handleKeyDown);
document.body.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
document.addEventListener("keyup", handleKeyUp);
window.addEventListener("pointerdown", handlePointerDown);
document.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointerup", handlePointerUp);

function isSpaceInput(event) {
  return event.code === "Space" || event.key === " " || event.key === "Spacebar";
}

function isEscapeInput(event) {
  return event.code === "Escape" || event.key === "Escape" || event.key === "Esc";
}

function update(dt) {
  if (state.mode === "rewinding") {
    updateRewind(dt);
    return;
  }

  if (state.mode !== "playing" || window.__cliffRunnerPaused) return;

  state.time += dt;
  updateTimeEvent(dt);
  updatePushEvent(dt);

  const scroll = getEffectiveSpeed() * dt;
  const previousDistance = state.distance;
  const wasGrounded = player.grounded;
  state.distance += scroll;
  player.runFrame += dt * (8 + state.difficulty * 0.45);

  if (player.jumpHolding && !player.grounded && player.vy < 0 && player.jumpHoldTimer < JUMP_HOLD_TIME) {
    player.jumpHoldTimer += dt;
    player.vy = Math.max(-940, player.vy - JUMP_HOLD_FORCE * dt);
  }

  const previousPlayerY = player.y;
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  player.grounded = false;

  for (const platform of state.platforms) {
    const left = platform.x - state.distance;
    const right = left + platform.w;
    const previousLeft = platform.x - previousDistance;
    const previousRight = previousLeft + platform.w;
    const sweptLeft = Math.min(left, previousLeft);
    const sweptRight = Math.max(right, previousRight);
    const foot = player.y + player.h;
    const previousFoot = previousPlayerY + player.h;

    if (
      player.x + player.w > sweptLeft + 6 &&
      player.x < sweptRight - 6 &&
      previousFoot <= platform.y &&
      foot >= platform.y &&
      player.vy >= 0
    ) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.jumpHolding = false;
      player.jumpHoldTimer = 0;
      player.fallingSfxPlayed = false;
      player.cliffFallSfxPlayed = false;
      player.airFromJump = false;

      if (platform.isDropLanding && !platform.passedDrop) {
        platform.passedDrop = true;
        levelUp();
      }
    }
  }

  if (wasGrounded && !player.grounded && player.vy >= 0) {
    const support = findPlatformAtWorldX(state.distance + player.x + player.w / 2);
    const foot = player.y + player.h;
    if (support && Math.abs(foot - support.y) < 44) {
      player.y = support.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.jumpHolding = false;
      player.jumpHoldTimer = 0;
      player.fallingSfxPlayed = false;
      player.cliffFallSfxPlayed = false;
      player.airFromJump = false;

      if (support.isDropLanding && !support.passedDrop) {
        support.passedDrop = true;
        levelUp();
      }
    }
  }

  const targetCameraY = Math.max(0, player.y - 280);
  const followRate = !player.grounded && player.vy > 120 ? 13 : 4.8;
  state.cameraY += (targetCameraY - state.cameraY) * Math.min(1, dt * followRate);
  if (player.y - state.cameraY > H - 145) {
    state.cameraY = player.y - (H - 145);
  }

  if (player.y > getNearestPassedPlatformY() + 920) {
    endGame("운지했습니다!");
  }

  if (wasGrounded && !player.grounded && !player.airFromJump && !player.cliffFallSfxPlayed) {
    player.cliffFallSfxPlayed = true;
    playSfx("cliffFall");
  }

  if (!player.grounded && player.vy > 360 && !player.fallingSfxPlayed) {
    player.fallingSfxPlayed = true;
    playSfx("fall");
  }

  for (const obstacle of state.obstacles) {
    const ox = obstacle.x - state.distance;
    const hitbox = getPlayerHitbox();
    if (
      rectsOverlap(
        hitbox.x,
        hitbox.y,
        hitbox.w,
        hitbox.h,
        ox + 3,
        obstacle.y + 3,
        obstacle.w - 6,
        obstacle.h - 4,
      )
    ) {
      endGame("장애물에 꼬라박았습니다!");
    }
  }

  for (const pickup of state.pickups) {
    if (pickup.taken) continue;
    const px = pickup.x - state.distance;
    const py = pickup.y + Math.sin(state.time * 5 + pickup.phase) * 5;
    const hitbox = getPlayerHitbox();

    if (circleRectOverlap(px, py, pickup.r, hitbox.x, hitbox.y, hitbox.w, hitbox.h)) {
      pickup.taken = true;
      collectPickup(pickup, px, py);
    }
  }

  for (const cloud of state.clouds) {
    cloud.x -= cloud.drift * dt;
    if (cloud.x < -140) cloud.x = W + Math.random() * 120;
  }

  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 900 * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  cleanupWorld();
  while (state.nextPlatformX - state.distance < W + 2800) {
    generateNextChunk();
  }

  recordHistory(false, dt);
  updateHud();
}

function updateTimeEvent(dt) {
  if (!state.timeEvent.active && state.time >= state.timeEvent.nextAt && !state.pushEvent.active) {
    startTimeEvent();
  }

  if (!state.timeEvent.active) return;

  state.timeEvent.timer -= dt;
  state.timeEvent.spawnTimer -= dt;

  while (state.timeEvent.spawnTimer <= 0) {
    spawnTimeDigit();
    if (Math.random() < 0.72) spawnTimeWatch();
    state.timeEvent.spawnTimer += 0.11;
  }

  if (state.timeEvent.timer <= 0) {
    endTimeEvent();
  }
}

function startTimeEvent() {
  if (state.pushEvent.active) {
    endPushEvent();
  }
  state.timeEvent.active = true;
  state.timeEvent.timer = EVENT_DURATION;
  state.timeEvent.spawnTimer = 0;
  state.timeEvent.startSpeed = state.speed;
  state.timeEvent.targetSpeed = state.speed;
  playSpecialTrack();
  spawnDust(player.x + player.w / 2, player.y + 14, "#ff4fd8", 30);
}

function endTimeEvent() {
  state.timeEvent.active = false;
  state.timeEvent.timer = 0;
  state.timeEvent.nextAt = state.time + 14 + Math.random() * 10;
  stopSpecialTrack();
}

function updatePushEvent(dt) {
  if (!state.pushEvent.active && state.time >= state.pushEvent.nextAt && !state.timeEvent.active && player.grounded) {
    startPushEvent();
  }

  if (!state.pushEvent.active) return;

  state.pushEvent.timer -= dt;
  const progress = 1 - Math.max(0, state.pushEvent.timer) / state.pushEvent.duration;

  state.speed = lerp(state.pushEvent.startSpeed, state.pushEvent.targetSpeed, easeOutCubic(progress));

  if (state.pushEvent.timer <= 0) {
    endPushEvent();
  }
}

function startPushEvent() {
  state.pushEvent.active = true;
  state.pushEvent.duration = PUSH_DURATION;
  state.pushEvent.timer = PUSH_DURATION;
  state.pushEvent.startSpeed = state.speed;
  state.pushEvent.targetSpeed = state.speed + PUSH_SPEED_GAIN;
  playSfx("speedUp");
  spawnDust(player.x - 32, player.y + player.h - 4, "#d8f6ff", 20);
}

function endPushEvent() {
  state.pushEvent.active = false;
  state.speed = state.pushEvent.targetSpeed;
  state.pushEvent.timer = 0;
  state.pushEvent.nextAt = state.time + 18 + Math.random() * 16;
  state.pushEvent.startSpeed = state.speed;
  state.pushEvent.targetSpeed = state.speed;
}

function spawnTimeDigit() {
  const digits = ["5", "2", "3"];
  const digit = digits[Math.floor(Math.random() * digits.length)];
  const lane = pickReachablePickupLane();

  state.pickups.push({
    kind: "timeDigit",
    digit,
    x: lane.x,
    y: lane.y,
    r: 18,
    taken: false,
    phase: Math.random() * Math.PI * 2,
  });
}

function spawnTimeWatch() {
  const lane = pickReachablePickupLane();
  state.pickups.push({
    kind: "coin",
    x: lane.x + Math.random() * 44 - 22,
    y: lane.y + Math.random() * 36 - 18,
    r: 15,
    taken: false,
    phase: Math.random() * Math.PI * 2,
  });
}

function pickReachablePickupLane() {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const worldX = state.distance + W + 40 + Math.random() * 470;
    const platform = findPlatformAtWorldX(worldX);

    if (platform) {
      const laneOffsets = [58, 86, 122, 150];
      const offset = laneOffsets[Math.floor(Math.random() * laneOffsets.length)];
      return {
        x: worldX,
        y: platform.y - offset,
      };
    }
  }

  return {
    x: state.distance + W + 180 + Math.random() * 260,
    y: player.y + 18 - Math.random() * 110,
  };
}

function findPlatformAtWorldX(worldX) {
  return state.platforms.find((platform) => worldX >= platform.x + 24 && worldX <= platform.x + platform.w - 24);
}

function getSpeedScale() {
  return Math.max(1, getEffectiveSpeed() / 315);
}

function getEffectiveSpeed() {
  return state.speed;
}

function getFlatRunWidth() {
  const speedScale = getSpeedScale();
  return 980 + (speedScale - 1) * 980 + state.difficulty * 24;
}

function getLandingSafeRun() {
  const speedScale = getSpeedScale();
  return LANDING_SAFE_RUN + (speedScale - 1) * 440;
}

function getJumpGap() {
  const speedScale = getSpeedScale();
  return 150 + (speedScale - 1) * 90 + Math.random() * 32;
}

function playSpecialTrack() {
  specialTrack.play().catch(() => {});
}

function stopSpecialTrack() {
  specialTrack.pause();
  specialTrack.currentTime = 0;
}

function playRewindTrack() {
  rewindTrack.currentTime = 0;
  rewindTrack.play().catch(() => {});
}

function stopRewindTrack() {
  rewindTrack.pause();
  rewindTrack.currentTime = 0;
}

function playSfx(name) {
  const source = sfx[name];
  if (!source) return;
  const instance = source.cloneNode();
  instance.volume = source.volume;
  instance.play().catch(() => {});
}

function playDeathSfx() {
  playSfx("death");
  playSfx(Math.random() < 0.5 ? "deathShame" : "deathMystery");
}

function hasObstacleAhead() {
  const worldPlayerX = state.distance + player.x;
  return state.obstacles.some((obstacle) => {
    const dx = obstacle.x - worldPlayerX;
    return dx > 70 && dx < 390 && Math.abs(obstacle.y - (player.y + player.h - obstacle.h)) < 120;
  });
}

function collectPickup(pickup, x, y) {
  if (pickup.kind === "timeDigit") {
    state.coins += Number(pickup.digit);
    spawnDust(x, y, digitColor(pickup.digit), 12);
    checkClear();
    return;
  }

  state.coins += 1;
  spawnDust(x, y, "#f4c542", 12);
  checkClear();
}

function checkClear() {
  if (state.coins >= CLEAR_WATCH_TARGET) {
    clearGame();
  }
}

function clearGame() {
  if (state.mode !== "playing") return;
  state.mode = "clear";
  state.clearTime = state.time;
  player.dead = false;
  stopSpecialTrack();
  stopRewindTrack();
  hideDeathChoices();
  hidePauseChoices();
  overlay.classList.add("clear");
  overlayTitle.textContent = "당신은 성공적으로 운지하였습니다!";
  overlayText.textContent = `CLEAR TIME ${formatTime(state.clearTime)} | Press SPACE to restart`;
  overlay.classList.remove("hidden");
}

function getNearestPassedPlatformY() {
  let deepest = FLOOR_Y;
  for (const platform of state.platforms) {
    const screenX = platform.x - state.distance;
    if (screenX < player.x + 520) {
      deepest = Math.max(deepest, platform.y);
    }
  }
  return deepest;
}

function levelUp() {
  state.dropCount += 1;
  state.difficulty += 1;
  spawnDust(player.x + player.w / 2, player.y + player.h, "#b5e48c", 16);
}

function cleanupWorld() {
  state.platforms = state.platforms.filter((platform) => platform.x + platform.w - state.distance > -300);
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x - state.distance > -180);
  state.pickups = state.pickups.filter((pickup) => pickup.x - state.distance > -220 && !pickup.taken);
}

function endGame(message) {
  if (state.mode !== "playing") return;
  state.mode = "gameover";
  state.deathTime = state.time;
  player.dead = true;
  state.pushEvent.active = false;
  stopSpecialTrack();
  playDeathSfx();
  overlayTitle.textContent = "GAME OVER";
  overlayText.textContent = `당신은 심호익이 사람 이름이라고 생각하십니까? (${message})`;
  hidePauseChoices();
  showDeathChoices();
  overlay.classList.remove("hidden");
}

function showDeathChoices() {
  deathChoices.classList.remove("hidden");
}

function hideDeathChoices() {
  deathChoices.classList.add("hidden");
}

function showPauseChoices() {
  pauseChoices.classList.remove("hidden");
}

function hidePauseChoices() {
  pauseChoices.classList.add("hidden");
}

function restartFromPause() {
  if (state.mode !== "paused") return;
  hidePauseChoices();
  resetGame();
}

function chooseDeathYes() {
  if (state.mode !== "gameover") return;
  hideDeathChoices();
  state.mode = "finaldead";
  player.dead = true;
  overlayTitle.textContent = "☠";
  overlayText.textContent = "당신은 있을 수 없는 이야기를 하고 있습니다! 처음부터 시작하세요.";
  overlay.classList.remove("hidden");
}

function chooseDeathNo() {
  if (state.mode !== "gameover") return;
  const targetTime = Math.max(0, state.deathTime - REWIND_SECONDS);
  const frames = state.history.filter((snapshot) => snapshot.time >= targetTime && snapshot.time <= state.deathTime);
  const target = frames[0] ?? state.history[0];

  if (!target) {
    resetGame();
    return;
  }

  hideDeathChoices();
  overlayTitle.textContent = "정답! 호익은 사람의 이름일 수 없습니다!";
  overlayText.textContent = "";
  overlay.classList.remove("hidden");
  state.mode = "rewinding";
  state.rewind = {
    frames: frames.length ? frames.reverse() : [target],
    elapsed: 0,
    duration: 1.35,
    target,
  };
  playRewindTrack();
}

deathYes.addEventListener("click", chooseDeathYes);
deathNo.addEventListener("click", chooseDeathNo);
pauseResume.addEventListener("click", resumePause);
pauseRestart.addEventListener("click", restartFromPause);

function updateHud() {
  scoreEl.textContent = formatTime(state.time);
  coinsEl.textContent = `${Math.min(state.coins, CLEAR_WATCH_TARGET)}/${CLEAR_WATCH_TARGET}`;
  speedEl.textContent = `${(getEffectiveSpeed() / 315).toFixed(1)}x`;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function recordHistory(force = false, dt = 1 / 60) {
  state.historyTimer += dt;
  if (!force && state.historyTimer < 0.08) return;
  state.historyTimer = 0;

  state.history.push(createSnapshot());
  const cutoff = state.time - HISTORY_SECONDS;
  while (state.history.length > 1 && state.history[0].time < cutoff) {
    state.history.shift();
  }
}

function createSnapshot() {
  return {
    time: state.time,
    distance: state.distance,
    score: state.score,
    coins: state.coins,
    speed: state.speed,
    difficulty: state.difficulty,
    cameraY: state.cameraY,
    nextPlatformX: state.nextPlatformX,
    lastPlatformY: state.lastPlatformY,
    dropCount: state.dropCount,
    platforms: clonePlain(state.platforms),
    obstacles: clonePlain(state.obstacles),
    pickups: clonePlain(state.pickups),
    particles: clonePlain(state.particles),
    player: clonePlain(player),
    timeEvent: clonePlain(state.timeEvent),
    pushEvent: clonePlain(state.pushEvent),
  };
}

function applySnapshot(snapshot) {
  state.time = snapshot.time;
  state.distance = snapshot.distance;
  state.score = snapshot.score;
  state.coins = snapshot.coins;
  state.speed = snapshot.speed;
  state.difficulty = snapshot.difficulty;
  state.cameraY = snapshot.cameraY;
  state.nextPlatformX = snapshot.nextPlatformX;
  state.lastPlatformY = snapshot.lastPlatformY;
  state.dropCount = snapshot.dropCount;
  state.platforms = clonePlain(snapshot.platforms);
  state.obstacles = clonePlain(snapshot.obstacles);
  state.pickups = clonePlain(snapshot.pickups);
  state.particles = clonePlain(snapshot.particles);
  Object.assign(player, clonePlain(snapshot.player), { dead: false });
  Object.assign(state.timeEvent, clonePlain(snapshot.timeEvent));
  Object.assign(state.pushEvent, clonePlain(snapshot.pushEvent ?? {
    active: false,
    timer: 0,
    nextAt: state.time + 10,
    duration: PUSH_DURATION,
    startSpeed: state.speed,
    targetSpeed: state.speed,
  }));
  updateHud();
}

function updateRewind(dt) {
  if (!state.rewind) return;
  state.rewind.elapsed += dt;
  const progress = Math.min(1, state.rewind.elapsed / state.rewind.duration);
  const index = Math.min(state.rewind.frames.length - 1, Math.floor(progress * state.rewind.frames.length));
  applySnapshot(state.rewind.frames[index]);

  if (progress >= 1) {
    applySnapshot(state.rewind.target);
    state.rewind = null;
    state.mode = "playing";
    player.dead = false;
    overlay.classList.add("hidden");
    stopRewindTrack();
    if (state.timeEvent.active) playSpecialTrack();
    recordHistory(true);
  }
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawFallingRockBackdrop();

  ctx.save();
  ctx.translate(0, -state.cameraY);
  drawPlatforms();
  drawPickups();
  drawObstacles();
  drawPushHelper();
  drawPlayer();
  drawParticles();
  ctx.restore();

  drawTimeEventOverlay();
  drawRewindEffect();
  drawVignette();
}

function drawFallingRockBackdrop() {
  const fallingDeep = player.y > FLOOR_Y + 110 || state.cameraY > 150;
  if (!fallingDeep || state.mode === "ready") return;

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = "rgba(43, 36, 31, 0.94)";
  ctx.fillRect(0, 0, W, H);

  const scrollY = state.cameraY * 1.18;
  const yOffset = scrollY % 64;
  for (let y = -120; y < H + 160; y += 46) {
    const drawY = y + yOffset;
    ctx.fillStyle = "rgba(88, 73, 61, 0.42)";
    pixelRect(0, drawY, W, 18, 0);

    ctx.fillStyle = "rgba(214, 205, 185, 0.16)";
    for (let x = -80; x < W + 120; x += 108) {
      pixelRect(x, drawY + 8, 46, 6, 1);
      pixelRect(x + 16, drawY + 18, 35, 5, 1);
    }
  }

  ctx.globalAlpha = 0.34;
  ctx.fillStyle = "rgba(12, 10, 9, 0.5)";
  for (let x = -60; x < W + 80; x += 70) {
    pixelRect(x, -20, 32 + Math.abs(Math.sin(x)) * 28, H + 60, 0);
  }
  ctx.restore();
}

function drawBackground() {
  const rainbow = state.timeEvent.active;
  const hue = (state.time * 160) % 360;
  const grd = ctx.createLinearGradient(0, 0, 0, H);

  if (rainbow) {
    grd.addColorStop(0, `hsl(${hue}, 76%, 32%)`);
    grd.addColorStop(0.45, `hsl(${(hue + 90) % 360}, 74%, 35%)`);
    grd.addColorStop(1, `hsl(${(hue + 180) % 360}, 72%, 24%)`);
  } else {
    grd.addColorStop(0, "#243946");
    grd.addColorStop(0.55, "#5d7166");
    grd.addColorStop(1, "#26322d");
  }

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  drawProvidedBackground(rainbow);

  ctx.fillStyle = rainbow ? "rgba(255, 255, 255, 0.68)" : "rgba(244, 197, 66, 0.78)";
  pixelRect(790, 62, 52, 52, 4);
  ctx.fillStyle = rainbow ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 240, 174, 0.34)";
  pixelRect(776, 48, 80, 80, 8);

  for (const cloud of state.clouds) {
    const y = cloud.y + Math.sin(state.time * 0.8 + cloud.x) * 5;
    ctx.fillStyle = rainbow ? "rgba(255, 255, 255, 0.28)" : "rgba(232, 231, 203, 0.24)";
    pixelRect(cloud.x, y, 58 * cloud.s, 18 * cloud.s, 5);
    pixelRect(cloud.x + 22 * cloud.s, y - 12 * cloud.s, 52 * cloud.s, 24 * cloud.s, 5);
    pixelRect(cloud.x + 62 * cloud.s, y + 4 * cloud.s, 46 * cloud.s, 16 * cloud.s, 5);
  }

  const ridgeY = 348 - state.cameraY * 0.16;
  ctx.fillStyle = rainbow ? `hsla(${(hue + 230) % 360}, 45%, 20%, 0.8)` : "#293733";
  drawRidge(ridgeY, 0.22, 54);
  ctx.fillStyle = rainbow ? `hsla(${(hue + 275) % 360}, 50%, 14%, 0.8)` : "#1d2928";
  drawRidge(ridgeY + 58, 0.34, 72);
}

function drawProvidedBackground(rainbow) {
  if (!backgroundImage.complete || backgroundImage.naturalWidth === 0) return;

  const drawH = H * 1.08;
  const drawW = drawH * (backgroundImage.naturalWidth / backgroundImage.naturalHeight);
  const x = W - drawW - 22;
  const y = H - drawH + 8;

  ctx.save();
  ctx.globalAlpha = rainbow ? 0.28 : 0.46;
  ctx.drawImage(backgroundImage, Math.round(x), Math.round(y), Math.round(drawW), Math.round(drawH));
  ctx.restore();
}

function drawRidge(baseY, parallax, height) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = -80; x <= W + 80; x += 80) {
    const wave = Math.sin((x + state.distance * parallax) * 0.012) * 24;
    ctx.lineTo(x, baseY + wave - Math.cos(x * 0.02) * height);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawPlatforms() {
  for (const platform of state.platforms) {
    const x = Math.floor(platform.x - state.distance);
    const y = Math.floor(platform.y);
    if (x > W + 90 || x + platform.w < -90) continue;

    drawRockFace(platform, x, y);
    drawGroundTop(platform, x, y);
    drawCliffEdges(platform, x, y);
  }
}

function drawGroundTop(platform, x, y) {
  const hue = (state.time * 170) % 360;
  ctx.fillStyle = state.timeEvent.active ? `hsl(${(hue + 110) % 360}, 70%, 55%)` : "#91b95f";
  pixelRect(x, y, platform.w, 14, 2);

  ctx.fillStyle = state.timeEvent.active ? `hsl(${(hue + 60) % 360}, 88%, 72%)` : "#c1d882";
  for (let tx = x; tx < x + platform.w; tx += TILE) {
    pixelRect(tx, y - 8, TILE, 9, 2);
  }

  ctx.fillStyle = state.timeEvent.active ? `hsl(${(hue + 155) % 360}, 62%, 38%)` : "#5f7c43";
  pixelRect(x, y + 14, platform.w, 12, 2);
}

function drawRockFace(platform, x, y) {
  const visibleTop = Math.max(y + 26, state.cameraY - 90);
  const visibleBottom = state.cameraY + H + 130;
  const hue = (state.time * 150) % 360;

  ctx.fillStyle = state.timeEvent.active ? `hsl(${(hue + 20) % 360}, 45%, 24%)` : "#4b382f";
  pixelRect(x, y + 26, platform.w, Math.max(visibleBottom - (y + 26), 0), 0);

  for (let wx = platform.x - 8; wx < platform.x + platform.w + 24; wx += 38) {
    const tx = wx - state.distance;
    const wobble = Math.sin((wx + platform.cliffSeed) * 0.055) * 10;
    const columnW = 24 + Math.abs(Math.sin(wx * 0.03)) * 20;
    ctx.fillStyle = state.timeEvent.active
      ? `hsla(${(hue + wx) % 360}, 50%, 18%, 0.62)`
      : Math.round(wx) % 76 === 0
        ? "#3b2a25"
        : "#574238";
    pixelRect(tx + wobble, visibleTop, columnW, visibleBottom - visibleTop, 0);
  }

  ctx.fillStyle = state.timeEvent.active ? "rgba(255, 255, 255, 0.18)" : "#6b5242";
  for (let wx = platform.x + 20; wx < platform.x + platform.w - 20; wx += 78) {
    const tx = wx - state.distance;
    for (let ty = Math.ceil(visibleTop / 44) * 44; ty < visibleBottom; ty += 66) {
      if (Math.sin(wx * 0.1 + ty * 0.05 + platform.cliffSeed) > 0.15) {
        pixelRect(tx, ty, 22, 7, 1);
        pixelRect(tx + 12, ty + 7, 18, 6, 1);
      }
    }
  }
}

function drawCliffEdges(platform, x, y) {
  const bottom = state.cameraY + H + 130;
  ctx.fillStyle = "#211b19";
  for (let ty = y + 20; ty < bottom; ty += 34) {
    const leftJut = Math.round(Math.sin(ty * 0.07 + platform.cliffSeed) * 5);
    pixelRect(x - 10 + leftJut, ty, 12, 30, 0);
  }

  if (platform.cliffExit) {
    drawWhiteCliffFace(x + platform.w, y, bottom, platform.cliffSeed);
    return;
  }

  ctx.fillStyle = "#211b19";
  for (let ty = y + 20; ty < bottom; ty += 34) {
    const rightJut = Math.round(Math.cos(ty * 0.06 + platform.cliffSeed) * 5);
    pixelRect(x + platform.w - 2 + rightJut, ty, 12, 30, 0);
  }
}

function drawWhiteCliffFace(edgeX, y, bottom, seed) {
  for (let ty = y + 8; ty < bottom; ty += 26) {
    const jut = Math.round(Math.sin(ty * 0.083 + seed) * 9);
    ctx.fillStyle = ty % 52 === 0 ? "#f1eee2" : "#d8d4c7";
    pixelRect(edgeX - 8 + jut, ty, 18, 24, 0);
    ctx.fillStyle = "#9f9b90";
    pixelRect(edgeX + 3 + jut, ty + 5, 7, 16, 0);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    pixelRect(edgeX - 11 + jut, ty + 3, 7, 10, 0);
  }
}

function drawPushHelper() {
  if (!state.pushEvent.active) return;

  const progress = 1 - Math.max(0, state.pushEvent.timer) / state.pushEvent.duration;
  let offsetX;
  if (progress < 0.24) {
    offsetX = lerp(-150, -52, progress / 0.24);
  } else if (progress < 0.78) {
    offsetX = -52 + Math.sin(state.time * 32) * 3;
  } else {
    offsetX = lerp(-52, -170, (progress - 0.78) / 0.22);
  }

  const x = player.x + offsetX;
  const y = player.y + 7 + Math.sin(state.time * 18) * 2;
  const armReach = Math.max(24, player.x - x - 8);

  ctx.fillStyle = "#26313a";
  pixelRect(x + 14, y + 24, 26, 28, 2);
  ctx.fillStyle = "#d1a178";
  pixelRect(x + 16, y + 7, 22, 18, 2);
  ctx.fillStyle = "#5f5046";
  pixelRect(x + 13, y + 2, 28, 9, 2);
  ctx.fillStyle = "#f3ead1";
  pixelRect(x + 17, y + 13, 7, 5, 1);
  pixelRect(x + 29, y + 13, 7, 5, 1);
  ctx.fillStyle = "#1b2026";
  pixelRect(x + 17, y + 15, 7, 2, 1);
  pixelRect(x + 29, y + 15, 7, 2, 1);
  pixelRect(x + 24, y + 15, 5, 2, 1);
  ctx.fillStyle = "#d1a178";
  pixelRect(x + 36, y + 30, armReach, 7, 1);
  pixelRect(x + 35, y + 39, armReach - 3, 7, 1);
  ctx.fillStyle = "#22343d";
  pixelRect(x + 17, y + 51, 8, 17, 1);
  pixelRect(x + 31, y + 51, 8, 17, 1);
  ctx.fillStyle = "#11181c";
  pixelRect(x + 13, y + 66, 14, 5, 1);
  pixelRect(x + 29, y + 66, 14, 5, 1);

  ctx.fillStyle = "rgba(215, 246, 255, 0.5)";
  for (let i = 0; i < 5; i += 1) {
    pixelRect(x - 28 - i * 22, y + 22 + i * 4, 16, 4, 1);
  }
}

function drawPlayer() {
  const frameIndex = player.grounded && !player.dead ? Math.floor(player.runFrame) % playerRunSprites.length : 1;
  const sprite = isCliffFalling() ? playerCliffFallSprite : playerRunSprites[frameIndex];
  const { image, crop } = sprite;
  const scale = PLAYER_DRAW_H / crop.h;
  const drawW = Math.round(crop.w * scale);
  const drawH = PLAYER_DRAW_H;
  const x = Math.round(player.x + player.w / 2 - drawW / 2);
  const y = Math.round(player.y + player.h - drawH);

  if (!image.complete || image.naturalWidth === 0) {
    ctx.fillStyle = player.dead ? "#c95f54" : "#35573b";
    pixelRect(player.x + PLAYER_HITBOX.x, player.y + PLAYER_HITBOX.y, PLAYER_HITBOX.w, PLAYER_HITBOX.h, 1);
    return;
  }

  ctx.save();
  if (player.dead) {
    ctx.filter = "sepia(1) saturate(8) hue-rotate(310deg) brightness(0.95)";
  }
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, x, y, drawW, drawH);
  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    const x = Math.floor(obstacle.x - state.distance);
    const y = Math.floor(obstacle.y);
    if (x > W + 60 || x < -80) continue;

    if (obstacle.type === "spike") {
      ctx.fillStyle = "#2a3438";
      triangle(x, y + obstacle.h, x + obstacle.w / 2, y, x + obstacle.w, y + obstacle.h);
      ctx.fillStyle = "#d9d0b4";
      triangle(x + 7, y + obstacle.h - 3, x + obstacle.w / 2, y + 8, x + obstacle.w - 7, y + obstacle.h - 3);
    } else {
      ctx.fillStyle = "#3f4a4f";
      pixelRect(x, y + 6, obstacle.w, obstacle.h - 6, 3);
      ctx.fillStyle = "#68737a";
      pixelRect(x + 6, y, obstacle.w - 10, 18, 2);
      ctx.fillStyle = "#2a3033";
      pixelRect(x + 5, y + 24, 18, 7, 1);
    }
  }
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const x = pickup.x - state.distance;
    const y = pickup.y + Math.sin(state.time * 5 + pickup.phase) * 5;
    if (x > W + 80 || x < -80) continue;

    if (pickup.kind === "timeDigit") {
      drawTimeDigit(pickup, x, y);
    } else {
      drawCoin(x, y);
    }
  }
}

function drawCoin(x, y) {
  ctx.fillStyle = "#7b5513";
  pixelRect(x - 16, y - 16, 32, 32, 4);
  ctx.fillStyle = "#f4c542";
  pixelRect(x - 12, y - 12, 24, 24, 4);
  ctx.fillStyle = "#fff2a8";
  pixelRect(x - 3, y - 8, 6, 10, 1);
  pixelRect(x - 2, y - 2, 10, 5, 1);
  ctx.fillStyle = "#8a6419";
  pixelRect(x - 2, y - 19, 4, 6, 1);
}

function drawTimeDigit(pickup, x, y) {
  const color = digitColor(pickup.digit);
  ctx.fillStyle = "#10131c";
  pixelRect(x - 18, y - 20, 36, 40, 4);
  ctx.fillStyle = color;
  pixelRect(x - 15, y - 17, 30, 34, 4);
  ctx.fillStyle = "#fff8cf";
  ctx.font = "bold 30px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pickup.digit, Math.round(x), Math.round(y) + 1);
}

function drawTimeEventOverlay() {
  if (!state.timeEvent.active) return;

  const hue = (state.time * 220) % 360;
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = `hsl(${(hue + i * 45) % 360}, 95%, 58%)`;
    pixelRect(0, i * 120 - ((state.time * 72) % 120), W, 14, 0);
  }
  ctx.globalAlpha = 1;
  ctx.font = "bold 44px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#11131d";
  ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
  ctx.strokeText("523 TIME", W / 2, 24);
  ctx.fillText("523 TIME", W / 2, 24);

  ctx.font = "bold 21px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#fff8cf";
  ctx.fillText(`${Math.ceil(state.timeEvent.timer)}s`, W / 2, 75);
  ctx.restore();
}

function drawRewindEffect() {
  if (state.mode !== "rewinding") return;

  const progress = state.rewind ? state.rewind.elapsed / state.rewind.duration : 0;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#d7fff7";
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.88;
  ctx.strokeStyle = "#73ffe1";
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i += 1) {
    const radius = 66 + i * 46 + Math.sin(state.time * 12 + i) * 10;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, radius, Math.PI * progress * 8, Math.PI * progress * 8 + Math.PI * 1.45);
    ctx.stroke();
  }

  ctx.restore();
}

function digitColor(digit) {
  if (digit === "5") return "#ff4fd8";
  if (digit === "2") return "#43e7ff";
  return "#ffe84a";
}

function spawnDust(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: -95 + Math.random() * 190,
      vy: -280 + Math.random() * 140,
      size: 3 + Math.random() * 5,
      color,
      life: 0.35 + Math.random() * 0.28,
    });
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life * 2);
    ctx.fillStyle = particle.color;
    pixelRect(particle.x, particle.y, particle.size, particle.size, 1);
  }
  ctx.globalAlpha = 1;
}

function drawVignette() {
  const grd = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 620);
  grd.addColorStop(0, "rgba(0, 0, 0, 0)");
  grd.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function pixelRect(x, y, w, h, snap = 2) {
  const px = snap ? Math.round(x / snap) * snap : Math.round(x);
  const py = snap ? Math.round(y / snap) * snap : Math.round(y);
  ctx.fillRect(px, py, Math.round(w), Math.round(h));
}

function triangle(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

makeClouds();
updateHud();
draw();
requestAnimationFrame(loop);
