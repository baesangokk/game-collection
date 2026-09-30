const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const heightEl = document.getElementById('height');
const levelEl = document.getElementById('level');
const pointsEl = document.getElementById('points');
const attackEl = document.getElementById('attack');
const defenseEl = document.getElementById('defense');
const speedEl = document.getElementById('speed');
const stageEl = document.getElementById('stage');
const upgradeMenu = document.getElementById('upgrade-menu');

// Player
let player = {
    x: 450,
    y: 300,
    baseHeight: 100, // cm
    height: 100, // current height in cm
    displaySize: 20, // visual size on screen
    speed: 3,
    level: 1,
    exp: 0,
    expToLevel: 50,
    points: 0,
    baseAttack: 10,
    baseDefense: 5,
    baseSpeed: 3,
    attackCooldown: 0,
    attackRange: 40,
    invincible: 0
};

// World
const WORLD_WIDTH = 1500;
const WORLD_HEIGHT = 1000;
let camera = { x: 0, y: 0 };
let currentStage = 1;

// Stage requirements (height needed to unlock)
const STAGES = [
    { name: '마을', requiredHeight: 100, monsters: ['slime'], bg: '#2a4a2a' },
    { name: '숲', requiredHeight: 120, monsters: ['slime', 'goblin'], bg: '#1a3a1a' },
    { name: '산', requiredHeight: 150, monsters: ['goblin', 'orc'], bg: '#3a3a2a' },
    { name: '설산', requiredHeight: 180, monsters: ['orc', 'troll'], bg: '#4a4a5a' },
    { name: '화산', requiredHeight: 220, monsters: ['troll', 'dragon'], bg: '#4a2a2a' },
    { name: '하늘', requiredHeight: 280, monsters: ['dragon', 'phoenix'], bg: '#2a2a4a' },
    { name: '우주', requiredHeight: 350, monsters: ['phoenix', 'cosmos'], bg: '#1a1a2a' }
];

// Monsters
let monsters = [];
const MONSTER_TYPES = {
    slime: { name: '슬라임', color: '#00ff00', hp: 20, attack: 3, defense: 0, exp: 10, points: 2, size: 15 },
    goblin: { name: '고블린', color: '#8b4513', hp: 40, attack: 6, defense: 2, exp: 20, points: 4, size: 20 },
    orc: { name: '오크', color: '#556b2f', hp: 70, attack: 10, defense: 4, exp: 40, points: 7, size: 25 },
    troll: { name: '트롤', color: '#4a4a4a', hp: 100, attack: 15, defense: 7, exp: 70, points: 12, size: 30 },
    dragon: { name: '드래곤', color: '#ff4500', hp: 150, attack: 20, defense: 10, exp: 120, points: 20, size: 35 },
    phoenix: { name: '피닉스', color: '#ffd700', hp: 200, attack: 25, defense: 12, exp: 180, points: 30, size: 40 },
    cosmos: { name: '코스모스', color: '#9400d3', hp: 300, attack: 35, defense: 18, exp: 300, points: 50, size: 45 }
};

function spawnMonster() {
    const stage = STAGES[currentStage - 1];
    const typeKey = stage.monsters[Math.floor(Math.random() * stage.monsters.length)];
    const type = MONSTER_TYPES[typeKey];
    monsters.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        ...type,
        maxHp: type.hp,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        aggro: false,
        attackCooldown: 0
    });
}

// Particles
let particles = [];
let damageNumbers = [];

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            life: 30,
            color: color,
            size: 3 + Math.random() * 4
        });
    }
}

function createDamageNumber(x, y, damage, color = '#ff0000') {
    damageNumbers.push({
        x: x,
        y: y,
        damage: damage,
        color: color,
        life: 60
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.size *= 0.95;
        if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y -= 1;
        d.life--;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    damageNumbers.forEach(d => {
        ctx.globalAlpha = d.life / 60;
        ctx.fillStyle = d.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(d.damage, d.x - camera.x, d.y - camera.y);
    });
    ctx.globalAlpha = 1;
}

// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
    if (e.key.toLowerCase() === 'u') toggleUpgradeMenu();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function toggleUpgradeMenu() {
    upgradeMenu.style.display = upgradeMenu.style.display === 'none' ? 'block' : 'none';
}

// Upgrade functions
function upgradeHeight() {
    if (player.points >= 5) {
        player.points -= 5;
        player.height += 10;
        player.displaySize = 20 + (player.height - 100) * 0.3;
        createParticles(player.x, player.y, '#ff6b6b', 15);
        checkStageUnlock();
    }
}

function upgradeAttack() {
    if (player.points >= 3) {
        player.points -= 3;
        player.baseAttack += 5;
        createParticles(player.x, player.y, '#ff8844', 10);
    }
}

function upgradeDefense() {
    if (player.points >= 3) {
        player.points -= 3;
        player.baseDefense += 3;
        createParticles(player.x, player.y, '#4488ff', 10);
    }
}

function upgradeSpeed() {
    if (player.points >= 4) {
        player.points -= 4;
        player.baseSpeed += 1;
        createParticles(player.x, player.y, '#44ff88', 10);
    }
}

function checkStageUnlock() {
    for (let i = STAGES.length - 1; i >= 0; i--) {
        if (player.height >= STAGES[i].requiredHeight) {
            if (currentStage < i + 1) {
                currentStage = i + 1;
                player.x = WORLD_WIDTH / 2;
                player.y = WORLD_HEIGHT / 2;
                createParticles(player.x, player.y, '#ffd700', 30);
            }
            break;
        }
    }
}

document.getElementById('upgrade-height').addEventListener('click', upgradeHeight);
document.getElementById('upgrade-attack').addEventListener('click', upgradeAttack);
document.getElementById('upgrade-defense').addEventListener('click', upgradeDefense);
document.getElementById('upgrade-speed').addEventListener('click', upgradeSpeed);

function updatePlayer() {
    let dx = 0, dy = 0;

    if (keys['w'] || keys['arrowup']) dy = -player.baseSpeed;
    if (keys['s'] || keys['arrowdown']) dy = player.baseSpeed;
    if (keys['a'] || keys['arrowleft']) dx = -player.baseSpeed;
    if (keys['d'] || keys['arrowright']) dx = player.baseSpeed;

    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    player.x += dx;
    player.y += dy;

    player.x = Math.max(player.displaySize, Math.min(WORLD_WIDTH - player.displaySize, player.x));
    player.y = Math.max(player.displaySize, Math.min(WORLD_HEIGHT - player.displaySize, player.y));

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, camera.y));

    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.invincible > 0) player.invincible--;
}

function updateMonsters() {
    monsters.forEach(monster => {
        const dist = Math.hypot(player.x - monster.x, player.y - monster.y);

        if (dist < 200) {
            monster.aggro = true;
        } else if (dist > 400) {
            monster.aggro = false;
        }

        if (monster.aggro) {
            const angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            monster.dx = Math.cos(angle) * 1.5;
            monster.dy = Math.sin(angle) * 1.5;

            if (dist < player.displaySize + monster.size + 10 && monster.attackCooldown <= 0) {
                const damage = Math.max(1, monster.attack - player.baseDefense);
                if (player.invincible <= 0) {
                    player.exp -= damage;
                    player.invincible = 30;
                    createDamageNumber(player.x, player.y, damage, '#ff0000');
                    createParticles(player.x, player.y, '#ff0000', 5);
                }
                monster.attackCooldown = 60;
            }
        } else {
            if (Math.random() < 0.02) {
                monster.dx = (Math.random() - 0.5) * 2;
                monster.dy = (Math.random() - 0.5) * 2;
            }
        }

        monster.x += monster.dx;
        monster.y += monster.dy;

        monster.x = Math.max(monster.size, Math.min(WORLD_WIDTH - monster.size, monster.x));
        monster.y = Math.max(monster.size, Math.min(WORLD_HEIGHT - monster.size, monster.y));

        if (monster.attackCooldown > 0) monster.attackCooldown--;
    });
}

function playerAttack() {
    if (player.attackCooldown > 0) return;

    player.attackCooldown = 20;
    const attack = player.baseAttack;

    monsters.forEach((monster, index) => {
        const dist = Math.hypot(player.x - monster.x, player.y - monster.y);
        if (dist < player.attackRange + monster.size) {
            const damage = Math.max(1, attack - monster.defense);
            monster.hp -= damage;
            createDamageNumber(monster.x, monster.y, damage, '#ffff00');
            createParticles(monster.x, monster.y, monster.color, 5);

            if (monster.hp <= 0) {
                player.exp += monster.exp;
                player.points += monster.points;
                createParticles(monster.x, monster.y, '#ffd700', 15);
                monsters.splice(index, 1);

                while (player.exp >= player.expToLevel) {
                    player.exp -= player.expToLevel;
                    player.level++;
                    player.expToLevel = Math.floor(player.expToLevel * 1.5);
                    player.baseAttack += 2;
                    player.baseDefense += 1;
                    createParticles(player.x, player.y, '#ffd700', 20);
                }
            }
        }
    });
}

function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;
    const size = player.displaySize;

    if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    // Body (grows with height)
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Height indicator ring
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Height text
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.height}cm`, x, y - size / 2 - 10);

    ctx.globalAlpha = 1;
}

function drawMonster(monster) {
    const x = monster.x - camera.x;
    const y = monster.y - camera.y;

    ctx.fillStyle = monster.color;
    ctx.beginPath();
    ctx.arc(x, y, monster.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 5, y - 4, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 5, y - 4, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    const barWidth = 35;
    const barHeight = 5;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - barWidth / 2, y - monster.size / 2 - 12, barWidth, barHeight);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - barWidth / 2, y - monster.size / 2 - 12, barWidth * (monster.hp / monster.maxHp), barHeight);

    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(monster.name, x, y - monster.size / 2 - 16);
}

function drawWorld() {
    const stage = STAGES[currentStage - 1];
    ctx.fillStyle = stage.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const startX = -camera.x % gridSize;
    const startY = -camera.y % gridSize;
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // World boundary
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(-camera.x, -camera.y, WORLD_WIDTH, WORLD_HEIGHT);

    // Stage name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`스테이지: ${stage.name}`, 20, 40);
}

function drawHeightBar() {
    const barX = 20;
    const barY = 60;
    const barWidth = 200;
    const barHeight = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const maxHeight = 400;
    const progress = Math.min(1, (player.height - 100) / (maxHeight - 100));

    const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`키: ${player.height}cm / ${maxHeight}cm`, barX + barWidth / 2, barY + 15);

    // Next stage info
    if (currentStage < STAGES.length) {
        const nextStage = STAGES[currentStage];
        ctx.fillStyle = '#aaa';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`다음 스테이지: ${nextStage.name} (필요 키: ${nextStage.requiredHeight}cm)`, barX, barY + 35);
    }
}

function updateUI() {
    heightEl.textContent = player.height;
    levelEl.textContent = player.level;
    pointsEl.textContent = player.points;
    attackEl.textContent = player.baseAttack;
    defenseEl.textContent = player.baseDefense;
    speedEl.textContent = player.baseSpeed;
    stageEl.textContent = `${currentStage} - ${STAGES[currentStage - 1].name}`;

    document.getElementById('upgrade-height').disabled = player.points < 5;
    document.getElementById('upgrade-attack').disabled = player.points < 3;
    document.getElementById('upgrade-defense').disabled = player.points < 3;
    document.getElementById('upgrade-speed').disabled = player.points < 4;
}

function gameLoop() {
    drawWorld();
    monsters.forEach(drawMonster);
    drawPlayer();
    updatePlayer();
    updateMonsters();
    if (keys[' ']) playerAttack();
    updateParticles();
    drawParticles();
    drawHeightBar();
    updateUI();

    if (monsters.length < 10 && Math.random() < 0.02) {
        spawnMonster();
    }

    // Game over check (exp goes negative = damage taken)
    if (player.exp < 0) {
        player.exp = player.level * 20;
        player.x = WORLD_WIDTH / 2;
        player.y = WORLD_HEIGHT / 2;
        createParticles(player.x, player.y, '#ff0000', 20);
    }

    requestAnimationFrame(gameLoop);
}

// Initialize
for (let i = 0; i < 10; i++) {
    spawnMonster();
}
gameLoop();
