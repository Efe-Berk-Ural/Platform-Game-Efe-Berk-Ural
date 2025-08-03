const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const world = {
  width: 800,
  height: 450,
  maxWidth: 2400,
};

const player = {
  x: 50,
  y: 350,
  width: 32,
  height: 32,
  velocityY: 0,
  onGround: false,
  health: 100,
  isAttacking: false,
  isShielding: false,
};

const gravity = 0.8;

const keys = {
  left: false,
  right: false,
  up: false,
};

const platforms = [
  { x: 0, y: 400, width: 800, height: 50 },
];

const zombies = [];

const flag = {
  x: 750,
  y: platforms[platforms.length - 1].y - 32,
  width: 16,
  height: 32,
  reached: false,
};

let fireworks = [];

const maxZombies = 10;

let gameStarted = false;
let gameOver = false;

let score = 0;
const scoreTexts = [];

// Klavye kontrolleri
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "ArrowUp") keys.up = true;
  if (e.code === "Space") {
    if (!player.isAttacking && gameStarted) {
      player.isAttacking = true;
      setTimeout(() => (player.isAttacking = false), 300);
    }
  }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    if (gameStarted) player.isShielding = true;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "ArrowUp") keys.up = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    player.isShielding = false;
  }
});

// Dokunmatik kontroller
document.getElementById("left").addEventListener("touchstart", (e) => { e.preventDefault(); keys.left = true; });
document.getElementById("left").addEventListener("touchend", (e) => { e.preventDefault(); keys.left = false; });
document.getElementById("right").addEventListener("touchstart", (e) => { e.preventDefault(); keys.right = true; });
document.getElementById("right").addEventListener("touchend", (e) => { e.preventDefault(); keys.right = false; });
document.getElementById("up").addEventListener("touchstart", (e) => { e.preventDefault(); keys.up = true; });
document.getElementById("up").addEventListener("touchend", (e) => { e.preventDefault(); keys.up = false; });
document.getElementById("attack").addEventListener("click", () => {
  if (!player.isAttacking && gameStarted) {
    player.isAttacking = true;
    setTimeout(() => (player.isAttacking = false), 300);
  }
});
document.getElementById("shield").addEventListener("touchstart", (e) => { e.preventDefault(); if(gameStarted) player.isShielding = true; });
document.getElementById("shield").addEventListener("touchend", (e) => { e.preventDefault(); player.isShielding = false; });

function update() {
  if (!gameStarted) {
    if (gameOver) {
      drawGameOver();
    } else {
      drawInstructions();
    }
    requestAnimationFrame(update);
    return;
  }

  if (gameOver) {
    drawGameOver();
    return;
  }

  if (!flag.reached) {
    if (keys.left) player.x -= 3;
    if (keys.right) player.x += 3;
    if (keys.up && player.onGround) {
      player.velocityY = -15;
      player.onGround = false;
    }
  }

  player.velocityY += gravity;
  player.y += player.velocityY;

  // Boşluktan düşme kontrolü
  if (player.y > canvas.height) {
    gameOver = true;
    gameStarted = false;
    setTimeout(resetGame, 3000);
  }

  player.onGround = false;
  for (const p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y + player.height < p.y + p.height &&
      player.y + player.height + player.velocityY >= p.y
    ) {
      player.y = p.y - player.height;
      player.velocityY = 0;
      player.onGround = true;
    }
  }

  extendWorldIfNeeded();
  updateZombies();
  checkZombieCollision();
  checkFlagReach();
  updateFireworks();
  updateScoreTexts();

  draw();
  requestAnimationFrame(update);
}

function drawInstructions() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  const centerX = canvas.width / 2;

  const lines = [
    "Platform Game - Controls",
    "",
    "Left: ←",
    "Right: →",
    "Jump: ↑",
    "Attack: Space",
    "Shield: Shift",
    "",
    "Game will start in 10 seconds...",
  ];

  lines.forEach((line, i) => {
    ctx.fillText(line, centerX, 100 + i * 30);
  });
}

function extendWorldIfNeeded() {
  if (player.x > world.width * 0.7 && world.width < world.maxWidth) {
    const newPlatformX = world.width + 70;
    const newPlatformY = 400 - Math.random() * 100;
    platforms.push({
      x: newPlatformX,
      y: newPlatformY,
      width: 120,
      height: 20,
    });
    world.width += 190;

    flag.x = world.width - 50;
    flag.y = platforms[platforms.length - 1].y - flag.height;
  }
}

function spawnZombies() {
  if (zombies.length >= maxZombies) return;

  for (let i = 0; i < 3; i++) {
    let plat = platforms[Math.floor(Math.random() * platforms.length)];
    let spawnX = plat.x + Math.random() * Math.max(0, plat.width - 32);
    let spawnY = plat.y - 32;

    if (spawnX < plat.x) spawnX = plat.x;
    if (spawnX + 32 > plat.x + plat.width) spawnX = plat.x + plat.width - 32;

    zombies.push({
      x: spawnX,
      y: spawnY,
      width: 32,
      height: 32,
      dir: player.x < spawnX ? -1 : 1,
      speed: 1 + Math.random(),
      velocityY: 0,
      onGround: false,
      scale: 1,
      dying: false,
    });
  }
}

function updateZombies() {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];

    if (z.dying) {
      z.scale -= 0.05;
      if (z.scale <= 0) {
        zombies.splice(i, 1);
        continue;
      }
      continue;
    }

    if (player.x < z.x) {
      z.dir = -1;
      z.x += z.dir * z.speed;
    } else if (player.x > z.x) {
      z.dir = 1;
      z.x += z.dir * z.speed;
    }

    z.velocityY += gravity;
    z.y += z.velocityY;

    z.onGround = false;
    for (const p of platforms) {
      if (
        z.x < p.x + p.width &&
        z.x + z.width > p.x &&
        z.y + z.height < p.y + p.height &&
        z.y + z.height + z.velocityY >= p.y
      ) {
        z.y = p.y - z.height;
        z.velocityY = 0;
        z.onGround = true;
      }
    }

    let frontX = z.x + z.dir * z.speed + (z.dir > 0 ? z.width : 0);
    let frontY = z.y + z.height + 1;

    let platformAhead = platforms.some((p) => {
      return (
        frontX >= p.x &&
        frontX <= p.x + p.width &&
        frontY >= p.y &&
        frontY <= p.y + p.height
      );
    });

    if (!platformAhead && z.onGround) {
      z.velocityY = -12;
      z.onGround = false;
    }
  }
}

setInterval(spawnZombies, 2000);

function checkZombieCollision() {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const hit =
      player.x < z.x + z.width &&
      player.x + player.width > z.x &&
      player.y < z.y + z.height &&
      player.y + player.height > z.y;

    if (hit) {
      if (player.isAttacking && !z.dying) {
        z.dying = true;
        score += 20;
        scoreTexts.push({
          x: z.x - player.x + 100,
          y: z.y,
          text: "+20",
          alpha: 1,
        });
      } else if (!player.isShielding) {
        player.health -= 1;
      }
    }
  }
}

function checkFlagReach() {
  if (
    player.x < flag.x + flag.width &&
    player.x + player.width > flag.x &&
    player.y < flag.y + flag.height &&
    player.y + player.height > flag.y
  ) {
    flag.reached = true;
    startFireworks();
  }
}

function startFireworks() {
  for (let i = 0; i < 50; i++) {
    fireworks.push({
      x: flag.x,
      y: flag.y,
      dx: Math.random() * 4 - 2,
      dy: Math.random() * -3 - 2,
      radius: 2 + Math.random() * 2,
      life: 100,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    });
  }
}

function updateFireworks() {
  for (const f of fireworks) {
    f.x += f.dx;
    f.y += f.dy;
    f.dy += 0.05;
    f.life -= 1;
  }
  fireworks = fireworks.filter((f) => f.life > 0);
}

function updateScoreTexts() {
  for (let i = scoreTexts.length - 1; i >= 0; i--) {
    const st = scoreTexts[i];
    st.y -= 1;
    st.alpha -= 0.02;
    if (st.alpha <= 0) {
      scoreTexts.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#888";
  for (const p of platforms) {
    if (p.x + p.width > player.x - 200 && p.x < player.x + canvas.width) {
      ctx.fillRect(p.x - player.x + 100, p.y, p.width, p.height);
    }
  }

  ctx.font = "28px sans-serif";
  ctx.fillText("🧑‍🚀", 100, player.y + player.height);

  if (player.isAttacking) {
    ctx.fillText("🗡", 100 + player.width + 5, player.y + player.height);
  }

  if (player.isShielding) {
    ctx.fillText("🛡", 100 - 30, player.y + player.height);
  }

  ctx.font = "28px sans-serif";
  zombies.forEach((z) => {
    ctx.save();
    const drawX = z.x - player.x + 100;
    ctx.translate(drawX + z.width / 2, z.y + z.height / 2);
    ctx.scale(z.scale, z.scale);
    ctx.fillText("🧟", -z.width / 2, z.height / 2);
    ctx.restore();
  });

  ctx.fillText("🏁", flag.x - player.x + 100, flag.y + flag.height);

  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 100, 10);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, player.health, 10);

  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Score: " + score, canvas.width - 20, 40);
  ctx.textAlign = "start";

  ctx.font = "18px sans-serif";
  scoreTexts.forEach((st) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
    ctx.fillText(st.text, st.x, st.y);
  });

  for (const f of fireworks) {
    ctx.beginPath();
    ctx.arc(f.x - player.x + 100, f.y, f.radius, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
  }
}

function drawGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "red";
  ctx.font = "48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
}

function resetGame() {
  player.x = 50;
  player.y = 350;
  player.velocityY = 0;
  player.onGround = false;
  player.health = 100;
  player.isAttacking = false;
  player.isShielding = false;

  platforms.length = 0;
  platforms.push({ x: 0, y: 400, width: 800, height: 50 });
  world.width = 800;

  zombies.length = 0;

  flag.x = 750;
  flag.y = platforms[platforms.length - 1].y - flag.height;
  flag.reached = false;

  score = 0;
  scoreTexts.length = 0;

  fireworks.length = 0;

  gameOver = false;
  gameStarted = false;

  setTimeout(() => {
    gameStarted = true;
  }, 10000);
}

// Başlangıç
update();
setTimeout(() => {
  gameStarted = true;
}, 10000);
