const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const levelEl = document.getElementById('level');
const hpEl = document.getElementById('hp');
const expEl = document.getElementById('exp');
const attackEl = document.getElementById('attack');
const defenseEl = document.getElementById('defense');
const moneyEl = document.getElementById('money');
const mountEl = document.getElementById('mount');
const shopMenu = document.getElementById('shop-menu');
const mountMenu = document.getElementById('mount-menu');

// Player stats
let player = {
    x: 450,
    y: 300,
    size: 25,
    speed: 3,
    level: 1,
    exp: 0,
    expToLevel: 100,
    hp: 100,
    maxHp: 100,
    baseAttack: 10,
    baseDefense: 5,
    money: 0,
    potions: 0,
    equipment: {
        weapon: null,
        armor: null
    },
    mount: null,
    attackCooldown: 0,
    attackRange: 50,
    invincible: 0
};

// World
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1500;
let camera = { x: 0, y: 0 };

// Monsters
let monsters = [];
const MONSTER_TYPES = [
    { name: '슬라임', color: '#00ff00', hp: 30, attack: 5, defense: 0, exp: 20, money: 10, size: 20 },
    { name: '고블린', color: '#8b4513', hp: 50, attack: 8, defense: 2, exp: 35, money: 20, size: 25 },
    { name: '오크', color: '#556b2f', hp: 80, attack: 12, defense: 5, exp: 60, money: 35, size: 30 },
    { name: '트롤', color: '#4a4a4a', hp: 120, attack: 18, defense: 8, exp: 100, money: 50, size: 35 },
    { name: '드래곤', color: '#ff4500', hp: 200, attack: 25, defense: 12, exp: 200, money: 100, size: 40 }
];

function spawnMonster() {
    const type = MONSTER_TYPES[Math.floor(Math.random() * Math.min(player.level + 1, MONSTER_TYPES.length))];
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
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
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
    if (e.key.toLowerCase() === 'b') toggleShop();
    if (e.key.toLowerCase() === 'm') toggleMountMenu();
    if (e.key.toLowerCase() === 'i') usePotion();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Shop items
const SHOP_ITEMS = {
    sword1: { name: '철검', cost: 50, attack: 5 },
    sword2: { name: '강철검', cost: 150, attack: 12 },
    sword3: { name: '미스릴검', cost: 400, attack: 25 },
    armor1: { name: '가죽 갑옷', cost: 40, defense: 3 },
    armor2: { name: '사슬 갑옷', cost: 120, defense: 8 },
    armor3: { name: '판금 갑옷', cost: 300, defense: 15 },
    potion: { name: '포션', cost: 20, heal: 50 }
};

const MOUNTS = {
    horse: { name: '말', cost: 200, speed: 2 },
    armoredHorse: { name: '무장 말', cost: 500, speed: 4 },
    cart: { name: '마차', cost: 1000, speed: 6 }
};

function toggleShop() {
    shopMenu.style.display = shopMenu.style.display === 'none' ? 'block' : 'none';
    mountMenu.style.display = 'none';
}

function toggleMountMenu() {
    mountMenu.style.display = mountMenu.style.display === 'none' ? 'block' : 'none';
    shopMenu.style.display = 'none';
}

function buyItem(itemKey) {
    const item = SHOP_ITEMS[itemKey];
    if (player.money >= item.cost) {
        player.money -= item.cost;
        if (itemKey.startsWith('sword')) {
            player.equipment.weapon = item;
        } else if (itemKey.startsWith('armor')) {
            player.equipment.armor = item;
        } else if (itemKey === 'potion') {
            player.potions++;
        }
        createParticles(player.x, player.y, '#ffd700', 10);
    }
}

function buyMount(mountKey) {
    const mount = MOUNTS[mountKey];
    if (player.money >= mount.cost) {
        player.money -= mount.cost;
        player.mount = mount;
        createParticles(player.x, player.y, '#ff44ff', 15);
    }
}

function dismount() {
    player.mount = null;
}

function usePotion() {
    if (player.potions > 0 && player.hp < player.maxHp) {
        player.potions--;
        player.hp = Math.min(player.maxHp, player.hp + 50);
        createParticles(player.x, player.y, '#00ff00', 10);
    }
}

// Event listeners for shop
document.getElementById('buy-sword1').addEventListener('click', () => buyItem('sword1'));
document.getElementById('buy-sword2').addEventListener('click', () => buyItem('sword2'));
document.getElementById('buy-sword3').addEventListener('click', () => buyItem('sword3'));
document.getElementById('buy-armor1').addEventListener('click', () => buyItem('armor1'));
document.getElementById('buy-armor2').addEventListener('click', () => buyItem('armor2'));
document.getElementById('buy-armor3').addEventListener('click', () => buyItem('armor3'));
document.getElementById('buy-potion').addEventListener('click', () => buyItem('potion'));
document.getElementById('buy-horse').addEventListener('click', () => buyMount('horse'));
document.getElementById('buy-armored-horse').addEventListener('click', () => buyMount('armoredHorse'));
document.getElementById('buy-cart').addEventListener('click', () => buyMount('cart'));
document.getElementById('dismount').addEventListener('click', dismount);

function getTotalAttack() {
    return player.baseAttack + (player.equipment.weapon ? player.equipment.weapon.attack : 0);
}

function getTotalDefense() {
    return player.baseDefense + (player.equipment.armor ? player.equipment.armor.defense : 0);
}

function getSpeed() {
    let speed = player.speed;
    if (player.mount) speed += player.mount.speed;
    return speed;
}

function updatePlayer() {
    const speed = getSpeed();
    let dx = 0, dy = 0;

    if (keys['w'] || keys['arrowup']) dy = -speed;
    if (keys['s'] || keys['arrowdown']) dy = speed;
    if (keys['a'] || keys['arrowleft']) dx = -speed;
    if (keys['d'] || keys['arrowright']) dx = speed;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    player.x += dx;
    player.y += dy;

    // World boundary
    player.x = Math.max(player.size, Math.min(WORLD_WIDTH - player.size, player.x));
    player.y = Math.max(player.size, Math.min(WORLD_HEIGHT - player.size, player.y));

    // Camera follow
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

        // Aggro range
        if (dist < 200) {
            monster.aggro = true;
        } else if (dist > 400) {
            monster.aggro = false;
        }

        if (monster.aggro) {
            // Move towards player
            const angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            monster.dx = Math.cos(angle) * 1.5;
            monster.dy = Math.sin(angle) * 1.5;

            // Attack player
            if (dist < player.size + monster.size + 10 && monster.attackCooldown <= 0) {
                const damage = Math.max(1, monster.attack - getTotalDefense());
                if (player.invincible <= 0) {
                    player.hp -= damage;
                    player.invincible = 30;
                    createDamageNumber(player.x, player.y, damage, '#ff0000');
                    createParticles(player.x, player.y, '#ff0000', 5);
                }
                monster.attackCooldown = 60;
            }
        } else {
            // Wander
            if (Math.random() < 0.02) {
                monster.dx = (Math.random() - 0.5) * 2;
                monster.dy = (Math.random() - 0.5) * 2;
            }
        }

        monster.x += monster.dx;
        monster.y += monster.dy;

        // World boundary
        monster.x = Math.max(monster.size, Math.min(WORLD_WIDTH - monster.size, monster.x));
        monster.y = Math.max(monster.size, Math.min(WORLD_HEIGHT - monster.size, monster.y));

        if (monster.attackCooldown > 0) monster.attackCooldown--;
    });
}

function playerAttack() {
    if (player.attackCooldown > 0) return;

    player.attackCooldown = 20;
    const attack = getTotalAttack();

    monsters.forEach((monster, index) => {
        const dist = Math.hypot(player.x - monster.x, player.y - monster.y);
        if (dist < player.attackRange + monster.size) {
            const damage = Math.max(1, attack - monster.defense);
            monster.hp -= damage;
            createDamageNumber(monster.x, monster.y, damage, '#ffff00');
            createParticles(monster.x, monster.y, monster.color, 5);

            if (monster.hp <= 0) {
                // Monster died
                player.exp += monster.exp;
                player.money += monster.money;
                createParticles(monster.x, monster.y, '#ffd700', 15);
                monsters.splice(index, 1);

                // Level up check
                while (player.exp >= player.expToLevel) {
                    player.exp -= player.expToLevel;
                    player.level++;
                    player.expToLevel = Math.floor(player.expToLevel * 1.5);
                    player.maxHp += 20;
                    player.hp = player.maxHp;
                    player.baseAttack += 3;
                    player.baseDefense += 2;
                    createParticles(player.x, player.y, '#ffd700', 20);
                }
            }
        }
    });
}

function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;

    // Invincibility flash
    if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    // Mount
    if (player.mount) {
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Body
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(x, y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Weapon
    if (player.equipment.weapon) {
        ctx.fillStyle = '#c0c0c0';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(15, -3, 25, 6);
        ctx.restore();
    }

    // Armor indicator
    if (player.equipment.armor) {
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, player.size / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

function drawMonster(monster) {
    const x = monster.x - camera.x;
    const y = monster.y - camera.y;

    // Body
    ctx.fillStyle = monster.color;
    ctx.beginPath();
    ctx.arc(x, y, monster.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 6, y - 5, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 6, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    const barWidth = 40;
    const barHeight = 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - barWidth / 2, y - monster.size / 2 - 15, barWidth, barHeight);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - barWidth / 2, y - monster.size / 2 - 15, barWidth * (monster.hp / monster.maxHp), barHeight);

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(monster.name, x, y - monster.size / 2 - 20);
}

function drawWorld() {
    // Ground
    ctx.fillStyle = '#2a4a2a';
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
}

function drawMinimap() {
    const mapSize = 150;
    const mapX = canvas.width - mapSize - 10;
    const mapY = 10;
    const scale = mapSize / WORLD_WIDTH;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize * (WORLD_HEIGHT / WORLD_WIDTH));

    // Player on minimap
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(mapX + player.x * scale, mapY + player.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();

    // Monsters on minimap
    ctx.fillStyle = '#ff0000';
    monsters.forEach(monster => {
        ctx.beginPath();
        ctx.arc(mapX + monster.x * scale, mapY + monster.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize * (WORLD_HEIGHT / WORLD_WIDTH));
}

function updateUI() {
    levelEl.textContent = player.level;
    hpEl.textContent = `${player.hp}/${player.maxHp}`;
    expEl.textContent = `${player.exp}/${player.expToLevel}`;
    attackEl.textContent = getTotalAttack();
    defenseEl.textContent = getTotalDefense();
    moneyEl.textContent = player.money;
    mountEl.textContent = player.mount ? player.mount.name : '없음';

    // Update shop buttons
    document.getElementById('buy-sword1').disabled = player.money < 50;
    document.getElementById('buy-sword2').disabled = player.money < 150;
    document.getElementById('buy-sword3').disabled = player.money < 400;
    document.getElementById('buy-armor1').disabled = player.money < 40;
    document.getElementById('buy-armor2').disabled = player.money < 120;
    document.getElementById('buy-armor3').disabled = player.money < 300;
    document.getElementById('buy-potion').disabled = player.money < 20;
    document.getElementById('buy-horse').disabled = player.money < 200;
    document.getElementById('buy-armored-horse').disabled = player.money < 500;
    document.getElementById('buy-cart').disabled = player.money < 1000;
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
    drawMinimap();
    updateUI();

    // Respawn monsters
    if (monsters.length < 15 && Math.random() < 0.02) {
        spawnMonster();
    }

    // Game over check
    if (player.hp <= 0) {
        player.hp = player.maxHp;
        player.x = WORLD_WIDTH / 2;
        player.y = WORLD_HEIGHT / 2;
        player.money = Math.floor(player.money * 0.9);
        createParticles(player.x, player.y, '#ff0000', 20);
    }

    requestAnimationFrame(gameLoop);
}

// Initialize
for (let i = 0; i < 15; i++) {
    spawnMonster();
}
gameLoop();
