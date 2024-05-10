// contants
let CANVAS_HEIGHT = window.innerHeight;
let CANVAS_WIDTH = window.innerWidth;
const GRAVITY = 1;
const FRICTION = 0.005;
const ELASTICITY = 0.9;
const colors = [
    "#dc8a78",
    "#dd7878",
    "#ea76cb",
    "#8839ef",
    "#d20f39",
    "#e64553",
    "#fe640b",
    "#df8e1d",
    "#40a02b",
    "#179299",
    "#04a5e5",
    "#209fb5",
    "#1e66f5",
    "#7287fd"
];
const mousePos = {x: 0, y: 0};

let deltaTime = 0;
let oldTimestamp = 0;
let isPaused = true;
let showHeading = false;
let collisionEnabled = true;

/** @type HTMLCanvasElement */
const canvas = document.getElementById("canvas");

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

window.addEventListener("resize", () => {
  CANVAS_HEIGHT = window.innerHeight;
  CANVAS_WIDTH = window.innerWidth;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
})

/** @type CanvasRenderingContext2D */
const ctx = canvas.getContext("2d");

class Circle {
  constructor(x, y, r, strokeColor) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.strokeColor = strokeColor || "black";
    this.dx = 5;
    this.dy = 1;
    this.isHeld = false;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    ctx.strokeStyle = "black"
    ctx.stroke();
    ctx.fillStyle = this.strokeColor;
    ctx.fill();

    if (showHeading) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.dx * 10, this.y + this.dy * 10);
      ctx.stroke();
    }
  }

  update() {
    if (isPaused) {
      return;
    }

    this.dx -= this.dx * FRICTION;
    this.x += this.dx;

    this.dy += GRAVITY;
    this.y += this.dy;
  }
}

const circleArr = [new Circle(100, 100, 50)];

const pauseButtonEl = document.getElementById("pause_button");
pauseButtonEl.addEventListener("click", () => {
  isPaused = !isPaused;
})

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

const addButtonEl = document.getElementById("add_button");
addButtonEl.addEventListener("click", () => {
  const randomXPos = getRandomIntInclusive(50, CANVAS_WIDTH-50);
  const randomColor = colors[getRandomIntInclusive(0, colors.length-1)];
  const randomRad = getRandomIntInclusive(30, 50);
  circleArr.push(new Circle(randomXPos, 100, randomRad, randomColor));
})

const deleteButtonEl = document.getElementById("delete_button");
deleteButtonEl.addEventListener("click", () => {
  if (circleArr.length > 1) {
    circleArr.shift();
  }
})

const optionsContainerEl = document.getElementById("options_container");
optionsContainerEl.style.display = "none";

const showHeadingOptionEl = document.getElementById("show_headings");
showHeadingOptionEl.addEventListener("change", () => {
  showHeading = !showHeading;
})
const enableCollisionOptionEl = document.getElementById("collision_detection");
enableCollisionOptionEl.addEventListener("change", () => {
  collisionEnabled = !collisionEnabled;
})

const menuButtonEl = document.getElementById("menu_button");
menuButtonEl.addEventListener("click", () => {
  if (optionsContainerEl.style.display === "none") {
    optionsContainerEl.style.display = "flex";
  } else {
    optionsContainerEl.style.display = "none";
  }
})

function collideWithWall(circle) {
  if (circle.x - circle.r < 0) {
    circle.x = circle.r;
    circle.dx = -circle.dx;
  }
  if (circle.x + circle.r > CANVAS_WIDTH) {
    circle.x = CANVAS_WIDTH - circle.r;
    circle.dx = -circle.dx;
  }
  if (circle.y - circle.r < 0) {
    circle.y = circle.r;
    circle.dy = -circle.dy * ELASTICITY;
  }
  if (circle.y + circle.r > CANVAS_HEIGHT) {
    circle.y = CANVAS_HEIGHT - circle.r;
    circle.dy = -circle.dy * ELASTICITY;
  }
}

function ballHitBall(ball1, ball2) {
  let collision = false;
  let dx = ball1.x - ball2.x;
  let dy = ball1.y - ball2.y;
  let distance = (dx * dx + dy * dy);
  if(distance <= (ball1.r + ball2.r)*(ball1.r + ball2.r)){
    collision = true;
  }
  return collision;
}

function collideBalls(ball1,ball2){
  let dx = ball2.x - ball1.x;
  let dy = ball2.y - ball1.y;
  let distance = Math.sqrt(dx * dx + dy * dy);
  let vCollisionNorm = {x: dx / distance, y:dy/distance}
  let vRelativeVelocity = {x: ball1.dx - ball2.dx,y:ball1.dy - ball2.dy};
  let speed = vRelativeVelocity.x * vCollisionNorm.x + vRelativeVelocity.y * vCollisionNorm.y;

  if(speed < 0) return;

  let impulse = 2 * speed / (ball1.r + ball2.r);

  ball1.dx -= (impulse * ball2.r * vCollisionNorm.x);
  ball1.dy -= (impulse * ball2.r * vCollisionNorm.y);
  ball2.dx += (impulse * ball1.r * vCollisionNorm.x);
  ball2.dy += (impulse * ball1.r * vCollisionNorm.y);

  ball1.dy = (ball1.dy * ELASTICITY);
  ball2.dy = (ball2.dy * ELASTICITY);
}

function collide(index) {
  let ball = circleArr[index];
  for(let j = index + 1; j < circleArr.length; j++){
    let testBall = circleArr[j];
    if(ballHitBall(ball,testBall)){
      collideBalls(ball,testBall);
    }
  }
}

canvas.addEventListener("pointermove", (e) => {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;

  circleArr.forEach((circle) => {
    if (isAroundCircle(circle)) {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = "default";
    }

    if (circle.isHeld) {
      canvas.style.cursor = "grabbing";
      circle.x = mousePos.x;
      circle.y = mousePos.y;
    }
  })
})

canvas.addEventListener("pointerdown", (e) => {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;

  circleArr.forEach((circle) => {
    if (isAroundCircle(circle)) {
      isPaused = true;
      circle.isHeld = true;
      canvas.style.cursor = "grabbing";
    }
  })
})

canvas.addEventListener("pointerup", () => {
  circleArr.forEach((circle) => {
    if (isAroundCircle(circle)) {
      canvas.style.cursor = "grab";
    }
    circle.isHeld = false;
  })
})

function isAroundCircle(circle) {
  return (
    mousePos.x <= circle.x + circle.r &&
    mousePos.x >= circle.x - circle.r &&
    mousePos.y <= circle.y + circle.r &&
    mousePos.y >= circle.y - circle.r
  );
}

function update() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (isPaused) {
    pauseButtonEl.innerHTML = "Play"
  } else {
    pauseButtonEl.innerHTML = "Pause"
  }
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  deltaTime = (timestamp - oldTimestamp) / 1000;
  oldTimestamp = timestamp;

  update();

  circleArr.forEach((circle, index) => {
    collideWithWall(circle);
    circle.update();
    if (collisionEnabled) {
      collide(index);
    }
    circle.draw();
  })
}

circleArr.forEach((circle) => {
  circle.draw();
})
requestAnimationFrame(gameLoop);
