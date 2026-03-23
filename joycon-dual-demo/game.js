const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('joyconStatus');
const connectButton = document.getElementById('connectButton');
const resetButton = document.getElementById('resetButton');

const JOYCON_VENDOR_ID = 0x057e;
const LEFT_PRODUCT_IDS = new Set([0x2006]);
const RIGHT_PRODUCT_IDS = new Set([0x2007]);

const world = {
  gravity: 0.58,
  width: canvas.width,
  height: canvas.height,
  platforms: [
    { x: 0, y: 540, w: 1080, h: 60 },
    { x: 110, y: 455, w: 180, h: 18 },
    { x: 330, y: 390, w: 170, h: 18 },
    { x: 575, y: 315, w: 180, h: 18 },
    { x: 780, y: 238, w: 170, h: 18 },
    { x: 620, y: 470, w: 110, h: 18 },
  ],
  finish: { x: 965, y: 178, w: 26, h: 60 },
};

const keyboard = {
  p1Left: false,
  p1Right: false,
  p1Jump: false,
  p2Left: false,
  p2Right: false,
  p2Jump: false,
};

const assignedJoycons = {
  left: null,
  right: null,
};

const players = [
  createPlayer('Player 1', '#ff6b6b', 70, 425),
  createPlayer('Player 2', '#4dabf7', 118, 425),
];

function createPlayer(name, color, x, y) {
  return {
    name,
    color,
    x,
    y,
    width: 30,
    height: 40,
    vx: 0,
    vy: 0,
    onGround: false,
    jumpLatch: false,
    speed: 0.95,
    maxSpeed: 6.4,
    jumpForce: 12.3,
    wins: 0,
    finished: false,
    spawnX: x,
    spawnY: y,
  };
}

function setKey(code, pressed) {
  if (code === 'KeyA') keyboard.p1Left = pressed;
  if (code === 'KeyD') keyboard.p1Right = pressed;
  if (code === 'KeyW') keyboard.p1Jump = pressed;
  if (code === 'ArrowLeft') keyboard.p2Left = pressed;
  if (code === 'ArrowRight') keyboard.p2Right = pressed;
  if (code === 'ArrowUp' || code === 'Space') keyboard.p2Jump = pressed;
}

window.addEventListener('keydown', (event) => setKey(event.code, true));
window.addEventListener('keyup', (event) => setKey(event.code, false));
window.addEventListener('gamepadconnected', renderStatus);
window.addEventListener('gamepaddisconnected', renderStatus);
if (navigator.hid) {
  navigator.hid.addEventListener('connect', renderStatus);
  navigator.hid.addEventListener('disconnect', (event) => {
    if (assignedJoycons.left?.productId === event.device.productId && assignedJoycons.left?.productName === event.device.productName) {
      assignedJoycons.left = null;
    }
    if (assignedJoycons.right?.productId === event.device.productId && assignedJoycons.right?.productName === event.device.productName) {
      assignedJoycons.right = null;
    }
    renderStatus();
  });
}

connectButton.addEventListener('click', connectJoycons);
resetButton.addEventListener('click', resetRound);

async function connectJoycons() {
  if (!navigator.hid) {
    alert('WebHID is not available in this browser. Use Chrome or Edge on desktop.');
    return;
  }

  try {
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: JOYCON_VENDOR_ID }],
    });

    for (const device of devices) {
      if (!device.opened) {
        await device.open();
      }

      if (LEFT_PRODUCT_IDS.has(device.productId)) {
        assignedJoycons.left = {
          productId: device.productId,
          productName: device.productName,
        };
      } else if (RIGHT_PRODUCT_IDS.has(device.productId)) {
        assignedJoycons.right = {
          productId: device.productId,
          productName: device.productName,
        };
      }
    }

    renderStatus();
  } catch (error) {
    console.error(error);
    alert('Joy-Con connection was cancelled or failed.');
  }
}

function getBoundGamepad(side) {
  const target = assignedJoycons[side];
  const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  if (!target) return null;

  return pads.find((pad) => {
    const id = pad.id || '';
    const hasSideWord = side === 'left' ? /left/i.test(id) : /right/i.test(id);
    const hasJoyconWord = /joy-?con/i.test(id) || /nintendo/i.test(id);
    return hasSideWord && hasJoyconWord;
  }) || null;
}

function getInputForPlayer(index) {
  if (index === 0) {
    const pad = getBoundGamepad('left');
    if (pad) return normalizeGamepadInput(pad);
    return {
      left: keyboard.p1Left,
      right: keyboard.p1Right,
      jump: keyboard.p1Jump,
      label: 'Keyboard fallback',
    };
  }

  const pad = getBoundGamepad('right');
  if (pad) return normalizeGamepadInput(pad);
  return {
    left: keyboard.p2Left,
    right: keyboard.p2Right,
    jump: keyboard.p2Jump,
    label: 'Keyboard fallback',
  };
}

function normalizeGamepadInput(pad) {
  const axisX = pad.axes[0] ?? 0;
  const left = axisX < -0.28 || Boolean(pad.buttons[14]?.pressed);
  const right = axisX > 0.28 || Boolean(pad.buttons[15]?.pressed);
  const jump = Boolean(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || pad.buttons[2]?.pressed);
  return { left, right, jump, label: pad.id };
}

function applyInput(player, input) {
  if (player.finished) return;
  if (input.left) player.vx -= player.speed;
  if (input.right) player.vx += player.speed;
  player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));

  if (input.jump && player.onGround && !player.jumpLatch) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }
  player.jumpLatch = input.jump;
}

function updatePlayer(player) {
  if (player.finished) return;

  player.vy += world.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.vx *= 0.82;

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
    const overlap =
      player.x < platform.x + platform.w &&
      player.x + player.width > platform.x &&
      player.y < platform.y + platform.h &&
      player.y + player.height > platform.y;

    if (!overlap) continue;

    const prevBottom = player.y + player.height - player.vy;
    if (prevBottom <= platform.y + 12 && player.vy >= 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    if (player.vx > 0) player.x = platform.x - player.width;
    if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
  }

  if (player.y > world.height + 120) {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
  }

  if (
    player.x < world.finish.x + world.finish.w &&
    player.x + player.width > world.finish.x &&
    player.y < world.finish.y + world.finish.h &&
    player.y + player.height > world.finish.y
  ) {
    player.finished = true;
    player.wins += 1;
  }
}

function resetRound() {
  players.forEach((player) => {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.jumpLatch = false;
    player.finished = false;
  });
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(140, 105, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.66)';
  drawCloud(260, 120, 1);
  drawCloud(780, 90, 1.18);

  ctx.fillStyle = '#67b35c';
  ctx.fillRect(0, 540, 1080, 60);

  ctx.fillStyle = '#497d35';
  world.platforms.slice(1).forEach((platform) => {
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });

  ctx.fillStyle = '#7b4a2a';
  ctx.fillRect(world.finish.x + 8, world.finish.y, 6, world.finish.h);
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.moveTo(world.finish.x + 14, world.finish.y + 8);
  ctx.lineTo(world.finish.x + 58, world.finish.y + 18);
  ctx.lineTo(world.finish.x + 14, world.finish.y + 30);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 10 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 48 * scale, y, 22 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayers() {
  players.forEach((player, index) => {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(player.x + 6, player.y + 10, 5, 5);
    ctx.fillRect(player.x + 19, player.y + 10, 5, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${player.name}: ${player.wins}`, 18, 30 + index * 24);

    if (player.finished) {
      ctx.fillStyle = '#111827';
      ctx.fillText('Goal!', player.x - 2, player.y - 12);
    }
  });
}

function renderStatus() {
  const leftPad = getBoundGamepad('left');
  const rightPad = getBoundGamepad('right');
  const rows = [
    {
      title: 'Left Joy-Con → Player 1',
      detail: assignedJoycons.left ? assignedJoycons.left.productName : 'Not assigned',
      state: leftPad ? 'Gamepad active' : assignedJoycons.left ? 'Waiting for gamepad mapping' : 'Disconnected',
    },
    {
      title: 'Right Joy-Con → Player 2',
      detail: assignedJoycons.right ? assignedJoycons.right.productName : 'Not assigned',
      state: rightPad ? 'Gamepad active' : assignedJoycons.right ? 'Waiting for gamepad mapping' : 'Disconnected',
    },
  ];

  statusEl.innerHTML = rows
    .map(
      (row) => `
        <div class="status-row">
          <div>
            <strong>${row.title}</strong>
            <span>${row.detail}</span>
          </div>
          <span>${row.state}</span>
        </div>
      `,
    )
    .join('');
}

function loop() {
  const input1 = getInputForPlayer(0);
  const input2 = getInputForPlayer(1);

  applyInput(players[0], input1);
  applyInput(players[1], input2);
  updatePlayer(players[0]);
  updatePlayer(players[1]);

  drawScene();
  drawPlayers();
  renderStatus();
  requestAnimationFrame(loop);
}

renderStatus();
resetRound();
loop();
