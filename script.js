const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Game Variables ---
let score = 0;
let isGameOver = false;

// Paddle
let paddleHeight = 10;
let paddleWidth = 45; // Base width
let basePaddleWidth = 45; // Store base width for reset or calculation
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;

// Paddle image
const paddleImg = new Image();
paddleImg.src = "ragdoll.png";

// Shake Effect
let shakeDuration = 0;

// Power-up Timer (for Expand)
let expandTimeout = null;

// Bricks
const brickRowCount = 5;
const brickColumnCount = 8;
const brickPadding = 5;
const brickOffsetTop = 25;
const brickOffsetLeft = 30;
const brickWidth = (canvas.width - brickOffsetLeft * 2 - brickPadding * (brickColumnCount - 1)) / brickColumnCount;
const brickHeight = 15;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
}

// --- Balls & Power-ups ---
let balls = [];
let powerUps = [];

// Ball properties
const ballRadius = 6;
const initialSpeed = 4; // Keep the faster speed requested

function createBall(x, y, dx, dy) {
    return { x: x, y: y, dx: dx, dy: dy, history: [] }; // Add history array
}

function initGame() {
    balls = [createBall(canvas.width / 2, canvas.height - 30, initialSpeed, -initialSpeed)];
    powerUps = [];
    score = 0;
    isGameOver = false;
    paddleWidth = basePaddleWidth;
    shakeDuration = 0;

    // Reset bricks
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r].status = 1;
        }
    }

    // Hide overlay
    document.getElementById("gameOverlay").classList.add("hidden");

    // Clear any existing timeouts
    if (expandTimeout) clearTimeout(expandTimeout);

    draw();
}

// --- Event Listeners ---
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key == "Right" || e.key == "ArrowRight") {
        rightPressed = true;
    } else if (e.key == "Left" || e.key == "ArrowLeft") {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key == "Right" || e.key == "ArrowRight") {
        rightPressed = false;
    } else if (e.key == "Left" || e.key == "ArrowLeft") {
        leftPressed = false;
    }
}

const restartButton = document.getElementById("restartButton");
if (restartButton) {
    restartButton.addEventListener("click", function () {
        initGame();
    });
    // Add touch support for restart button
    restartButton.addEventListener("touchstart", function (e) {
        e.preventDefault();
        initGame();
    });
}

// Touch support for canvas
canvas.addEventListener("touchstart", touchHandler, { passive: false });
canvas.addEventListener("touchmove", touchHandler, { passive: false });

function touchHandler(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    let touchX = e.touches[0].clientX - rect.left;
    touchX *= scaleX;

    if (touchX > 0 && touchX < canvas.width) {
        paddleX = touchX - paddleWidth / 2;
    }
}

paddleImg.onload = function () {
    const aspectRatio = paddleImg.naturalHeight / paddleImg.naturalWidth;
    paddleHeight = paddleWidth * aspectRatio;
};

// --- Power-up Logic ---
const POWERUP_TYPES = {
    EXPAND: { color: "#FF00FF", text: "W" }, // Wide
    MULTIBALL: { color: "#00FFFF", text: "M" }  // Multi
};

function spawnPowerUp(x, y) {
    // 20% chance to drop
    if (Math.random() < 0.2) {
        const type = Math.random() < 0.5 ? "EXPAND" : "MULTIBALL";
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: type,
            dy: 2
        });
    }
}

function activatePowerUp(type) {
    if (type === "EXPAND") {
        paddleWidth = basePaddleWidth * 1.5;
        // Recalculate height to maintain ratio
        const aspectRatio = paddleImg.naturalHeight / paddleImg.naturalWidth;
        paddleHeight = paddleWidth * aspectRatio;

        if (expandTimeout) clearTimeout(expandTimeout);
        expandTimeout = setTimeout(() => {
            paddleWidth = basePaddleWidth;
            if (paddleImg.complete && paddleImg.naturalWidth > 0) {
                const aspectRatio = paddleImg.naturalHeight / paddleImg.naturalWidth;
                paddleHeight = paddleWidth * aspectRatio;
            }
        }, 10000); // 10 seconds
    } else if (type === "MULTIBALL") {
        // Add 2 balls
        // Spawn from the first ball's position if exists, otherwise center
        const refBall = balls[0] || { x: canvas.width / 2, y: canvas.height / 2 };
        balls.push(createBall(refBall.x, refBall.y, initialSpeed, -initialSpeed * 0.8));
        balls.push(createBall(refBall.x, refBall.y, -initialSpeed, -initialSpeed * 0.8));
    }
}

// --- Collision Detection ---
function collisionDetection() {
    for (let i = 0; i < balls.length; i++) {
        let b = balls[i];
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                let brick = bricks[c][r];
                if (brick.status == 1) {
                    if (b.x > brick.x && b.x < brick.x + brickWidth && b.y > brick.y && b.y < brick.y + brickHeight) {
                        b.dy = -b.dy;
                        brick.status = 0;
                        score++;
                        spawnPowerUp(brick.x + brickWidth / 2, brick.y + brickHeight / 2);

                        if (score == brickRowCount * brickColumnCount) {
                            showGameOver(true);
                        }
                    }
                }
            }
        }
    }
}

function showGameOver(isWin) {
    isGameOver = true;
    const overlay = document.getElementById("gameOverlay");
    const title = document.querySelector("#gameOverlay h2");

    // Correct ID is overlayScore
    const scoreSpan = document.getElementById("overlayScore");

    title.textContent = isWin ? "YOU WIN!" : "GAME OVER";
    title.style.color = isWin ? "#4CAF50" : "#ff4444";
    if (scoreSpan) scoreSpan.textContent = "Score: " + score;
    overlay.classList.remove("hidden");
}

// --- Draw Functions ---

function drawBall(b) {
    // Draw trail
    for (let i = 0; i < b.history.length; i++) {
        const pos = b.history[i];
        const opacity = (i + 1) / b.history.length; // Fade in towards current pos
        const size = ballRadius * (0.5 + 0.5 * opacity); // Taper size

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity * 0.5})`; // Gold trail
        ctx.fill();
        ctx.closePath();
    }

    // Draw current ball
    ctx.beginPath();
    ctx.arc(b.x, b.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700"; // Gold/Yellow ball
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    let drawX = paddleX;
    let drawY = canvas.height - paddleHeight;

    // Apply shake offset
    if (shakeDuration > 0) {
        drawX += (Math.random() - 0.5) * 10;
        drawY += (Math.random() - 0.5) * 10;
        shakeDuration--;
    }

    if (paddleImg.complete && paddleImg.naturalWidth > 0) {
        ctx.drawImage(paddleImg, drawX, drawY, paddleWidth, paddleHeight);
    } else {
        ctx.beginPath();
        ctx.rect(drawX, drawY, paddleWidth, paddleHeight);
        ctx.fillStyle = "#005f99";
        ctx.fill();
        ctx.closePath();
    }
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status == 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = "#fff"; // White bricks
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawPowerUps() {
    for (let i = 0; i < powerUps.length; i++) {
        let p = powerUps[i];
        ctx.beginPath();
        ctx.rect(p.x - 10, p.y - 10, p.width, p.height);
        ctx.fillStyle = POWERUP_TYPES[p.type].color;
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(POWERUP_TYPES[p.type].text, p.x, p.y);
        ctx.closePath();
    }
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 8, 20);
}

function draw() {
    if (isGameOver) return; // Stop loop if game over

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawPowerUps();
    drawScore();

    // Draw all balls
    for (let i = 0; i < balls.length; i++) {
        drawBall(balls[i]);
    }

    collisionDetection();

    // Update Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let p = powerUps[i];
        p.y += p.dy;

        // Collision with paddle
        if (p.x > paddleX && p.x < paddleX + paddleWidth && p.y + p.height > canvas.height - paddleHeight) {
            activatePowerUp(p.type);
            powerUps.splice(i, 1);
            continue;
        }

        // Remove if off screen
        if (p.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }

    // Update Balls
    for (let i = balls.length - 1; i >= 0; i--) {
        let b = balls[i];

        // Update history for trail
        if (!b.history) b.history = []; // Safety check
        b.history.push({ x: b.x, y: b.y });
        if (b.history.length > 10) { // Limit trail length
            b.history.shift();
        }

        // Wall collision
        if (b.x + b.dx > canvas.width - ballRadius || b.x + b.dx < ballRadius) {
            b.dx = -b.dx;
        }
        if (b.y + b.dy < ballRadius) {
            b.dy = -b.dy;
        } else if (b.y + b.dy > canvas.height - ballRadius - paddleHeight && b.y + b.dy < canvas.height) {
            // Paddle collision check
            if (b.x > paddleX && b.x < paddleX + paddleWidth) {
                // Calculate angle based on where hit
                let hitPoint = b.x - (paddleX + paddleWidth / 2);
                // Normalize hit point (-1 to 1)
                let normalizedHit = hitPoint / (paddleWidth / 2);

                // Adjust dx based on hit point for better gameplay
                // Current speed is approx 6 (pythagoras of 4,4). 
                // Let's keep it simple.
                b.dx = normalizedHit * 5;
                b.dy = -Math.abs(b.dy); // Ensure it goes up
                if (Math.abs(b.dy) < 2) b.dy = -2;

                // Trigger Shake
                shakeDuration = 10;
            }
        }

        if (b.y + b.dy > canvas.height - ballRadius) {
            // Ball lost
            balls.splice(i, 1);
        } else {
            b.x += b.dx;
            b.y += b.dy;
        }
    }

    // Check Game Over
    if (balls.length === 0) {
        showGameOver(false);
    }

    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }

    if (!isGameOver) {
        requestAnimationFrame(draw);
    }
}

// Initial Start
balls = [createBall(canvas.width / 2, canvas.height - 30, initialSpeed, -initialSpeed)];
createStars(); // Generate stars background
draw();

function createStars() {
    const starContainer = document.getElementById("star-container");
    if (!starContainer) return;

    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        star.classList.add("star");

        // 30% chance for yellow star
        if (Math.random() < 0.3) {
            star.classList.add("yellow");
        }

        // Random position
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        star.style.left = x + "vw";
        star.style.top = y + "vh";

        // Random size
        const size = Math.random() * 2 + 1; // 1px to 3px
        star.style.width = size + "px";
        star.style.height = size + "px";

        // Random animation delay
        const duration = Math.random() * 3 + 2; // 2s to 5s
        const delay = Math.random() * 5;
        star.style.animationDuration = duration + "s";
        star.style.animationDelay = delay + "s";

        starContainer.appendChild(star);
    }
}
