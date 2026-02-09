const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

// Game configuration per level
const LEVEL_CONFIG = {
    1: {
        name: "The Escape",
        description: "Escape the city with the documents!",
        endScore: 2000,
        obstacleInterval: 1500,
        obstacleTypes: ['bird', 'bomb', 'coin'],
        skyColors: ['#FF4500', '#FF6347', '#FFD700'],
        speedMultiplier: 1.0
    },
    2: {
        name: "Highway Chase",
        description: "The mafia is onto you! Dodge their cars and bullets!",
        endScore: 4000,
        obstacleInterval: 1200,
        obstacleTypes: ['bird', 'bomb', 'coin', 'mafiaCar', 'bullet'],
        skyColors: ['#1a1a2e', '#16213e', '#0f3460'],
        speedMultiplier: 1.3
    },
    3: {
        name: "Final Showdown",
        description: "The mafia boss sent everything! Survive the gauntlet!",
        endScore: 6000,
        obstacleInterval: 900,
        obstacleTypes: ['bird', 'bomb', 'coin', 'mafiaCar', 'bullet', 'spikeStrip', 'oilSlick', 'helicopter'],
        skyColors: ['#0d0d0d', '#1a0000', '#330000'],
        speedMultiplier: 1.6
    }
};

const motorcycle = {
    x: 100,
    y: canvas.height - 100,
    width: 80,
    height: 40,
    speed: 5,
    dx: 0,
    dy: 0,
    gravity: 0.5,
    jumpPower: -12,
    isJumping: false,
    isDucking: false,
    upgradeLevel: 0,
    health: 3,
    maxHealth: 3,
    isInvincible: false,
    invincibleTimer: 0,
    hasShield: false,
    shieldTimer: 0,
    isSlowed: false,
    slowTimer: 0
};

let obstacles = [];
let particles = [];
let powerUps = [];
let score = 0;
let gameOver = false;
let isExploding = false;
let roadHeight = 100;
let scrollOffset = 0;
let wingFrame = 0;
let comboMultiplier = 1;
let comboTimer = 0;
let helicopterX = -200;
let helicopterActive = false;

// Level system
let currentLevel = 1;
let levelComplete = false;
let levelEndTriggered = false;
let policeCarX = 900;
let documentsGiven = false;
let victoryTimer = 0;
let obstacleSpawner = null;
let powerUpSpawner = null;

// Mafia car chasing from behind
let mafiaChaseCarX = -150;
let mafiaChaseActive = false;
let mafiaChaseTimer = 0;

function getLevelConfig() {
    return LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[3];
}

function getRoadY(x) {
    const base = canvas.height - roadHeight;
    const offset = scrollOffset + x;
    return base + Math.sin(offset * 0.003) * 60 + Math.sin(offset * 0.01) * 20;
}

function drawHealthBar() {
    const barX = 10;
    const barY = 70;
    const barWidth = 150;
    const barHeight = 20;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health fill
    const healthPercent = motorcycle.health / motorcycle.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * healthPercent, barHeight - 4);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Hearts
    for (let i = 0; i < motorcycle.maxHealth; i++) {
        const heartX = barX + 5 + i * 50;
        ctx.fillStyle = i < motorcycle.health ? '#ff0000' : '#333';
        ctx.font = '16px Arial';
        ctx.fillText('❤️', heartX, barY + 16);
    }
    
    // Shield indicator
    if (motorcycle.hasShield) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('🛡️ SHIELD', barX + barWidth + 10, barY + 16);
    }
}

function drawHUD() {
    // Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 105);
    
    // Level indicator
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Level ${currentLevel}: ${getLevelConfig().name}`, canvas.width - 200, 85);
    
    // Progress to next level
    const config = getLevelConfig();
    const progress = Math.min(score / config.endScore, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width - 200, 90, 180, 10);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(canvas.width - 200, 90, 180 * progress, 10);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(canvas.width - 200, 90, 180, 10);
    
    // Combo multiplier
    if (comboMultiplier > 1) {
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`COMBO x${comboMultiplier}!`, canvas.width / 2 - 50, 105);
    }
}

function drawMotorcycle() {
    ctx.save();
    
    // Invincibility flash effect
    if (motorcycle.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Shield glow
    if (motorcycle.hasShield) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
    }
    
    // Slow effect (darker)
    if (motorcycle.isSlowed) {
        ctx.filter = 'brightness(0.7)';
    }

    const x = motorcycle.x;
    const y = motorcycle.y;

    // --- Wheels ---
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 15, y + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 15, y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 65, y + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 65, y + 32, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- Frame / Body ---
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

    // Arms
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

    // Upgrades
    if (motorcycle.upgradeLevel >= 1) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 15, y + 32, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 65, y + 32, 12, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (motorcycle.upgradeLevel >= 2) {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 15);
        ctx.lineTo(x + 5, y + 10);
        ctx.lineTo(x + 15, y + 12);
        ctx.closePath();
        ctx.fill();
    }
    if (motorcycle.upgradeLevel >= 3) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x + 52, y + 2);
        ctx.lineTo(x + 58, y - 8);
        ctx.lineTo(x + 64, y - 6);
        ctx.lineTo(x + 62, y + 5);
        ctx.closePath();
        ctx.fill();
    }

    // Shield bubble
    if (motorcycle.hasShield) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + 40, y + 10, 50, 35, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawBackground() {
    const config = getLevelConfig();
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, config.skyColors[0]);
    gradient.addColorStop(0.5, config.skyColors[1]);
    gradient.addColorStop(1, config.skyColors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // City silhouette in background (for levels 2+)
    if (currentLevel >= 2) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < 10; i++) {
            const buildingX = (i * 100 - (scrollOffset * 0.2) % 100);
            const buildingH = 100 + Math.sin(i * 2) * 50;
            ctx.fillRect(buildingX, canvas.height - roadHeight - buildingH - 50, 60, buildingH);
            // Windows
            ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
            for (let w = 0; w < 3; w++) {
                for (let h = 0; h < 5; h++) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(buildingX + 10 + w * 15, canvas.height - roadHeight - buildingH - 40 + h * 20, 8, 12);
                    }
                }
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        }
    }

    // Road (Curvy)
    ctx.fillStyle = '#261405';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= canvas.width; i += 10) {
        ctx.lineTo(i, getRoadY(i));
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Ceiling
    ctx.fillStyle = '#1a0e04';
    ctx.fillRect(0, 0, canvas.width, roadHeight);

    // Tunnel stripes
    ctx.strokeStyle = '#3d230e';
    ctx.lineWidth = 5;
    for (let i = 0; i < canvas.width; i += 40) {
        const rx = (i - (scrollOffset % 40) + 40) % canvas.width;
        const y = getRoadY(rx);
        ctx.beginPath();
        ctx.moveTo(rx, y);
        ctx.lineTo(rx, canvas.height);
        ctx.stroke();
        ctx.fillRect(rx, 0, 20, roadHeight);
    }

    // Story text background
    ctx.fillStyle = '#261405';
    ctx.fillRect(0, 10, canvas.width, 55);

    // Story text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(getLevelConfig().description, canvas.width / 2, 30);
    ctx.font = '12px Arial';
    if (currentLevel === 1) {
        ctx.fillText('Dodge obstacles! Collect coins! Deliver the documents!', canvas.width / 2, 50);
    } else if (currentLevel === 2) {
        ctx.fillText('Watch out for mafia cars and gunfire! Duck to avoid bullets!', canvas.width / 2, 50);
    } else {
        ctx.fillText('The helicopter is dropping bombs! Spike strips ahead! SURVIVE!', canvas.width / 2, 50);
    }
    ctx.textAlign = 'left';
}

function drawMafiaCar(x, y, facingRight = false) {
    ctx.save();
    if (!facingRight) {
        ctx.translate(x + 60, y);
        ctx.scale(-1, 1);
        ctx.translate(-60, 0);
        x = 0;
    }
    
    // Car body - black sedan
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x, y + 20);
    ctx.lineTo(x + 15, y + 8);
    ctx.lineTo(x + 35, y + 5);
    ctx.lineTo(x + 85, y + 5);
    ctx.lineTo(x + 105, y + 15);
    ctx.lineTo(x + 120, y + 20);
    ctx.lineTo(x + 120, y + 30);
    ctx.lineTo(x, y + 30);
    ctx.closePath();
    ctx.fill();
    
    // Red accent stripe (mafia colors)
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(x + 10, y + 22, 100, 3);
    
    // Windows (tinted)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 10);
    ctx.lineTo(x + 35, y + 8);
    ctx.lineTo(x + 50, y + 8);
    ctx.lineTo(x + 50, y + 18);
    ctx.lineTo(x + 20, y + 18);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 55, y + 8);
    ctx.lineTo(x + 80, y + 8);
    ctx.lineTo(x + 95, y + 15);
    ctx.lineTo(x + 95, y + 18);
    ctx.lineTo(x + 55, y + 18);
    ctx.closePath();
    ctx.fill();
    
    // Wheels
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 25, y + 35, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 95, y + 35, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(x + 25, y + 35, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 95, y + 35, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Headlights (menacing)
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + 115, y + 18, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mafia guy silhouette in window
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 70, y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawBullet(x, y) {
    // Bullet trail
    ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
    ctx.fillRect(x + 10, y + 2, 20, 2);
    
    // Bullet
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 3, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 3, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawSpikeStrip(x, y) {
    // Base
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y + 8, 60, 8);
    
    // Spikes
    ctx.fillStyle = '#888';
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 3 + i * 6, y + 8);
        ctx.lineTo(x + 6 + i * 6, y);
        ctx.lineTo(x + 9 + i * 6, y + 8);
        ctx.closePath();
        ctx.fill();
    }
}

function drawOilSlick(x, y) {
    ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 5, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rainbow sheen
    const gradient = ctx.createLinearGradient(x, y, x + 60, y + 10);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
    gradient.addColorStop(0.3, 'rgba(0, 255, 0, 0.2)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 5, 30, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawHelicopter(x, y) {
    // Body
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + 40, y + 25, 35, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x + 60, y + 22, 15, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x + 62, y + 20, 10, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 20);
    ctx.lineTo(x - 30, y + 15);
    ctx.lineTo(x - 30, y + 25);
    ctx.lineTo(x + 5, y + 30);
    ctx.closePath();
    ctx.fill();
    
    // Tail rotor
    ctx.fillStyle = '#666';
    const tailRotor = Math.sin(Date.now() * 0.05) * 8;
    ctx.fillRect(x - 35, y + 12 + tailRotor, 8, 2);
    ctx.fillRect(x - 35, y + 22 - tailRotor, 8, 2);
    
    // Main rotor
    ctx.fillStyle = '#444';
    const rotorAngle = Date.now() * 0.02;
    ctx.save();
    ctx.translate(x + 40, y + 5);
    ctx.rotate(rotorAngle);
    ctx.fillRect(-50, -3, 100, 6);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-50, -3, 100, 6);
    ctx.restore();
    
    // Rotor hub
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(x + 40, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Skids
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 40);
    ctx.lineTo(x + 60, y + 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 35);
    ctx.lineTo(x + 25, y + 40);
    ctx.moveTo(x + 55, y + 35);
    ctx.lineTo(x + 55, y + 40);
    ctx.stroke();
    
    // Mafia emblem
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('M', x + 35, y + 28);
}

function drawPowerUp(powerUp) {
    const x = powerUp.x;
    const y = powerUp.y;
    const bob = Math.sin(Date.now() * 0.005 + powerUp.x) * 5;
    
    if (powerUp.type === 'health') {
        // Health pack
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 5, y + bob, 30, 25);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 17, y + bob + 5, 6, 15);
        ctx.fillRect(x + 12, y + bob + 10, 16, 5);
    } else if (powerUp.type === 'shield') {
        // Shield power-up
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(x + 20, y + bob);
        ctx.lineTo(x + 35, y + bob + 10);
        ctx.lineTo(x + 30, y + bob + 25);
        ctx.lineTo(x + 20, y + bob + 30);
        ctx.lineTo(x + 10, y + bob + 25);
        ctx.lineTo(x + 5, y + bob + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Glow effect
    ctx.shadowColor = powerUp.type === 'health' ? '#ff0000' : '#00ffff';
    ctx.shadowBlur = 10;
}

function drawObstacles() {
    wingFrame += 0.1;
    
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'bird') {
            const bx = obstacle.x;
            const by = obstacle.y;
            const wingFlap = Math.sin(wingFrame * 5 + obstacle.x) * 12;

            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.ellipse(bx + 20, by + 8, 14, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.ellipse(bx + 20, by + 10, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.moveTo(bx + 12, by + 6);
            ctx.quadraticCurveTo(bx - 2, by - 8 + wingFlap, bx - 5, by - 5 + wingFlap);
            ctx.quadraticCurveTo(bx + 5, by + 2, bx + 14, by + 8);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx + 28, by + 6);
            ctx.quadraticCurveTo(bx + 42, by - 8 + wingFlap, bx + 45, by - 5 + wingFlap);
            ctx.quadraticCurveTo(bx + 35, by + 2, bx + 26, by + 8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(bx + 5, by + 7);
            ctx.lineTo(bx - 6, by + 3);
            ctx.lineTo(bx - 4, by + 9);
            ctx.lineTo(bx - 7, by + 12);
            ctx.lineTo(bx + 6, by + 10);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.arc(bx + 34, by + 5, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(bx + 36, by + 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(bx + 36.5, by + 4, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e8a317';
            ctx.beginPath();
            ctx.moveTo(bx + 39, by + 4);
            ctx.lineTo(bx + 44, by + 6);
            ctx.lineTo(bx + 39, by + 7);
            ctx.closePath();
            ctx.fill();
        } else if (obstacle.type === 'bomb') {
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width / 2 - 3, obstacle.y + obstacle.height / 2 - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'orange';
            ctx.fillRect(obstacle.x + obstacle.width / 2 - 1, obstacle.y - 4, 2, 5);
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
            ctx.fillStyle = '#b8860b';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('$', obstacle.x + obstacle.width / 2 - 4, obstacle.y + obstacle.height / 2 + 4);
        } else if (obstacle.type === 'mafiaCar') {
            drawMafiaCar(obstacle.x, obstacle.y - 10, false);
        } else if (obstacle.type === 'bullet') {
            drawBullet(obstacle.x, obstacle.y);
        } else if (obstacle.type === 'spikeStrip') {
            drawSpikeStrip(obstacle.x, obstacle.y);
        } else if (obstacle.type === 'oilSlick') {
            drawOilSlick(obstacle.x, obstacle.y);
        }
    });
    
    // Draw chase car
    if (mafiaChaseActive && mafiaChaseCarX > -150) {
        const chaseY = getRoadY(mafiaChaseCarX + 60) - 45;
        drawMafiaCar(mafiaChaseCarX, chaseY, true);
    }
    
    // Draw helicopter
    if (helicopterActive) {
        drawHelicopter(helicopterX, 120);
    }
    
    // Draw power-ups
    powerUps.forEach(p => drawPowerUp(p));
}

function moveMotorcycle() {
    const speedMod = motorcycle.isSlowed ? 0.5 : 1;
    motorcycle.x += motorcycle.dx * speedMod;
    motorcycle.y += motorcycle.dy;
    motorcycle.dy += motorcycle.gravity;

    if (motorcycle.x < 0) motorcycle.x = 0;
    if (motorcycle.x + motorcycle.width > canvas.width) {
        motorcycle.x = canvas.width - motorcycle.width;
    }

    const groundY = getRoadY(motorcycle.x + motorcycle.width / 2);
    if (motorcycle.y + motorcycle.height > groundY) {
        motorcycle.y = groundY - motorcycle.height;
        motorcycle.dy = 0;
        motorcycle.isJumping = false;
    }

    // Update timers
    if (motorcycle.isInvincible) {
        motorcycle.invincibleTimer--;
        if (motorcycle.invincibleTimer <= 0) {
            motorcycle.isInvincible = false;
        }
    }
    if (motorcycle.hasShield) {
        motorcycle.shieldTimer--;
        if (motorcycle.shieldTimer <= 0) {
            motorcycle.hasShield = false;
        }
    }
    if (motorcycle.isSlowed) {
        motorcycle.slowTimer--;
        if (motorcycle.slowTimer <= 0) {
            motorcycle.isSlowed = false;
        }
    }
    
    // Combo timer
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            comboMultiplier = 1;
        }
    }
}

function moveObstacles() {
    const config = getLevelConfig();
    
    obstacles.forEach(obstacle => {
        const baseSpeed = obstacle.speed || 3;
        obstacle.x -= baseSpeed * config.speedMultiplier;

        if (obstacle.type === 'bird') {
            obstacle.y += Math.sin(obstacle.x * 0.05) * 0.5;
        } else if (obstacle.type === 'bomb') {
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - obstacle.height;
        } else if (obstacle.type === 'coin') {
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - 50;
        } else if (obstacle.type === 'mafiaCar') {
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - 30;
        } else if (obstacle.type === 'bullet') {
            // Bullets move faster
            obstacle.x -= 5;
        } else if (obstacle.type === 'spikeStrip' || obstacle.type === 'oilSlick') {
            let groundY = getRoadY(obstacle.x + obstacle.width / 2);
            obstacle.y = groundY - obstacle.height;
        }
    });

    // Move power-ups
    powerUps.forEach(p => {
        p.x -= 2 * config.speedMultiplier;
        let groundY = getRoadY(p.x + 20);
        p.y = groundY - 60;
    });

    // Remove off-screen obstacles and power-ups
    obstacles = obstacles.filter(o => o.x + o.width > -50);
    powerUps = powerUps.filter(p => p.x + 40 > -50);
    
    // Chase car logic
    if (mafiaChaseActive) {
        mafiaChaseTimer++;
        if (mafiaChaseCarX < motorcycle.x - 100) {
            mafiaChaseCarX += 2;
        }
        // Fire bullets periodically
        if (mafiaChaseTimer % 120 === 0) {
            createBulletFromChaseCar();
        }
        if (mafiaChaseTimer > 600) {
            mafiaChaseActive = false;
            mafiaChaseCarX = -150;
            mafiaChaseTimer = 0;
        }
    }
    
    // Helicopter logic
    if (helicopterActive) {
        helicopterX += 1;
        if (Math.random() < 0.02) {
            dropBombFromHelicopter();
        }
        if (helicopterX > canvas.width + 100) {
            helicopterActive = false;
            helicopterX = -200;
        }
    }
}

function createBulletFromChaseCar() {
    const groundY = getRoadY(mafiaChaseCarX + 120);
    obstacles.push({
        x: mafiaChaseCarX + 120,
        y: groundY - 35,
        width: 15,
        height: 6,
        type: 'bullet',
        speed: 8
    });
}

function dropBombFromHelicopter() {
    obstacles.push({
        x: helicopterX + 40,
        y: 160,
        width: 20,
        height: 20,
        type: 'bomb',
        speed: 0,
        falling: true,
        dy: 2
    });
}

function createObstacle() {
    if (levelEndTriggered) return;
    
    const config = getLevelConfig();
    const types = config.obstacleTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    
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
        height = 30;
        y = groundY - 60;
        speed = 3 + Math.random() * 2;
    } else if (type === 'bird') {
        width = 45;
        height = 20;
        y = groundY - 60 - Math.random() * 30;
        speed = 4 + Math.random() * 3;
    } else if (type === 'mafiaCar') {
        width = 120;
        height = 45;
        y = groundY - 45;
        speed = 4 + Math.random() * 2;
    } else if (type === 'bullet') {
        width = 15;
        height = 6;
        y = groundY - 30 - Math.random() * 40;
        speed = 10 + Math.random() * 5;
    } else if (type === 'spikeStrip') {
        width = 60;
        height = 16;
        y = groundY - 16;
        speed = 3;
    } else if (type === 'oilSlick') {
        width = 70;
        height = 10;
        y = groundY - 10;
        speed = 3;
    } else if (type === 'helicopter') {
        // Start helicopter instead of spawning obstacle
        if (!helicopterActive) {
            helicopterActive = true;
            helicopterX = -200;
        }
        return;
    }

    obstacles.push({
        x: spawnX,
        y: y,
        width: width,
        height: height,
        type: type,
        speed: speed
    });
    
    // Randomly activate chase car in level 2+
    if (currentLevel >= 2 && !mafiaChaseActive && Math.random() < 0.05) {
        mafiaChaseActive = true;
        mafiaChaseCarX = -150;
        mafiaChaseTimer = 0;
    }
}

function createPowerUp() {
    if (levelEndTriggered) return;
    if (Math.random() > 0.3) return; // 30% chance
    
    const types = ['health', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    const spawnX = canvas.width + 20;
    let groundY = getRoadY(spawnX);
    
    powerUps.push({
        x: spawnX,
        y: groundY - 60,
        type: type
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

function createSparks(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            life: 0.5,
            color: '#ffd700'
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

function takeDamage() {
    if (motorcycle.isInvincible || motorcycle.hasShield) {
        if (motorcycle.hasShield) {
            motorcycle.hasShield = false;
            createSparks(motorcycle.x + 40, motorcycle.y + 20);
        }
        return;
    }
    
    motorcycle.health--;
    motorcycle.isInvincible = true;
    motorcycle.invincibleTimer = 120; // 2 seconds
    
    if (motorcycle.health <= 0) {
        createExplosion(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
        isExploding = true;
    }
}

function detectCollision() {
    // Power-up collision
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        if (motorcycle.x < p.x + 40 && motorcycle.x + motorcycle.width > p.x &&
            motorcycle.y < p.y + 30 && motorcycle.y + motorcycle.height > p.y) {
            
            if (p.type === 'health') {
                motorcycle.health = Math.min(motorcycle.health + 1, motorcycle.maxHealth);
            } else if (p.type === 'shield') {
                motorcycle.hasShield = true;
                motorcycle.shieldTimer = 300; // 5 seconds
            }
            powerUps.splice(i, 1);
            createSparks(p.x + 20, p.y + 15);
        }
    }
    
    // Obstacle collision
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // Update falling bombs
        if (obstacle.falling) {
            obstacle.y += obstacle.dy;
            obstacle.dy += 0.3;
        }
        
        const motorcycleBottom = motorcycle.y + motorcycle.height;
        const obstacleTop = obstacle.y;
        const motorcycleLeft = motorcycle.x;
        const motorcycleRight = motorcycle.x + motorcycle.width;
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;

        if (motorcycleRight > obstacleLeft && motorcycleLeft < obstacleRight) {
            if (obstacle.type === 'coin') {
                if (motorcycle.y < obstacle.y + obstacle.height &&
                    motorcycle.y + motorcycle.height > obstacle.y) {
                    obstacles.splice(i, 1);
                    const points = 100 * comboMultiplier;
                    score += points;
                    motorcycle.upgradeLevel = Math.min(motorcycle.upgradeLevel + 1, 3);
                    comboMultiplier = Math.min(comboMultiplier + 1, 5);
                    comboTimer = 180; // 3 seconds
                    createSparks(obstacle.x + 15, obstacle.y + 15);
                }
            } else if (obstacle.type === 'oilSlick') {
                if (motorcycle.y < obstacle.y + obstacle.height &&
                    motorcycle.y + motorcycle.height > obstacle.y) {
                    motorcycle.isSlowed = true;
                    motorcycle.slowTimer = 120;
                    obstacles.splice(i, 1);
                }
            } else if (motorcycleBottom > obstacleTop &&
                       motorcycle.y < obstacle.y + obstacle.height) {
                
                if (obstacle.type === 'bomb') {
                    createExplosion(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                    obstacles.splice(i, 1);
                    takeDamage();
                } else if (obstacle.type === 'bird') {
                    if (!motorcycle.isDucking) {
                        createBlood(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                        obstacles.splice(i, 1);
                        takeDamage();
                    }
                } else if (obstacle.type === 'mafiaCar') {
                    createExplosion(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                    obstacles.splice(i, 1);
                    takeDamage();
                    takeDamage(); // Mafia cars deal 2 damage!
                } else if (obstacle.type === 'bullet') {
                    if (!motorcycle.isDucking) {
                        createSparks(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                        obstacles.splice(i, 1);
                        takeDamage();
                    }
                } else if (obstacle.type === 'spikeStrip') {
                    createSparks(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
                    obstacles.splice(i, 1);
                    takeDamage();
                }
            }
        }
    }
    
    // Chase car collision
    if (mafiaChaseActive && mafiaChaseCarX + 120 > motorcycle.x) {
        createExplosion(motorcycle.x + motorcycle.width/2, motorcycle.y + motorcycle.height/2);
        takeDamage();
        takeDamage();
        mafiaChaseActive = false;
        mafiaChaseCarX = -150;
    }
}

function drawPoliceCar(x) {
    const y = getRoadY(x + 60) - 45;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 25);
    ctx.lineTo(x + 20, y + 10);
    ctx.lineTo(x + 45, y + 5);
    ctx.lineTo(x + 90, y + 5);
    ctx.lineTo(x + 105, y + 15);
    ctx.lineTo(x + 115, y + 25);
    ctx.lineTo(x + 115, y + 35);
    ctx.lineTo(x + 5, y + 35);
    ctx.lineTo(x + 5, y + 25);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.fillRect(x + 15, y + 25, 95, 5);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('POLICE', x + 40, y + 23);
    
    ctx.fillStyle = '#4a90d9';
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 12);
    ctx.lineTo(x + 40, y + 8);
    ctx.lineTo(x + 55, y + 8);
    ctx.lineTo(x + 55, y + 20);
    ctx.lineTo(x + 25, y + 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 60, y + 8);
    ctx.lineTo(x + 85, y + 8);
    ctx.lineTo(x + 95, y + 18);
    ctx.lineTo(x + 95, y + 20);
    ctx.lineTo(x + 60, y + 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 25, y + 40, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 95, y + 40, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(x + 25, y + 40, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 95, y + 40, 4, 0, Math.PI * 2);
    ctx.fill();
    
    const lightFlash = Math.sin(Date.now() * 0.01) > 0;
    ctx.fillStyle = lightFlash ? '#ff0000' : '#cc0000';
    ctx.beginPath();
    ctx.arc(x + 50, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightFlash ? '#0000cc' : '#0000ff';
    ctx.beginPath();
    ctx.arc(x + 65, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 45, y + 2, 30, 3);
}

function drawVictoryMessage() {
    ctx.fillStyle = '#261405';
    ctx.fillRect(0, 10, canvas.width, 55);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    
    if (currentLevel < 3) {
        ctx.fillText(`🎉 LEVEL ${currentLevel} COMPLETE! 🎉`, canvas.width / 2, 32);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('Documents safely passed! Get ready for the next challenge!', canvas.width / 2, 52);
    } else {
        ctx.fillText('🏆 MISSION ACCOMPLISHED! 🏆', canvas.width / 2, 32);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText('The mafia has been exposed! Justice prevails!', canvas.width / 2, 52);
    }
    ctx.textAlign = 'left';
}

function drawDocumentTransfer() {
    const docX = motorcycle.x + motorcycle.width + 5;
    const docY = motorcycle.y - 10;
    
    ctx.fillStyle = '#f5deb3';
    ctx.fillRect(docX, docY, 25, 18);
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1;
    ctx.strokeRect(docX, docY, 25, 18);
    
    ctx.strokeStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(docX + 3, docY + 5);
    ctx.lineTo(docX + 22, docY + 5);
    ctx.moveTo(docX + 3, docY + 9);
    ctx.lineTo(docX + 22, docY + 9);
    ctx.moveTo(docX + 3, docY + 13);
    ctx.lineTo(docX + 15, docY + 13);
    ctx.stroke();
    
    ctx.fillStyle = 'red';
    ctx.font = 'bold 5px Arial';
    ctx.fillText('SECRET', docX + 3, docY + 17);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startLevel(level) {
    currentLevel = level;
    motorcycle.x = 100;
    motorcycle.y = canvas.height - 100;
    motorcycle.dx = 0;
    motorcycle.dy = 0;
    motorcycle.isJumping = false;
    motorcycle.isDucking = false;
    motorcycle.isInvincible = false;
    motorcycle.hasShield = false;
    motorcycle.isSlowed = false;
    
    obstacles = [];
    particles = [];
    powerUps = [];
    
    levelComplete = false;
    levelEndTriggered = false;
    policeCarX = 900;
    documentsGiven = false;
    victoryTimer = 0;
    mafiaChaseActive = false;
    mafiaChaseCarX = -150;
    helicopterActive = false;
    helicopterX = -200;
    comboMultiplier = 1;
    comboTimer = 0;
    
    // Clear existing spawners
    if (obstacleSpawner) clearInterval(obstacleSpawner);
    if (powerUpSpawner) clearInterval(powerUpSpawner);
    
    // Set up new spawners
    const config = getLevelConfig();
    obstacleSpawner = setInterval(createObstacle, config.obstacleInterval);
    powerUpSpawner = setInterval(createPowerUp, 5000);
}

function restart() {
    motorcycle.health = motorcycle.maxHealth;
    motorcycle.upgradeLevel = 0;
    score = 0;
    gameOver = false;
    isExploding = false;
    scrollOffset = 0;
    restartButton.style.display = 'none';
    restartButton.textContent = 'Play Again';
    
    startLevel(1);
    update();
}

function nextLevel() {
    if (currentLevel < 3) {
        currentLevel++;
        startLevel(currentLevel);
    } else {
        // Game complete! Restart from beginning
        restart();
    }
}

function update() {
    if (gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 60, canvas.height / 2 + 40);
        ctx.fillText(`Reached: Level ${currentLevel}`, canvas.width / 2 - 60, canvas.height / 2 + 70);
        restartButton.style.display = 'block';
        return;
    }

    const config = getLevelConfig();
    
    // Check if level should end
    if (score >= config.endScore && !levelEndTriggered) {
        levelEndTriggered = true;
        obstacles = [];
        mafiaChaseActive = false;
        helicopterActive = false;
    }

    clearCanvas();
    drawBackground();
    
    if (levelEndTriggered) {
        if (policeCarX > 550) {
            policeCarX -= 3;
        }
        drawPoliceCar(policeCarX);
        
        if (!documentsGiven && motorcycle.x < policeCarX - 50) {
            motorcycle.x += 2;
        } else if (!documentsGiven && motorcycle.x >= policeCarX - 50) {
            drawDocumentTransfer();
            victoryTimer++;
            
            if (victoryTimer > 120) {
                documentsGiven = true;
                levelComplete = true;
            }
        }
        
        if (levelComplete) {
            drawVictoryMessage();
        }
    }
    
    drawMotorcycle();
    drawObstacles();
    drawParticles();
    
    if (!levelComplete) {
        drawHealthBar();
        drawHUD();
    }

    if (isExploding) {
        updateParticles();
        if (particles.length === 0) {
            gameOver = true;
        }
        requestAnimationFrame(update);
        return;
    }

    if (!levelEndTriggered) {
        moveMotorcycle();
        moveObstacles();
        detectCollision();
        score++;
    } else {
        motorcycle.y += motorcycle.dy;
        motorcycle.dy += motorcycle.gravity;
        const groundY = getRoadY(motorcycle.x + motorcycle.width / 2);
        if (motorcycle.y + motorcycle.height > groundY) {
            motorcycle.y = groundY - motorcycle.height;
            motorcycle.dy = 0;
        }
    }
    
    if (levelComplete && victoryTimer > 180) {
        restartButton.style.display = 'block';
        if (currentLevel < 3) {
            restartButton.textContent = `Play Level ${currentLevel + 1}`;
        } else {
            restartButton.textContent = 'Play Again (You Won!)';
        }
    }

    requestAnimationFrame(update);
}

function keyDown(e) {
    if ((e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') && !motorcycle.isJumping) {
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
    if (e.key === 'ArrowRight' || e.key === 'd' || 
        e.key === 'ArrowLeft' || e.key === 'a') {
        motorcycle.dx = 0;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
        motorcycle.isDucking = false;
    }
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

restartButton.addEventListener('click', function() {
    if (levelComplete && currentLevel < 3) {
        nextLevel();
        restartButton.style.display = 'none';
        update();
    } else {
        restart();
    }
});

// Initialize game
startLevel(1);
update();
