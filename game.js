// Game canvas and context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const livesElement = document.getElementById('livesValue');
const levelElement = document.getElementById('levelValue');

// Game constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const PROJECTILE_WIDTH = 3;
const PROJECTILE_HEIGHT = 15;
const ALIEN_WIDTH = 40;
const ALIEN_HEIGHT = 30;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 10;
const ALIEN_SPACING = 15;
const HITS_PER_LIFE = 5;

// Power-up constants
const POWERUP_WIDTH = 20;
const POWERUP_HEIGHT = 20;
const POWERUP_SPEED = 3;
const SHIELD_DURATION = 5000; // 5 seconds
const SPREAD_SHOT_DURATION = 8000; // 8 seconds

// Game state
let score = 0;
let lives = 5;
let hits = 0;
let level = 1;
let gameLoop;
let gameSpeed = 1000/60; // 60 FPS
let powerups = [];
let hasShield = false;
let hasSpreadShot = false;
let shieldTimer = null;
let spreadShotTimer = null;
let isPaused = false;

// Player state
const player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - PLAYER_HEIGHT - 10,
    speed: 5,
    projectiles: []
};

// Aliens state
let aliens = [];
let alienDirection = 1;
let alienStepDown = 30;
let alienProjectiles = [];

// Game controls
let leftPressed = false;
let rightPressed = false;
let spacePressed = false;
let lastShot = 0;
const SHOOT_DELAY = 250; // Minimum time between shots in milliseconds

// Keyboard event handlers
function handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = true;
    if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = true;
    if (e.key === ' ') spacePressed = true;
}

function handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = false;
    if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = false;
    if (e.key === ' ') spacePressed = false;
}

// Create aliens function
function createAliens() {
    aliens = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
        for (let col = 0; col < ALIEN_COLS; col++) {
            const type = Math.random() < 0.1 ? Math.floor(Math.random() * 3) + 1 : 0;
            aliens.push({
                x: col * (ALIEN_WIDTH + ALIEN_SPACING),
                y: row * (ALIEN_HEIGHT + ALIEN_SPACING) + 50,
                alive: true,
                type: type
            });
        }
    }
}

// Show level message function
function showLevelMessage() {
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText(`Level ${level}`, canvas.width/2 - 50, canvas.height/2);
}

// Initialize game
function init() {
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('pauseButton').addEventListener('click', togglePause);

    // Initialize game state
    createAliens();
    showLevelMessage();

    // Start game loop
    gameLoop = setInterval(update, gameSpeed);
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseButton').textContent = isPaused ? 'Resume' : 'Pause';
}

// Update game state
function update() {
    if (isPaused) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update power-ups
    powerups.forEach((powerup, index) => {
        // Calculate direction to player
        const dx = player.x + PLAYER_WIDTH/2 - (powerup.x + POWERUP_WIDTH/2);
        const dy = player.y + PLAYER_HEIGHT/2 - (powerup.y + POWERUP_HEIGHT/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and apply movement
        powerup.x += (dx / distance) * POWERUP_SPEED * 2;
        powerup.y += (dy / distance) * POWERUP_SPEED * 2;
        
        // Check if player collected the power-up
        if (collision({
            x: powerup.x,
            y: powerup.y,
            width: POWERUP_WIDTH,
            height: POWERUP_HEIGHT
        }, {
            x: player.x,
            y: player.y,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT
        })) {
            // Apply power-up effect
            switch(powerup.type) {
                case 1: // Extra life
                    lives++;
                    livesElement.textContent = lives;
                    break;
                case 2: // Shield
                    if (shieldTimer) clearTimeout(shieldTimer);
                    hasShield = true;
                    shieldTimer = setTimeout(() => {
                        hasShield = false;
                    }, SHIELD_DURATION);
                    break;
                case 3: // Spread shot
                    if (spreadShotTimer) clearTimeout(spreadShotTimer);
                    hasSpreadShot = true;
                    spreadShotTimer = setTimeout(() => {
                        hasSpreadShot = false;
                    }, SPREAD_SHOT_DURATION);
                    break;
            }
            powerups.splice(index, 1);
        }
    });

    // Move player
    if (leftPressed && player.x > 0) {
        player.x -= player.speed;
    }
    if (rightPressed && player.x < canvas.width - PLAYER_WIDTH) {
        player.x += player.speed;
    }

    // Player shooting
    if (spacePressed && Date.now() - lastShot > SHOOT_DELAY) {
        if (hasSpreadShot) {
            // Create spread shot pattern
            player.projectiles.push(
                {
                    x: player.x + PLAYER_WIDTH / 2 - PROJECTILE_WIDTH / 2,
                    y: player.y,
                    angle: 0
                },
                {
                    x: player.x + PLAYER_WIDTH / 2 - PROJECTILE_WIDTH / 2,
                    y: player.y,
                    angle: -0.3
                },
                {
                    x: player.x + PLAYER_WIDTH / 2 - PROJECTILE_WIDTH / 2,
                    y: player.y,
                    angle: 0.3
                }
            );
        } else {
            player.projectiles.push({
                x: player.x + PLAYER_WIDTH / 2 - PROJECTILE_WIDTH / 2,
                y: player.y,
                angle: 0
            });
        }
        lastShot = Date.now();
    }

    // Update player projectiles
    player.projectiles.forEach((projectile, index) => {
        projectile.x += Math.sin(projectile.angle) * 7;
        projectile.y -= Math.cos(projectile.angle) * 7;
        if (projectile.y < 0 || projectile.x < 0 || projectile.x > canvas.width) {
            player.projectiles.splice(index, 1);
        }
    });

    // Update alien projectiles
    alienProjectiles.forEach((projectile, index) => {
        projectile.y += 5 + (level * 0.5);
        if (projectile.y > canvas.height) {
            alienProjectiles.splice(index, 1);
        }
    });

    // Alien movement
    let touchedEdge = false;
    aliens.forEach(alien => {
        if (alien.alive) {
            alien.x += (2 + level * 0.5) * alienDirection;
            if (alien.x <= 0 || alien.x >= canvas.width - ALIEN_WIDTH) {
                touchedEdge = true;
            }
        }
    });

    if (touchedEdge) {
        alienDirection *= -1;
        aliens.forEach(alien => {
            if (alien.alive) {
                alien.y += alienStepDown;
            }
        });
    }

    // Random alien shooting
    if (Math.random() < 0.02 + (level * 0.005)) {
        const shootingAliens = aliens.filter(alien => alien.alive);
        if (shootingAliens.length > 0) {
            const shooter = shootingAliens[Math.floor(Math.random() * shootingAliens.length)];
            alienProjectiles.push({
                x: shooter.x + ALIEN_WIDTH / 2,
                y: shooter.y + ALIEN_HEIGHT
            });
        }
    }

    // Check collisions
    checkCollisions();

    // Check if all aliens are defeated
    if (aliens.every(alien => !alien.alive)) {
        nextLevel();
    }
    
    // Draw everything
    draw();

    // Check game over conditions
    if (checkGameOver()) {
        gameOver();
    }
}

function nextLevel() {
    level++;
    levelElement.textContent = level;
    alienProjectiles = [];
    player.projectiles = [];
    createAliens();
    showLevelMessage();
}

// Collision detection
function checkCollisions() {
    // Player projectiles hitting aliens
    player.projectiles.forEach((projectile, projectileIndex) => {
        aliens.forEach(alien => {
            if (alien.alive && collision(projectile, {
                x: alien.x,
                y: alien.y,
                width: ALIEN_WIDTH,
                height: ALIEN_HEIGHT
            })) {
                alien.alive = false;
                player.projectiles.splice(projectileIndex, 1);
                
                // Add score based on alien type
                score += alien.type === 0 ? 10 : 20;
                scoreElement.textContent = score;
                
                // Create power-up if it was a special alien
                if (alien.type > 0) {
                    powerups.push({
                        x: alien.x + ALIEN_WIDTH/2 - POWERUP_WIDTH/2,
                        y: alien.y + ALIEN_HEIGHT/2 - POWERUP_HEIGHT/2,
                        type: alien.type
                    });
                }
            }
        });
    });

    // Alien projectiles hitting player
    alienProjectiles.forEach((projectile, index) => {
        if (!hasShield && collision(projectile, {
            x: player.x,
            y: player.y,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT
        })) {
            hits++;
            alienProjectiles.splice(index, 1);
            
            if (hits >= HITS_PER_LIFE) {
                hits = 0;
                lives--;
                livesElement.textContent = lives;
                
                // Display strike message
                ctx.fillStyle = '#f00';
                ctx.font = '32px Arial';
                ctx.fillText(`Life Lost! ${lives} remaining`, canvas.width/2 - 100, canvas.height/2);
            } else {
                // Display hit message
                ctx.fillStyle = '#yellow';
                ctx.font = '24px Arial';
                ctx.fillText(`Hit ${hits}/${HITS_PER_LIFE}`, canvas.width/2 - 40, canvas.height/2);
            }
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
}

// Collision helper function
function collision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + PROJECTILE_WIDTH > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + PROJECTILE_HEIGHT > rect2.y;
}

// Check game over conditions
function checkGameOver() {
    // Check if aliens reached bottom
    return aliens.some(alien => alien.alive && alien.y + ALIEN_HEIGHT >= player.y);
}

// Game over handler
function gameOver() {
    clearInterval(gameLoop);
    ctx.fillStyle = '#fff';
    ctx.font = '48px Arial';
    ctx.fillText('GAME OVER!', canvas.width/2 - 120, canvas.height/2);
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width/2 - 70, canvas.height/2 + 40);
    ctx.fillText(`Reached Level: ${level}`, canvas.width/2 - 70, canvas.height/2 + 70);
    ctx.fillText('Play again?', canvas.width/2 - 50, canvas.height/2 + 100);
    
    // Create Yes button
    ctx.fillStyle = '#0f0';
    ctx.fillRect(canvas.width/2 - 100, canvas.height/2 + 120, 80, 40);
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText('Yes', canvas.width/2 - 80, canvas.height/2 + 145);
    
    // Create No button
    ctx.fillStyle = '#f00';
    ctx.fillRect(canvas.width/2 + 20, canvas.height/2 + 120, 80, 40);
    ctx.fillStyle = '#000';
    ctx.fillText('No', canvas.width/2 + 45, canvas.height/2 + 145);
    
    // Add click event listener for buttons
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check Yes button click
        if (x >= canvas.width/2 - 100 && x <= canvas.width/2 - 20 &&
            y >= canvas.height/2 + 120 && y <= canvas.height/2 + 160) {
            // Reset game state
            score = 0;
            lives = 5;
            hits = 0;
            level = 1;
            scoreElement.textContent = score;
            livesElement.textContent = lives;
            levelElement.textContent = level;
            init();
        }
        // Check No button click
        else if (x >= canvas.width/2 + 20 && x <= canvas.width/2 + 100 &&
                 y >= canvas.height/2 + 120 && y <= canvas.height/2 + 160) {
            // Clear the canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '48px Arial';
            ctx.fillText('Thanks for playing!', canvas.width/2 - 180, canvas.height/2);
        }
    });
}

// Draw function to render game elements
function draw() {
    // Draw player
    ctx.fillStyle = hasShield ? '#0ff' : '#fff';
    ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);

    // Draw player projectiles
    ctx.fillStyle = '#0f0';
    player.projectiles.forEach(projectile => {
        ctx.fillRect(projectile.x, projectile.y, PROJECTILE_WIDTH, PROJECTILE_HEIGHT);
    });

    // Draw aliens
    aliens.forEach(alien => {
        if (alien.alive) {
            ctx.fillStyle = alien.type === 0 ? '#fff' : 
                           alien.type === 1 ? '#ff0' : 
                           alien.type === 2 ? '#0ff' : '#f0f';
            ctx.fillRect(alien.x, alien.y, ALIEN_WIDTH, ALIEN_HEIGHT);
        }
    });

    // Draw alien projectiles
    ctx.fillStyle = '#f00';
    alienProjectiles.forEach(projectile => {
        ctx.fillRect(projectile.x, projectile.y, PROJECTILE_WIDTH, PROJECTILE_HEIGHT);
    });

    // Draw power-ups
    powerups.forEach(powerup => {
        ctx.fillStyle = powerup.type === 1 ? '#ff0' : // Extra life
                       powerup.type === 2 ? '#0ff' : // Shield
                       '#f0f';                      // Spread shot
        ctx.fillRect(powerup.x, powerup.y, POWERUP_WIDTH, POWERUP_HEIGHT);
    });
}

// Start the game
init();