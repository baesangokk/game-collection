// ===== Game State =====
let state = {
    gold: 1000,
    scrolls: 0,
    attempts: 0,
    successes: 0,
    destroyed: 0,
    fails: 0,
    level: 0,          // sword enhancement level
    swordAlive: true,
    enhancing: false
};

// ===== Enhancement Rules =====
// per level: cost, success rate, destroy rate
const RULES = [
    /* +0->1  */ { cost: 100,  success: 100, destroy: 0 },
    /* +1->2  */ { cost: 150,  success: 95,  destroy: 0 },
    /* +2->3  */ { cost: 200,  success: 90,  destroy: 0 },
    /* +3->4  */ { cost: 300,  success: 85,  destroy: 0 },
    /* +4->5  */ { cost: 400,  success: 80,  destroy: 0 },
    /* +5->6  */ { cost: 550,  success: 72,  destroy: 0 },
    /* +6->7  */ { cost: 700,  success: 65,  destroy: 2 },
    /* +7->8  */ { cost: 900,  success: 58,  destroy: 4 },
    /* +8->9  */ { cost: 1200, success: 50,  destroy: 7 },
    /* +9->10 */ { cost: 1600, success: 42,  destroy: 10 },
    /* +10->11*/ { cost: 2200, success: 35,  destroy: 14 },
    /* +11->12*/ { cost: 3000, success: 28,  destroy: 18 },
    /* +12->13*/ { cost: 4200, success: 21,  destroy: 23 },
    /* +13->14*/ { cost: 6000, success: 15,  destroy: 28 },
    /* +14->15*/ { cost: 9000, success: 10,  destroy: 33 },
];
const MAX_LEVEL = 15;

// Tier names by level
function tierName(level) {
    if (level === 0) return '티어: F';
    if (level <= 3) return '티어: E';
    if (level <= 6) return '티어: D';
    if (level <= 8) return '티어: C';
    if (level <= 10) return '티어: B';
    if (level <= 12) return '티어: A';
    if (level <= 14) return '티어: S';
    return '티어: SS (전설)';
}

// Sword base names by tier
function swordName(level) {
    if (level === 0) return '녹슨 검';
    if (level <= 3) return '철 검';
    if (level <= 6) return '강철 검';
    if (level <= 8) return '은빛 검';
    if (level <= 10) return '미스릴 검';
    if (level <= 12) return '용살자 검';
    if (level <= 14) return '신기(神器)';
    return '창세의 검';
}

function currentRule() {
    if (state.level >= MAX_LEVEL) return null;
    return RULES[state.level];
}

// ===== UI Elements =====
const goldEl = document.getElementById('gold');
const scrollsEl = document.getElementById('scrolls');
const attemptsEl = document.getElementById('attempts');
const successesEl = document.getElementById('successes');
const destroyedEl = document.getElementById('destroyed');
const swordNameEl = document.getElementById('sword-name');
const swordTierEl = document.getElementById('sword-tier');
const currentLevelEl = document.getElementById('current-level');
const successRateEl = document.getElementById('success-rate');
const destroyRateEl = document.getElementById('destroy-rate');
const enhanceCostEl = document.getElementById('enhance-cost');
const useScrollEl = document.getElementById('use-scroll');
const enhanceBtn = document.getElementById('enhance-btn');
const buyScrollBtn = document.getElementById('buy-scroll-btn');
const resetBtn = document.getElementById('reset-btn');
const logEl = document.getElementById('log');
const modal = document.getElementById('result-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-text');
const tierTableEl = document.getElementById('tier-table');

// ===== Sword Canvas =====
const swordCanvas = document.getElementById('sword-canvas');
const sctx = swordCanvas.getContext('2d');
let glowIntensity = 0;
let glowTarget = 0;
let shake = 0;
let sparks = [];

function drawSword() {
    const w = swordCanvas.width;
    const h = swordCanvas.height;
    sctx.clearRect(0, 0, w, h);

    const cx = w / 2 + (shake > 0 ? (Math.random() - 0.5) * shake : 0);
    const cy = h / 2 + (shake > 0 ? (Math.random() - 0.5) * shake : 0);

    // Background glow by level
    const colors = glowColors(state.level);
    if (glowIntensity > 0) {
        const grad = sctx.createRadialGradient(cx, cy, 10, cx, cy, 150);
        grad.addColorStop(0, `rgba(${colors.rgb}, ${0.35 * glowIntensity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, w, h);
    }

    // Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.dx;
        s.y += s.dy;
        s.life--;
        sctx.globalAlpha = s.life / s.maxLife;
        sctx.fillStyle = s.color;
        sctx.beginPath();
        sctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        sctx.fill();
        if (s.life <= 0) sparks.splice(i, 1);
    }
    sctx.globalAlpha = 1;

    sctx.save();
    sctx.translate(cx, cy);

    // Blade
    const bladeGrad = sctx.createLinearGradient(-15, -150, 15, 40);
    bladeGrad.addColorStop(0, '#e8e8f0');
    bladeGrad.addColorStop(0.5, '#c0c0d0');
    bladeGrad.addColorStop(1, '#9a9aac');
    sctx.fillStyle = bladeGrad;

    sctx.beginPath();
    sctx.moveTo(0, -155);
    sctx.lineTo(13, -130);
    sctx.lineTo(13, 30);
    sctx.lineTo(-13, 30);
    sctx.lineTo(-13, -130);
    sctx.closePath();
    sctx.fill();

    // Blade center line
    sctx.strokeStyle = 'rgba(255,255,255,0.5)';
    sctx.lineWidth = 1.5;
    sctx.beginPath();
    sctx.moveTo(0, -150);
    sctx.lineTo(0, 28);
    sctx.stroke();

    // Guard
    sctx.fillStyle = colors.hex;
    sctx.fillRect(-35, 30, 70, 12);

    // Handle
    sctx.fillStyle = '#5a3a1a';
    sctx.fillRect(-8, 42, 16, 55);

    // Handle wrap
    sctx.strokeStyle = '#3a2510';
    sctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
        sctx.beginPath();
        sctx.moveTo(-8, 48 + i * 10);
        sctx.lineTo(8, 54 + i * 10);
        sctx.stroke();
    }

    // Pommel
    sctx.fillStyle = colors.hex;
    sctx.beginPath();
    sctx.arc(0, 102, 9, 0, Math.PI * 2);
    sctx.fill();

    sctx.restore();

    // Enhancement level glow rings
    if (state.level >= 10) {
        const ringAlpha = 0.25 + Math.sin(Date.now() / 300) * 0.15;
        sctx.strokeStyle = `rgba(${colors.rgb}, ${ringAlpha})`;
        sctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            sctx.beginPath();
            sctx.arc(cx, cy, 120 + i * 18, 0, Math.PI * 2);
            sctx.stroke();
        }
    }
}

function glowColors(level) {
    if (level === 0) return { rgb: '150,150,150', hex: '#969696' };
    if (level <= 3) return { rgb: '150,150,150', hex: '#969696' };
    if (level <= 6) return { rgb: '100,200,255', hex: '#64c8ff' };
    if (level <= 8) return { rgb: '80,255,136', hex: '#50ff88' };
    if (level <= 10) return { rgb: '255,215,0', hex: '#ffd700' };
    if (level <= 12) return { rgb: '255,80,200', hex: '#ff50c8' };
    if (level <= 14) return { rgb: '170,68,255', hex: '#aa44ff' };
    return { rgb: '255,255,255', hex: '#ffffff' };
}

function spawnSparks(color) {
    const cx = swordCanvas.width / 2;
    const cy = swordCanvas.height / 2;
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        sparks.push({
            x: cx,
            y: cy,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 40 + Math.random() * 30,
            maxLife: 70,
            color: color,
            size: 2 + Math.random() * 4
        });
    }
}

// ===== Tier Table =====
function buildTierTable() {
    tierTableEl.innerHTML = '';
    RULES.forEach((rule, i) => {
        const cell = document.createElement('div');
        cell.className = 'tier-cell';
        const colors = glowColors(i + 1);
        cell.innerHTML = `
            <div class="tier-level" style="color: rgb(${colors.rgb})">+${i + 1}</div>
            <div class="tier-rate">성공 ${rule.success}%</div>
            <div class="tier-rate">${rule.destroy > 0 ? `파괴 ${rule.destroy}%` : '안전'}</div>
        `;
        tierTableEl.appendChild(cell);
    });
}

// ===== Log =====
function addLog(text, type) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = text;
    logEl.prepend(entry);
    // Keep max 50 entries
    while (logEl.children.length > 50) {
        logEl.removeChild(logEl.lastChild);
    }
}

// ===== Modal =====
function showModal(icon, title, text) {
    modalIcon.textContent = icon;
    modalTitle.textContent = title;
    modalText.textContent = text;
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

// ===== Core: Enhance =====
function doEnhance() {
    if (state.enhancing || !state.swordAlive) return;

    const rule = currentRule();
    if (!rule) return;

    if (state.gold < rule.cost) {
        addLog('💰 골드가 부족합니다!', 'fail');
        return;
    }

    const usingScroll = useScrollEl.checked && state.scrolls > 0;
    state.gold -= rule.cost;
    state.attempts++;
    state.enhancing = true;
    enhanceBtn.disabled = true;

    // Animation phase
    glowTarget = 1;
    shake = 3;

    setTimeout(() => {
        const roll = Math.random() * 100;
        const successRate = rule.success;
        const destroyRate = usingScroll ? 0 : rule.destroy;

        if (roll < successRate) {
            // ===== SUCCESS =====
            state.level++;
            state.successes++;
            state.enhancing = false;
            glowTarget = 0;
            shake = 0;
            spawnSparks(glowColors(state.level).hex);
            addLog(`✅ 강화 성공! 검이 +${state.level}이 되었습니다!`, 'success');

            if (state.level === MAX_LEVEL) {
                showModal('👑', '최고 등급 달성!', '창세의 검 +15를 완성했습니다! 당신은 진정한 강화의 신입니다!');
                addLog('👑 전설의 검 완성!', 'success');
            } else if (state.level % 5 === 0) {
                showModal('🎉', '대성공!', `검이 +${state.level}로 강화되었습니다! 새로운 티어에 도달했습니다!`);
            }

        } else if (roll < successRate + destroyRate) {
            // ===== DESTROYED =====
            state.destroyed++;
            state.swordAlive = false;
            state.level = 0;
            state.enhancing = false;
            glowTarget = 0;
            shake = 12;
            spawnSparks('#ff4444');
            addLog('💥 검이 파괴되었습니다! 처음부터 다시 시작하세요...', 'destroy');
            showModal('💀', '검 파괴...', `강화에 실패하여 검이 파괴되었습니다.${usingScroll ? '' : '\n다음엔 보호권을 사용해보세요!'}`);
            setTimeout(() => { shake = 0; }, 400);

        } else {
            // ===== FAIL (no destroy) =====
            state.fails++;
            state.enhancing = false;
            glowTarget = 0;
            shake = 5;
            spawnSparks('#ffaa44');
            addLog(`❌ 강화 실패... (+${state.level} 유지)`, 'fail');
            if (state.level >= 7) {
                // High level fail: lose 1 level (classic MMORPG pain)
                state.level--;
                addLog(`📉 강화 등급이 +${state.level}로 하락했습니다!`, 'fail');
            }
        }

        // Consume scroll
        if (usingScroll) {
            state.scrolls--;
            addLog('🛡️ 보호권을 사용했습니다.', 'info');
        }

        enhanceBtn.disabled = false;
        updateUI();
    }, 600);
}

// ===== Actions =====
function buyScroll() {
    if (state.gold < 500) {
        addLog('💰 골드가 부족합니다! (보호권: 500G)', 'fail');
        return;
    }
    state.gold -= 500;
    state.scrolls++;
    addLog('🛡️ 보호권을 구매했습니다!', 'info');
    updateUI();
}

function resetSword() {
    if (state.swordAlive && state.level > 0) {
        addLog('⚠️ 이미 검이 있습니다!', 'fail');
        return;
    }
    if (state.gold < 100) {
        addLog('💰 골드가 부족합니다! (검: 100G)', 'fail');
        return;
    }
    state.gold -= 100;
    state.swordAlive = true;
    state.level = 0;
    addLog('🗡️ 새로운 녹슨 검을 구매했습니다!', 'info');
    updateUI();
}

// ===== UI Update =====
function updateUI() {
    goldEl.textContent = state.gold.toLocaleString();
    scrollsEl.textContent = state.scrolls;
    attemptsEl.textContent = state.attempts;
    successesEl.textContent = state.successes;
    destroyedEl.textContent = state.destroyed;

    const rule = currentRule();
    const lvl = state.level;

    swordNameEl.textContent = `${swordName(lvl)} +${lvl}`;
    swordTierEl.textContent = tierName(lvl);
    currentLevelEl.textContent = `+${lvl}`;

    // Color the level display
    const colors = glowColors(lvl);
    currentLevelEl.style.color = lvl === 0 ? '#aaa' : `rgb(${colors.rgb})`;

    if (!state.swordAlive) {
        successRateEl.textContent = '-';
        destroyRateEl.textContent = '-';
        enhanceCostEl.textContent = '-';
        enhanceBtn.disabled = true;
        enhanceBtn.textContent = '🗡️ 검을 먼저 구매하세요';
        swordNameEl.textContent = '(검 없음)';
        swordTierEl.textContent = '티어: -';
        currentLevelEl.textContent = '-';
    } else if (!rule) {
        successRateEl.textContent = 'MAX';
        destroyRateEl.textContent = '-';
        enhanceCostEl.textContent = '-';
        enhanceBtn.disabled = true;
        enhanceBtn.textContent = '👑 최고 등급 달성!';
    } else {
        successRateEl.textContent = `${rule.success}%`;
        destroyRateEl.textContent = `${rule.destroy}%`;
        enhanceCostEl.textContent = `${rule.cost.toLocaleString()}G`;
        enhanceBtn.disabled = state.gold < rule.cost;
        enhanceBtn.textContent = '🔨 강화하기';
    }

    buyScrollBtn.disabled = state.gold < 500;
    resetBtn.disabled = state.swordAlive || state.gold < 100;
    useScrollEl.disabled = state.scrolls === 0;
}

// ===== Animation Loop =====
function animate() {
    glowIntensity += (glowTarget - glowIntensity) * 0.15;
    if (shake > 0) shake *= 0.85;
    drawSword();
    requestAnimationFrame(animate);
}

// ===== Events =====
enhanceBtn.addEventListener('click', doEnhance);
buyScrollBtn.addEventListener('click', buyScroll);
resetBtn.addEventListener('click', resetSword);

// ===== Init =====
buildTierTable();
updateUI();
animate();
addLog('⚔️ 강화 게임에 오신 것을 환영합니다!', 'info');
addLog('💡 +7부터는 실패 시 등급이 하락하고, 파괴될 수 있습니다!', 'info');
