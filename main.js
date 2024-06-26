// contants
let CANVAS_HEIGHT = window.innerHeight;
let CANVAS_WIDTH = window.innerWidth;
const GRAVITY = 1100;
const FRICTION = -0.5;
const RESTITUTION = 0.8;
const INPUT_SCALING = 50;
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
const pointerPos = {x: 0, y: 0};
const pointerPrev = {x: 0, y: 0};

let deltaTime = 0;
let oldTimestamp = 0;
let isPaused = true;
let showHeading = false;
let collisionEnabled = true;
let selectedCircle = null;
let inputIsFocused = false;

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

window.addEventListener("blur", () => {
  pauseCheckboxEl.checked = true;
})

/** @type CanvasRenderingContext2D */
const ctx = canvas.getContext("2d");

class Circle {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color || "black";
    this.vx = 150;
    this.vy = 0;
    this.angle = 0;
    this.isHeld = false;
    this.pos = {x: this.x, y: this.y};
    this.lines = [
      new Line({x: this.x, y: this.y}, {x: this.x, y: this.y - this.r}),
      new Line({x: this.x, y: this.y}, {x: this.x, y: this.y + this.r}),
      new Line({x: this.x, y: this.y}, {x: this.x - this.r, y: this.y}),
      new Line({x: this.x, y: this.y}, {x: this.x + this.r, y: this.y})
    ];
  }

  draw() {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    ctx.strokeStyle = this.color;
    ctx.stroke();
    ctx.closePath();

    this.lines.forEach(line => {
      line.draw();
    })

    if (showHeading) {
      if (Math.abs(this.vx) <= 0.1 && Math.abs(this.vy) <= 0.1) return;

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.vx, this.y + this.vy);
      ctx.stroke();
      ctx.closePath();
    }
  }

  update(deltaTime) {
    if (this.isHeld) {
      this.vx = (pointerPos.x - pointerPrev.x) * 50;
      this.vy = (pointerPos.y - pointerPrev.y) * 50;
    } else {
      this.vx += (this.vx * FRICTION * deltaTime);
      this.x += (this.vx * deltaTime);

      this.vy += (GRAVITY * deltaTime);
      this.y += (this.vy * deltaTime);
    }

    this.lineUpdate();

    this.angle += ((this.vx * deltaTime) / this.r);
    this.lines.forEach(line => {
      line.update(this.angle);
    })
  }

  lineUpdate() {
    this.lines.forEach(line => {
      line.vec1 = {x: this.x, y: this.y};  
    })
    this.lines[0].vec2 = {x: this.x, y: this.y - this.r};
    this.lines[1].vec2 = {x: this.x, y: this.y + this.r};
    this.lines[2].vec2 = {x: this.x - this.r, y: this.y};
    this.lines[3].vec2 = {x: this.x + this.r, y: this.y};
  }

  collideWithWall() {
    if (this.x - this.r < 0) {
      this.x = this.r;
      this.vx = -this.vx;
    }
    if (this.x + this.r > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.r;
      this.vx = -this.vx;
    }
    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vy = -this.vy * RESTITUTION;
    }
    if (this.y + this.r > CANVAS_HEIGHT) {
      this.y = CANVAS_HEIGHT - this.r;
      this.vy = -this.vy * RESTITUTION;
    }
  }

  inCircle(mousePos) {
    return (this.x - mousePos.x)**2 + (this.y - mousePos.y)**2 <= this.r*this.r;
  }

  collideBetweenCircle(other) {
    const distBetween = (this.x - other.x)**2 + (this.y - other.y)**2;
    return distBetween <= (this.r + other.r)*(this.r + other.r);
  }

  collideWithOtherBall(other) {
    let vCollision = {x: other.x - this.x, y: other.y - this.y};
    if (vCollision.x === 0 && vCollision.y === 0) {
      this.isHeld = false;
      this.x += this.r+this.r;
      return;;
    }; 

    let distance = Math.sqrt((other.x-this.x)**2 + (other.y-this.y)**2);
    let normalizedVCollision = {x: vCollision.x / distance, y: vCollision.y / distance};

    let sumOfRadius = this.r + other.r;
    let newVCollision = {x: normalizedVCollision.x * sumOfRadius, y: normalizedVCollision.y * sumOfRadius};
    other.x = newVCollision.x + this.x;
    other.y = newVCollision.y + this.y;

    other.lineUpdate();

    let vRelativeVelocity = {x: this.vx - other.vx, y: this.vy - other.vy};
    let speed = vRelativeVelocity.x * normalizedVCollision.x + vRelativeVelocity.y * normalizedVCollision.y;
    speed *= RESTITUTION;

    if(speed < 0) return;

    let impulse = 2 * speed / (sumOfRadius);

    this.vx -= (impulse * other.r * normalizedVCollision.x);
    this.vy -= (impulse * other.r * normalizedVCollision.y);
    other.vx += (impulse * this.r * normalizedVCollision.x);
    other.vy += (impulse * this.r * normalizedVCollision.y);
  }
}

class Line {
  constructor(vec1, vec2) {
    this.vec1 = vec1;
    this.vec2 = vec2;
  }

  draw() {
    ctx.beginPath();
    ctx.moveTo(this.vec1.x, this.vec1.y);
    ctx.lineTo(this.vec2.x, this.vec2.y);
    ctx.stroke();
    ctx.closePath();
  }

  update(w) {
    this.vec2 = this.rotate(w);
  }

  rotate(w) {
    let rotationVector = {x: this.vec1.x - this.vec2.x, y: this.vec1.y - this.vec2.y};
    let nextVec2X = rotationVector.x * Math.cos(w) - rotationVector.y * Math.sin(w);
    let nextVec2Y = rotationVector.x * Math.sin(w) + rotationVector.y * Math.cos(w);
    return {x: this.vec1.x - nextVec2X, y: this.vec1.y - nextVec2Y};
  }
}

const circles = [new Circle(100, 100, 50)];

const playButtonEl = document.getElementById("play-button");
const pauseButtonEl = document.getElementById("pause-button");
const pauseCheckboxEl = document.getElementById("play-pause");
pauseCheckboxEl.checked = isPaused;

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

const addButtonEl = document.getElementById("add-button");
addButtonEl.addEventListener("click", () => {
  if (circles.length > 30) return;
  const randomXPos = getRandomIntInclusive(50, CANVAS_WIDTH-50);
  const randomColor = colors[getRandomIntInclusive(0, colors.length-1)];
  circles.push(new Circle(randomXPos, 100, 50, randomColor));
})

const deleteButtonEl = document.getElementById("delete-button");
deleteButtonEl.addEventListener("click", () => {
  if (selectedCircle && circles.length > 1) {
    circles.splice(selectedCircle, 1);
    selectedCircle = null;
    return;
  }
  if (circles.length > 1) {
    circles.shift();
  }
})

const optionsContainerEl = document.getElementById("options-container");
optionsContainerEl.style.display = "none";

const showHeadingOptionEl = document.getElementById("show-headings");
const enableCollisionOptionEl = document.getElementById("collision-detection");

const menuButtonEl = document.getElementById("menu-button");
menuButtonEl.addEventListener("click", () => {
  if (optionsContainerEl.style.display === "none") {
    optionsContainerEl.style.display = "flex";
  } else {
    optionsContainerEl.style.display = "none";
  }
})

const vxInputEl = document.getElementById("vx-input");
vxInputEl.addEventListener("change", () => {
  circles[selectedCircle].vx = Number(vxInputEl.value * INPUT_SCALING);
})
const vyInputEl = document.getElementById("vy-input");
vyInputEl.addEventListener("change", () => {
  circles[selectedCircle].vy = Number(vyInputEl.value * INPUT_SCALING);
})

const inputs = document.querySelectorAll(".inputs-wrapper > input");
inputs.forEach(input => {
  input.addEventListener("focus", () => {
    pauseCheckboxEl.checked = true;
    inputIsFocused = true;
  })
  input.addEventListener("focusout", () => {
    pauseCheckboxEl.checked = false;
    inputIsFocused = false;
  })
})

canvas.addEventListener("pointermove", (e) => {
  pointerPos.x = e.clientX;
  pointerPos.y = e.clientY;

  for (let circle of circles) {
    if (circle.isHeld) {
      canvas.style.cursor = "grabbing";
      break;
    }
    if (circle.inCircle(pointerPos)) {
      canvas.style.cursor = "grab";
      break;
    }
    canvas.style.cursor = "default";
  }
})

canvas.addEventListener("pointerdown", (e) => {
  pointerPos.x = e.clientX;
  pointerPos.y = e.clientY;

  circles.forEach((circle, index) => {
    if (circle.inCircle(pointerPos)) {
      selectedCircle = index;
      circle.isHeld = true;
      canvas.style.cursor = "grabbing";
    } else {
      circle.isHeld = false;
    }
  })
})

canvas.addEventListener("pointerup", (e) => {
  circles.forEach(circle => {
    if (circle.inCircle(pointerPos)) {
      canvas.style.cursor = "grab";
    }
    circle.isHeld = false;
  })
})

let fpsCounterIntervalId = null;
let initialFpsCounterTimeoutId = null;
let renderCount = 0;
let fps = Infinity;
let lastfps;
let secondLastFps;
let thirdLastFps;

pauseCheckboxEl.addEventListener('change', (e) => {
  if (e.target.checked) {
    clearInterval(fpsCounterIntervalId);
    clearTimeout(initialFpsCounterTimeoutId);

    fpsCounterIntervalId = null;
    initialFpsCounterTimeoutId = null;
  } else {
    thirdLastFps = secondLastFps = lastfps = fps = Infinity;
    renderCount = 0;

    let initialFpsCounterIntervalId = setInterval(() => {
      fps = Math.round(1 / deltaTime);
    }, 17);

    initialFpsCounterTimeoutId = setTimeout(() => {
      fps = Math.round(thirdLastFps = secondLastFps = lastfps = renderCount)
      renderCount = 0

      clearInterval(initialFpsCounterIntervalId);

      fpsCounterIntervalId = setInterval(() => {
        thirdLastFps = secondLastFps;
        secondLastFps = lastfps;
        lastfps = renderCount;

        fps = Math.round((thirdLastFps + secondLastFps + lastfps) / 3);
        renderCount = 0;
      }, 1000);
    }, 1000)
  }
})

function showFps() {
  let fontSize = 16;
  ctx.font = `${fontSize}px JetBrains Mono`;
  ctx.fillStyle = "black";
  ctx.fillText("FPS: " + fps, 16, 16 + fontSize);

  renderCount++;
}

function update() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  console.log(circles[0].x, circles[0].y);

  isPaused = pauseCheckboxEl.checked;
  collisionEnabled = enableCollisionOptionEl.checked;
  showHeading = showHeadingOptionEl.checked;

  if (!inputIsFocused && selectedCircle !== null) {
    vxInputEl.value = Math.round((circles[selectedCircle].vx / INPUT_SCALING) * 10000) / 10000;
    vyInputEl.value = Math.round((circles[selectedCircle].vy / INPUT_SCALING) * 10000) / 10000;
  }

  if (isPaused) {
    playButtonEl.style.display = "none";
    pauseButtonEl.style.display = "grid";
  } else {
    playButtonEl.style.display = "grid";
    pauseButtonEl.style.display = "none";
  }

  circles.forEach((circle, index) => {
    if (circle.isHeld) {
      circle.x = pointerPos.x;
      circle.y = pointerPos.y;
      circle.vx = 0;
      circle.vy = 0;
    }

    circle.collideWithWall();

    if (collisionEnabled) {
      let ball = circles[index];
      for(let j = index + 1; j < circles.length; j++){
        let testBall = circles[j];
        if (ball.collideBetweenCircle(testBall)){
          ball.collideWithOtherBall(testBall);
        }
      }
    }

    circle.update(deltaTime);
    circle.draw();
  })

  if (!isPaused) {
    showFps();
  }

  pointerPrev.x = pointerPos.x;
  pointerPrev.y = pointerPos.y;
}

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  deltaTime = (timestamp - oldTimestamp) / 1000 * !isPaused;
  oldTimestamp = timestamp;

  update();
}

requestAnimationFrame(gameLoop);
