const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

const motorcycle = {
    x: 100,
    y: canvas.height - 100,
    width: 80,
    height: 40,
    speed: 5,
    dx: 0,
    dy: 0,
    gravity: 0.5,
    jumpPower: -10,
    isJumping: false,
    isDucking: false,
    level: 0
};

let obstacles = [];
let particles = [];
let score = 0;
let gameOver = false;
let isExploding = false;
let roadHeight = 100;
let scrollOffset = 0;
let wingFrame = 0;

function getRoadY(x) {
    const base = canvas.height - roadHeight;
    const offset = scrollOffset + x;
    // Combine two sine waves for more natural hills
    return base + Math.sin(offset * 0.003) * 60 + Math.sin(offset * 0.01) * 20;
}

function drawMotorcycle() {
    ctx.save();
    ctx.translate(motorcycle.x + motorcycle.width / 2, motorcycle.y + motorcycle.height / 2);
    ctx.translate(-motorcycle.x - motorcycle.width / 2, -motorcycle.y - motorcycle.height / 2);

    const x = motorcycle.x;
    const y = motorcycle.y;

    // --- Wheels ---
    // Rear wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 15, y + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 15, y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    // Front wheel
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 65, y + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 65, y + 32, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- Frame / Body ---
    // Main body (sleek shape)
    ctx.fillStyle = '#005C09';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 22);
    ctx.lineTo(x + 25, y + 5);
    ctx.lineTo(x + 55, y + 2);
    ctx.lineTo(x + 72, y + 15);
    ctx.lineTo(x + 70, y + 22);
    ctx.closePath();
    ctx.fill();

    // Chrome accent stripe
    ctx.fillStyle = '#00A811';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 18);
    ctx.lineTo(x + 30, y + 8);
    ctx.lineTo(x + 55, y + 6);
    ctx.lineTo(x + 65, y + 16);
    ctx.lineTo(x + 65, y + 18);
    ctx.closePath();
    ctx.fill();

    // Engine block
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 30, y + 18, 20, 10);
    ctx.fillStyle = '#777';
    ctx.fillRect(x + 32, y + 20, 6, 6);
    ctx.fillRect(x + 42, y + 20, 6, 6);

    // Exhaust pipe
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 25);
    ctx.lineTo(x + 2, y + 28);
    ctx.lineTo(x + 2, y + 32);
    ctx.lineTo(x + 10, y + 30);
    ctx.closePath();
    ctx.fill();
    // Exhaust tip
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x + 2, y + 30, 3, 0, Math.PI * 2);
    ctx.fill();

    // Windscreen
    ctx.fillStyle = 'rgba(173, 216, 230, 0.6)';
    ctx.beginPath();
    ctx.moveTo(x + 52, y + 2);
    ctx.lineTo(x + 58, y - 8);
    ctx.lineTo(x + 64, y - 6);
    ctx.lineTo(x + 62, y + 5);
    ctx.closePath();
    ctx.fill();

    // Headlight
    ctx.fillStyle = '#fffacd';
    ctx.beginPath();
    ctx.arc(x + 72, y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 72, y + 14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Tail light
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(x + 10, y + 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Seat
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 5);
    ctx.quadraticCurveTo(x + 38, y - 2, x + 48, y + 3);
    ctx.lineTo(x + 48, y + 8);
    ctx.lineTo(x + 28, y + 8);
    ctx.closePath();
    ctx.fill();

    // --- Rider ---
    const duckOffset = motorcycle.isDucking ? 8 : 0;
    // Legs (on pegs)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 35, y + 5 + duckOffset);
    ctx.lineTo(x + 28, y + 15);
    ctx.lineTo(x + 25, y + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 5 + duckOffset);
    ctx.lineTo(x + 42, y + 15);
    ctx.lineTo(x + 45, y + 22);
    ctx.stroke();

    // Body (torso) - leaning forward (lower when ducking)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 5 + duckOffset);
    ctx.lineTo(x + 45, y - 10 + duckOffset);
    ctx.stroke();

    // Jacket
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 6 + duckOffset);
    ctx.lineTo(x + 42, y - 12 + duckOffset);
    ctx.lineTo(x + 48, y - 10 + duckOffset);
    ctx.lineTo(x + 40, y + 6 + duckOffset);
    ctx.closePath();
    ctx.fill();

    // Arms reaching to handlebars
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 44, y - 8 + duckOffset);
    ctx.lineTo(x + 55, y - 2);
    ctx.lineTo(x + 58, y + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 43, y - 6 + duckOffset);
    ctx.lineTo(x + 52, y - 1);
    ctx.lineTo(x + 56, y + 4);
    ctx.stroke();

    // Gloves
    ctx.fillStyle = '#005C09';
    ctx.beginPath();
    ctx.arc(x + 58, y + 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 56, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#00A811';
    ctx.beginPath();
    ctx.arc(x + 46, y - 16 + duckOffset, 8, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.moveTo(x + 48, y - 20 + duckOffset);
    ctx.quadraticCurveTo(x + 56, y - 18 + duckOffset, x + 54, y - 13 + duckOffset);
    ctx.lineTo(x + 48, y - 12 + duckOffset);
    ctx.closePath();
    ctx.fill();

    // Visor shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 50, y - 19 + duckOffset);
    ctx.quadraticCurveTo(x + 54, y - 18 + duckOffset, x + 53, y - 15 + duckOffset);
    ctx.lineTo(x + 50, y - 15 + duckOffset);
    ctx.closePath();
    ctx.fill();

    // Helmet stripe
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 46, y - 16 + duckOffset, 8, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    // Upgrades (gold accents)
    if (motorcycle.level >= 1) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 15, y + 32, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 65, y + 32, 12, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (motorcycle.level >= 2) {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 15);
        ctx.lineTo(x + 5, y + 10);
        ctx.lineTo(x + 15, y + 12);
        ctx.closePath();
        ctx.fill();
    }
    if (motorcycle.level >= 3) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x + 52, y + 2);
        ctx.lineTo(x + 58, y - 8);
        ctx.lineTo(x + 64, y - 6);
        ctx.lineTo(x + 62, y + 5);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawBackground() {
    // Sunset sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FF4500'); // Orange
    gradient.addColorStop(0.5, '#FF6347'); // Tomato
    gradient.addColorStop(1, '#FFD700'); // Gold
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road (Curvy)
    ctx.fillStyle = '#261405'; // Dark brown
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= canvas.width; i += 10) {
        ctx.lineTo(i, getRoadY(i));
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Ceiling (Flat for now, or maybe slightly wavy inverted?)
    ctx.fillStyle = '#1a0e04'; 
    ctx.fillRect(0, 0, canvas.width, roadHeight);

    // Tunnel stripes texture on road
    ctx.strokeStyle = '#3d230e';
    ctx.lineWidth = 5;
    for (let i = 0; i < canvas.width; i += 40) {
        // Draw lines following the curve down
        const rx = (i - (scrollOffset % 40) + 40) % canvas.width; 
        // Simple vertical stripes on the terrain
        const y = getRoadY(rx);
        ctx.beginPath();
        ctx.moveTo(rx, y);
        ctx.lineTo(rx, canvas.height);
        ctx.stroke();
        
        // Ceiling stripes
        ctx.fillRect(rx, 0, 20, roadHeight);
    }

    // Story text background - dark brown box (drawn AFTER stripes to cover them)
    ctx.fillStyle = '#261405';
    ctx.fillRect(0, 10, canvas.width, 55);

    // Story text on the ceiling
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You carry confidential documents exposing the mafia. Deliver them to the police station', canvas.width / 2, 30);
    ctx.font = '12px Arial';
    ctx.fillText('before the syndicate\'s traps eliminate you and destroy the evidence forever!', canvas.width / 2, 50);
    ctx.textAlign = 'left';
}


function drawObstacles() {
    wingFrame += 0.1;
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'bird') {
            const bx = obstacle.x;
            const by = obstacle.y;
            const wingFlap = Math.sin(wingFrame * 5 + obstacle.x) * 12;

            // Body (oval)
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.ellipse(bx + 20, by + 8, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Belly
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(bx + 20, by + 10, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Left wing
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.moveTo(bx + 12, by + 6);
            ctx.quadraticCurveTo(bx - 2, by - 8 + wingFlap, bx - 5, by - 5 + wingFlap);
            ctx.quadraticCurveTo(bx + 5, by + 2, bx + 14, by + 8);
            ctx.closePath();
            ctx.fill();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(bx + 28, by + 6);
            ctx.quadraticCurveTo(bx + 42, by - 8 + wingFlap, bx + 45, by - 5 + wingFlap);
            ctx.quadraticCurveTo(bx + 35, by + 2, bx + 26, by + 8);
            ctx.closePath();
            ctx.fill();

            // Tail feathers
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(bx + 5, by + 7);
            ctx.lineTo(bx - 6, by + 3);
            ctx.lineTo(bx - 4, by + 9);
            ctx.lineTo(bx - 7, by + 12);
            ctx.lineTo(bx + 6, by + 10);
            ctx.closePath();
            ctx.fill();

            // Head
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.arc(bx + 34, by + 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(bx + 36, by + 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(bx + 36.5, by + 4, 1, 0, Math.PI * 2);
            ctx.fill();

            // Beak
            ctx.fillStyle = '#e8a317';
            ctx.beginPath();
            ctx.moveTo(bx + 39, by + 4);
            ctx.lineTo(bx + 44, by + 6);
            ctx.lineTo(bx + 39, by + 7);
            ctx.closePath();
            ctx.fill();
        } else if (obstacle.type === 'bomb') {
            // Bomb body
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, 0, Math.PI * 2);
            ctx.fill();
            // Shiny spot
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2 - 3, obstacle.y + obstacle.height / 2 - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            // Fuse
            ctx.fillStyle = 'orange';
            ctx.fillRect(obstacle.x + obstacle.width / 2 - 1, obstacle.y - 4, 2, 5);
            // Spark
            if (Math.random() > 0.5) {
                ctx.fillStyle = 'yellow';
                ctx.fillRect(obstacle.x + obstacle.width / 2 - 2, obstacle.y - 6, 4, 2);
            }
        } else if (obstacle.type === 'coin') {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function moveMotorcycle() {
    motorcycle.x += motorcycle.dx;
    motorcycle.y += motorcycle.dy;
    motorcycle.dy += motorcycle.gravity;

    // Wall detection
    if (motorcycle.x < 0) {
        motorcycle.x = 0;
    }

    if (motorcycle.x + motorcycle.width > canvas.width) {
        motorcycle.x = canvas.width - motorcycle.width;
    }

    // Ground detection (Curvy Road)
    // Check center of bike for ground height
    const groundY = getRoadY(motorcycle.x + motorcycle.width / 2);
    
    if (motorcycle.y + motorcycle.height > groundY) {
        motorcycle.y = groundY - motorcycle.height;
        motorcycle.dy = 0;
        motorcycle.isJumping = false;
    }
}

function moveObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.x -= obstacle.speed || 3;

        // Birds bob up and down slightly as they fly
        if (obstacle.type === 'bird') {
            obstacle.y += Math.sin(obstacle.x * 0.05) * 0.5;
        } else if (obstacle.type === 'bomb') {
            // Bombs roll along the ground
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - obstacle.height;
        } else if (obstacle.type === 'coin') {
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - 50;
        }
    });

    // Remove obstacles that have gone off screen
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > -50);
}

function createObstacle() {
    const typeNum = Math.floor(Math.random() * 3);
    const type = typeNum === 0 ? 'bird' : typeNum === 1 ? 'bomb' : 'coin';
    
    // Always spawn from the right side of the screen
    const spawnX = canvas.width + 20;
    let groundY = getRoadY(spawnX);
    let y, width, height, speed;
    
    if (type === 'bomb') {
        width = 20;
        height = 20;
        y = groundY - 20;
        speed = 3 + Math.random() * 2;
    } else if (type === 'coin') {
        width = 30;
        height = 20;
        y = groundY - 50;
        speed = 3 + Math.random() * 2;
    } else if (type === 'bird') {
        width = 45;
        height = 20;
        // Birds fly low, just above jump height so careless jumps = death
        y = groundY - 60 - Math.random() * 30;
        speed = 4 + Math.random() * 3;
    }

    obstacles.push({
        x: spawnX,
        y: y,
        width: width,
        height: height,
        type: type,
        speed: speed
    });
}

function createExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: Math.random() > 0.5 ? 'orange' : 'red'
        });
    }
}

function createBlood(x, y) {
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: 'darkred',
            gravity: 0.1
        });
    }
}

function updateParticles() {
    particles.forEach((p, index) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.gravity) {
            p.dy += p.gravity;
        }
        p.life -= 0.02;
        if (p.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
}

function detectCollision() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        const motorcycleBottom = motorcycle.y + motorcycle.height;
        const obstacleTop = obstacle.y;
        const motorcycleLeft = motorcycle.x;
        const motorcycleRight = motorcycle.x + motorcycle.width;
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;

        if (
            motorcycleRight > obstacleLeft &&
            motorcycleLeft < obstacleRight &&
            motorcycleBottom > obstacleTop
        ) {
            if (obstacle.type === 'coin') {
                if (
                    motorcycle.y < obstacle.y + obstacle.height &&
                    motorcycle.y + motorcycle.height > obstacle.y
                ) {
                    obstacles.splice(i, 1);
                    score += 100;
                    motorcycle.level++;
                }
            } else if (obstacle.type === 'bomb') {
                 if (
                    motorcycle.y < obstacle.y + obstacle.height &&
                    motorcycle.y + motorcycle.height > obstacle.y
                ) {
                    createExplosion(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                    isExploding = true;
                    // Remove bomb so we don't hit it again
                    obstacles.splice(i, 1);
                }
            } else if (obstacle.type === 'bird') {
                 // Hit a bird - but not if ducking!
                if (!motorcycle.isDucking) {
                    if (
                        motorcycle.y < obstacle.y + obstacle.height &&
                        motorcycle.y + motorcycle.height > obstacle.y
                    ) {
                        createBlood(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                        isExploding = true; // Use same flag to stop game and animate particles
                        obstacles.splice(i, 1);
                    }
                }
            }
        }
    }
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function restart() {
    motorcycle.x = 100;
    motorcycle.y = canvas.height - 100; // Will be fixed by ground detection
    motorcycle.dx = 0;
    motorcycle.dy = 0;
    motorcycle.isJumping = false;
    motorcycle.isDucking = false;
    motorcycle.level = 0;
    obstacles = [];
    particles = [];
    score = 0;
    gameOver = false;
    isExploding = false;
    scrollOffset = 0;
    restartButton.style.display = 'none';
    update();
}

function update() {
    if (gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 60, canvas.height / 2 + 40);
        restartButton.style.display = 'block';
        return;
    }

    clearCanvas();
    drawBackground();
    drawMotorcycle();
    drawObstacles();
    drawParticles();
    drawScore();

    if (isExploding) {
        updateParticles();
        if (particles.length === 0) {
            gameOver = true;
        }
        requestAnimationFrame(update);
        return;
    }

    moveMotorcycle();
    moveObstacles();
    detectCollision();
    
    // Static background, no scroll update
    // scrollOffset += 5;
    score++;

    requestAnimationFrame(update);
}

function keyDown(e) {
    if ((e.key === 'ArrowUp' || e.key === ' ') && !motorcycle.isJumping) {
        motorcycle.dy = motorcycle.jumpPower;
        motorcycle.isJumping = true;
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
        motorcycle.dx = motorcycle.speed;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        motorcycle.dx = -motorcycle.speed;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        motorcycle.isDucking = true;
    }
}

function keyUp(e) {
    if (
        e.key === 'ArrowRight' || 
        e.key === 'd' || 
        e.key === 'ArrowLeft' || 
        e.key === 'a'
    ) {
        motorcycle.dx = 0;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        motorcycle.isDucking = false;
    }
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

restartButton.addEventListener('click', restart);

setInterval(createObstacle, 1500);

update();
