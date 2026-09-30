// ===== 3D 아레나 서바이벌 =====
const container = document.getElementById('game-container');
const hpBar = document.getElementById('hp-bar');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const overlay = document.getElementById('overlay');
const overlaySub = document.getElementById('overlay-sub');
const startBtn = document.getElementById('start-btn');
const gameoverEl = document.getElementById('gameover');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const damageFlash = document.getElementById('damage-flash');

let scene, camera, renderer, playerGroup;
let running = false, gameOver = false, locked = false;
let hp = 100, maxHp = 100, score = 0, wave = 1;
let yaw = 0, pitch = 0.4;
let playerVY = 0, onGround = true, invuln = 0;
let enemies = [], bullets = [], pillars = [];
let spawnTimer = 0, waveTimer = 0, frame = 0;

const ARENA = 48;          // 절반 크기
const GRAVITY = 0.014;

const keys = {};

// ===== 초기화 =====
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a18);
    scene.fog = new THREE.Fog(0x0a0a18, 40, 110);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 조명
    const ambient = new THREE.AmbientLight(0x505580, 0.9);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(35, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);

    // 바닥
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA * 2 + 8, ARENA * 2 + 8),
        new THREE.MeshStandardMaterial({ color: 0x2a5a35, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(ARENA * 2, ARENA, 0x3a7a4a, 0x24482c);
    grid.position.y = 0.02;
    scene.add(grid);

    // 벽
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a5a, roughness: 0.7 });
    const wallH = 4, wallT = 1, size = ARENA * 2 + 4;
    [[0, -size / 2, size, wallT], [0, size / 2, size, wallT],
     [-size / 2, 0, wallT, size], [size / 2, 0, wallT, size]].forEach(([x, z, w, d]) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
        wall.position.set(x, wallH / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    });

    // 장식 기둥
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x55557a, roughness: 0.6 });
    for (let i = 0; i < 14; i++) {
        const h = 3 + Math.random() * 6;
        const p = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8 + Math.random() * 0.7, 1 + Math.random() * 0.7, h, 8),
            pillarMat
        );
        p.position.set((Math.random() - 0.5) * (ARENA * 1.7), h / 2, (Math.random() - 0.5) * (ARENA * 1.7));
        p.castShadow = true;
        p.receiveShadow = true;
        scene.add(p);
        pillars.push(p);
    }

    // 플레이어
    playerGroup = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.35, emissive: 0x112266 })
    );
    body.castShadow = true;
    body.position.y = 1;
    playerGroup.add(body);

    const barrel = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.3 })
    );
    barrel.position.set(0, 1.15, -1);
    playerGroup.add(barrel);
    scene.add(playerGroup);

    animate();
}

// ===== 유틸 =====
function forwardVec() {
    return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
}

function clampPos(v, margin) {
    v.x = Math.max(-ARENA + margin, Math.min(ARENA - margin, v.x));
    v.z = Math.max(-ARENA + margin, Math.min(ARENA - margin, v.z));
}

// ===== 입력 =====
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    yaw -= e.movementX * 0.0024;
    pitch = Math.max(0.08, Math.min(1.15, pitch + e.movementY * 0.0022));
});

document.addEventListener('mousedown', (e) => {
    if (locked && e.button === 0 && running && !gameOver) shoot();
});

document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === renderer.domElement;
    if (!locked && running && !gameOver) {
        overlaySub.textContent = '일시정지 - 클릭하여 계속';
        startBtn.textContent = '계속하기';
        overlay.style.display = 'flex';
        running = false;
    }
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    renderer.domElement.requestPointerLock();
    running = true;
});

restartBtn.addEventListener('click', () => {
    resetGame();
    gameoverEl.style.display = 'none';
    renderer.domElement.requestPointerLock();
    running = true;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== 게임 액션 =====
function shoot() {
    const dir = forwardVec();
    const geo = new THREE.SphereGeometry(0.25, 10, 10);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee55 });
    const b = new THREE.Mesh(geo, mat);
    b.position.copy(playerGroup.position).add(new THREE.Vector3(dir.x * 1.6, 1.15, dir.z * 1.6));
    scene.add(b);
    bullets.push({ mesh: b, dir: dir.clone(), life: 90 });
}

function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const r = ARENA - 3;
    const size = 1.4 + Math.random() * 0.5;
    const e = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x550000, roughness: 0.5 })
    );
    e.castShadow = true;
    e.position.set(Math.cos(angle) * r, size / 2, Math.sin(angle) * r);
    scene.add(e);
    enemies.push({
        mesh: e,
        speed: 0.05 + wave * 0.012 + Math.random() * 0.02,
        hp: wave >= 4 ? 2 : 1,
        size: size,
        phase: Math.random() * 10
    });
}

function damagePlayer(amount) {
    if (invuln > 0) return;
    hp -= amount;
    invuln = 45;
    damageFlash.style.opacity = 1;
    setTimeout(() => { damageFlash.style.opacity = 0; }, 120);
    if (hp <= 0) endGame();
}

function endGame() {
    gameOver = true;
    running = false;
    document.exitPointerLock();
    finalScoreEl.textContent = `최종 점수: ${score} | 웨이브 ${wave}`;
    gameoverEl.style.display = 'flex';
}

function resetGame() {
    enemies.forEach(e => scene.remove(e.mesh));
    bullets.forEach(b => scene.remove(b.mesh));
    enemies = [];
    bullets = [];
    hp = maxHp; score = 0; wave = 1;
    spawnTimer = 0; waveTimer = 0; invuln = 0;
    playerGroup.position.set(0, 0, 0);
    playerVY = 0; onGround = true;
    yaw = 0; pitch = 0.4;
    gameOver = false;
    updateHUD();
}

function updateHUD() {
    const pct = Math.max(0, hp / maxHp) * 100;
    hpBar.style.width = pct + '%';
    hpBar.style.background = pct > 50 ? 'linear-gradient(90deg,#44ff88,#88ff44)'
        : pct > 25 ? 'linear-gradient(90deg,#ffaa44,#ffcc66)'
        : 'linear-gradient(90deg,#ff4444,#ff6666)';
    scoreEl.textContent = score;
    waveEl.textContent = wave;
}

// ===== 업데이트 =====
function updatePlayer() {
    const f = forwardVec();
    const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp']) move.add(f);
    if (keys['KeyS'] || keys['ArrowDown']) move.sub(f);
    if (keys['KeyD'] || keys['ArrowRight']) move.add(r);
    if (keys['KeyA'] || keys['ArrowLeft']) move.sub(r);

    if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(0.28);
        playerGroup.position.add(move);
        clampPos(playerGroup.position, 2.5);
    }

    // 점프
    if (keys['Space'] && onGround) {
        playerVY = 0.26;
        onGround = false;
    }
    playerVY -= GRAVITY;
    playerGroup.position.y += playerVY;
    if (playerGroup.position.y <= 0) {
        playerGroup.position.y = 0;
        playerVY = 0;
        onGround = true;
    }

    playerGroup.rotation.y = yaw;
    if (invuln > 0) {
        invuln--;
        playerGroup.visible = Math.floor(invuln / 5) % 2 === 0;
    } else {
        playerGroup.visible = true;
    }
}

function updateCamera() {
    const f = forwardVec();
    const dist = 10;
    const hd = dist * Math.cos(pitch);
    const height = 2 + dist * Math.sin(pitch);
    camera.position.set(
        playerGroup.position.x - f.x * hd,
        playerGroup.position.y + height,
        playerGroup.position.z - f.z * hd
    );
    camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.6, playerGroup.position.z);
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const m = e.mesh;
        const dir = new THREE.Vector3().subVectors(playerGroup.position, m.position);
        dir.y = 0;
        const d = dir.length();
        dir.normalize();
        m.position.addScaledVector(dir, e.speed);
        m.position.y = e.size / 2 + Math.sin(frame * 0.1 + e.phase) * 0.25;
        m.rotation.y += 0.03;
        m.rotation.x += 0.015;

        if (d < e.size / 2 + 1.3) {
            damagePlayer(12);
            m.position.addScaledVector(dir, -1.5); // 넉백
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.addScaledVector(b.dir, 1.1);
        b.life--;
        let removed = false;

        // 적 명중
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (b.mesh.position.distanceTo(e.mesh.position) < e.size / 2 + 0.5) {
                e.hp--;
                if (e.hp <= 0) {
                    scene.remove(e.mesh);
                    enemies.splice(j, 1);
                    score += 10;
                    hp = Math.min(maxHp, hp + 3);
                }
                scene.remove(b.mesh);
                bullets.splice(i, 1);
                removed = true;
                break;
            }
        }
        if (removed) continue;

        // 벽/수명
        const p = b.mesh.position;
        if (b.life <= 0 || Math.abs(p.x) > ARENA || Math.abs(p.z) > ARENA) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
}

function updateWaves() {
    waveTimer++;
    if (waveTimer >= 900) {
        waveTimer = 0;
        wave++;
    }
    spawnTimer++;
    const interval = Math.max(28, 85 - wave * 8);
    if (spawnTimer >= interval && enemies.length < 30) {
        spawnTimer = 0;
        spawnEnemy();
    }
}

// ===== 루프 =====
function animate() {
    requestAnimationFrame(animate);
    if (running && !gameOver) {
        frame++;
        updatePlayer();
        updateEnemies();
        updateBullets();
        updateWaves();
        updateHUD();
    }
    updateCamera();
    renderer.render(scene, camera);
}

// THREE 로드 확인
if (typeof THREE === 'undefined') {
    document.getElementById('overlay-sub').textContent = '인터넷 연결 후 새로고침해주세요 (Three.js 로드 실패)';
    startBtn.style.display = 'none';
} else {
    init();
    updateHUD();
}
