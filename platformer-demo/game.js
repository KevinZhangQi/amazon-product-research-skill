const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const controllerList = document.getElementById('controllers');
const resetButton = document.getElementById('resetButton');

const world = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.55,
  friction: 0.8,
  platforms: [
    { x: 0, y: 490, w: 960, h: 50 },
    { x: 120, y: 410, w: 180, h: 18 },
    { x: 380, y: 340, w: 170, h: 18 },
    { x: 650, y: 270, w: 180, h: 18 },
    { x: 560, y: 430, w: 120, h: 18 },
    { x: 760, y: 180, w: 120, h: 18 },
  ],
  goal: { x: 845, y: 120, w: 28, h: 60 },
};

const playerSpawn = { x: 80, y: 350 };

const players = [
  createPlayer('Player 1', '#ff6b6b', playerSpawn.x, playerSpawn.y),
  createPlayer('Player 2', '#4dabf7', playerSpawn.x + 42, playerSpawn.y),
];

const keyboard = {
  left: false,
  right: false,
  jump: false,
  altLeft: false,
  altRight: false,
  altJump: false,
};

window.addEventListener('keydown', (event) => setKey(event.code, true));
window.addEventListener('keyup', (event) => setKey(event.code, false));
window.addEventListener('gamepadconnected', renderControllers);
window.addEventListener('gamepaddisconnected', renderControllers);
resetButton.addEventListener('click', resetGame);

function createPlayer(name, color, x, y) {
  return {
    name,
    color,
    x,
    y,
    width: 28,
    height: 38,
    vx: 0,
    vy: 0,
    speed: 0.9,
    maxSpeed: 6,
    jumpForce: 12,
    onGround: false,
    score: 0,
    finished: false,
    jumpPressedLastFrame: false,
  };
}

function setKey(code, pressed) {
  if (code === 'ArrowLeft') keyboard.left = pressed;
  if (code === 'ArrowRight') keyboard.right = pressed;
  if (code === 'ArrowUp' || code === 'Space') keyboard.jump = pressed;
  if (code === 'KeyA') keyboard.altLeft = pressed;
  if (code === 'KeyD') keyboard.altRight = pressed;
  if (code === 'KeyW') keyboard.altJump = pressed;
}

function resetGame() {
  players.forEach((player, index) => {
    player.x = playerSpawn.x + index * 42;
    player.y = playerSpawn.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.finished = false;
    player.jumpPressedLastFrame = false;
  });
}

function getControllerInput() {
  const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  renderControllers(pads);

  return players.map((_, index) => {
    const pad = pads[index];
    if (!pad) {
      if (index === 0) {
        return {
          left: keyboard.altLeft || keyboard.left,
          right: keyboard.altRight || keyboard.right,
          jump: keyboard.altJump || keyboard.jump,
          source: 'keyboard',
        };
      }
      if (index === 1) {
        return {
          left: keyboard.left,
          right: keyboard.right,
          jump: keyboard.jump,
          source: 'keyboard',
        };
      }
      return { left: false, right: false, jump: false, source: 'none' };
    }

    const axisX = pad.axes[0] ?? 0;
    const dpadLeft = pad.buttons[14]?.pressed;
    const dpadRight = pad.buttons[15]?.pressed;
    const jump = Boolean(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || pad.buttons[3]?.pressed);

    return {
      left: axisX < -0.3 || dpadLeft,
      right: axisX > 0.3 || dpadRight,
      jump,
      source: pad.id,
    };
  });
}

function renderControllers(pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean)) {
  if (!pads.length) {
    controllerList.textContent = 'No controller detected yet.';
    return;
  }

  controllerList.innerHTML = pads
    .slice(0, 2)
    .map((pad, index) => `
      <div class="controller-chip">
        <div>
          <strong>Player ${index + 1}</strong>
          <span>${pad.id}</span>
        </div>
        <span>index ${pad.index}</span>
      </div>
    `)
    .join('');
}

function applyInput(player, input) {
  if (player.finished) return;

  if (input.left) player.vx -= player.speed;
  if (input.right) player.vx += player.speed;

  player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));

  if (input.jump && player.onGround && !player.jumpPressedLastFrame) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }

  player.jumpPressedLastFrame = input.jump;
}

function updatePlayer(player) {
  if (player.finished) return;

  player.vy += world.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= world.friction;

  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  }
  if (player.x + player.width > world.width) {
    player.x = world.width - player.width;
    player.vx = 0;
  }

  player.onGround = false;
  for (const platform of world.platforms) {
    const intersects =
      player.x < platform.x + platform.w &&
      player.x + player.width > platform.x &&
      player.y < platform.y + platform.h &&
      player.y + player.height > platform.y;

    if (!intersects) continue;

    const previousBottom = player.y + player.height - player.vy;
    if (previousBottom <= platform.y + 12 && player.vy >= 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    if (player.vx > 0) {
      player.x = platform.x - player.width;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.w;
    }
    player.vx = 0;
  }

  if (player.y > world.height + 100) {
    player.x = playerSpawn.x;
    player.y = playerSpawn.y;
    player.vx = 0;
    player.vy = 0;
  }

  if (
    player.x < world.goal.x + world.goal.w &&
    player.x + player.width > world.goal.x &&
    player.y < world.goal.y + world.goal.h &&
    player.y + player.height > world.goal.y
  ) {
    player.finished = true;
    player.score += 1;
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(120, 110, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  drawCloud(260, 120, 1);
  drawCloud(720, 92, 1.2);

  ctx.fillStyle = '#6ab04c';
  ctx.fillRect(0, 490, 960, 50);

  ctx.fillStyle = '#5f8f38';
  world.platforms.slice(1).forEach((platform) => {
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });

  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(world.goal.x + 8, world.goal.y, 6, world.goal.h);
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.moveTo(world.goal.x + 14, world.goal.y + 6);
  ctx.lineTo(world.goal.x + 52, world.goal.y + 16);
  ctx.lineTo(world.goal.x + 14, world.goal.y + 26);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 10 * scale, 20 * scale, 0, Math.PI * 2);
  ctx.arc(x + 50 * scale, y, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayers() {
  players.forEach((player, index) => {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(player.x + 5, player.y + 10, 5, 5);
    ctx.fillRect(player.x + 18, player.y + 10, 5, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${player.name}: ${player.score}`, 18, 32 + index * 24);

    if (player.finished) {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Finished!', player.x - 6, player.y - 12);
    }
  });
}

function tick() {
  const inputs = getControllerInput();
  players.forEach((player, index) => {
    applyInput(player, inputs[index]);
    updatePlayer(player);
  });

  drawBackground();
  drawPlayers();
  requestAnimationFrame(tick);
}

resetGame();
renderControllers();
tick();
