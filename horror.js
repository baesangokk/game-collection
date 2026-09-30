// ============================================
//  어둠의 복도 - 3D 공포게임
// ============================================
const TILE = 6;
const CELLS = 13;
const GRID = CELLS * 2 + 1; // 27x27 타일

const container = document.getElementById('game-container');
const batteryBar = document.getElementById('battery-bar');
const staminaBar = document.getElementById('stamina-bar');
const notesCountEl = document.getElementById('notes-count');
const toastEl = document.getElementById('toast');
const overlay = document.getElementById('overlay');
const overlayBox = document.getElementById('overlay-box');
const overlaySub = document.getElementById('overlay-sub');
const startBtn = document.getElementById('start-btn');
const gameoverEl = document.getElementById('gameover');
const finalTextEl = document.getElementById('final-text');
const restartBtn = document.getElementById('restart-btn');
const escapedEl = document.getElementById('escaped');
const winTextEl = document.getElementById('win-text');
const againBtn = document.getElementById('again-btn');
const jumpscare = document.getElementById('jumpscare');

// 위험 비네트 (동적 생성)
const dangerDiv = document.createElement('div');
dangerDiv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;box-shadow:inset 0 0 140px 60px rgba(180,0,0,0.85);opacity:0;transition:opacity 0.3s';
document.body.appendChild(dangerDiv);

// ===== 상태 =====
let scene, camera, renderer, spot, spotTarget;
let grid = [], floorTiles = [];
let wallsGroup, notesArr = [], batteriesArr = [], exitDoor, exitDoorMat, dust;
let monster = null, monsterPath = [], pathTimer = 0, lastKnown = null, lostTimer = 0, stingPlayed = false;
let running = false, paused = false, gameOver = false, won = false;
let yaw = 0, pitch = 0;
let player, playerVY_isUnused = 0;
let battery = 100, stamina = 100, flashOn = true;
let notes = 0, elapsed = 0, doorUnlocked = false;
let monsterRoamSpeed = 2.1, monsterChaseSpeed = 3.8;
let hbTimer = 0, stepTimer = 0, whisperTimer = 20, rampTimer = 0;
let bobPhase = 0;
const keys = {};
let clock;

// ============================================
//  오디오 (WebAudio 합성)
// ============================================
let actx = null, droneGain = null;

function initAudio() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();

    // 배경 드론 (낮은 불안한 소리)
    droneGain = actx.createGain();
    droneGain.gain.value = 0.045;
    droneGain.connect(actx.destination);
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.connect(droneGain);
    [52, 55.5, 110.3].forEach(f => {
        const o = actx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = actx.createGain();
        g.gain.value = 0.33;
        o.connect(g); g.connect(lp);
        o.start();
    });
}

function noiseBuffer(dur) {
    const len = actx.sampleRate * dur;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

function playFootstep(run) {
    if (!actx) return;
    const src = actx.createBufferSource();
    src.buffer = noiseBuffer(0.09);
    const f = actx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = run ? 340 : 240;
    const g = actx.createGain();
    g.gain.setValueAtTime(run ? 0.16 : 0.09, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.09);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start();
}

function playHeartbeat() {
    if (!actx) return;
    [0, 0.14].forEach((t, i) => {
        const o = actx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(58, actx.currentTime + t);
        o.frequency.exponentialRampToValueAtTime(36, actx.currentTime + t + 0.12);
        const g = actx.createGain();
        g.gain.setValueAtTime(i === 0 ? 0.5 : 0.36, actx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.16);
        o.connect(g); g.connect(actx.destination);
        o.start(actx.currentTime + t);
        o.stop(actx.currentTime + t + 0.2);
    });
}

function playPickup() {
    if (!actx) return;
    const o = actx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1180, actx.currentTime + 0.18);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.22, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.5);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.55);
}

function playSting() {
    if (!actx) return;
    // 발견됐을 때 불협화음
    [880, 932, 1245].forEach(f => {
        const o = actx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, actx.currentTime);
        g.gain.linearRampToValueAtTime(0.12, actx.currentTime + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.1);
        o.connect(g); g.connect(actx.destination);
        o.start(); o.stop(actx.currentTime + 1.2);
    });
}

function playScream() {
    if (!actx) return;
    // 점프스케어
    const o = actx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(950, actx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, actx.currentTime + 0.85);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.55, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.95);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 1);

    const n = actx.createBufferSource();
    n.buffer = noiseBuffer(0.7);
    const ng = actx.createGain();
    ng.gain.setValueAtTime(0.4, actx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.7);
    n.connect(ng); ng.connect(actx.destination);
    n.start();
}

function playWhisper() {
    if (!actx) return;
    const src = actx.createBufferSource();
    src.buffer = noiseBuffer(1.4);
    const f = actx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1400, actx.currentTime);
    f.frequency.linearRampToValueAtTime(700, actx.currentTime + 1.3);
    f.Q.value = 6;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.linearRampToValueAtTime(0.05, actx.currentTime + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, actx.currentTime + 1.4);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start();
}

function playUnlock() {
    if (!actx) return;
    [523, 659, 784].forEach((f, i) => {
        const o = actx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = actx.createGain();
        g.gain.setValueAtTime(0.001, actx.currentTime + i * 0.12);
        g.gain.linearRampToValueAtTime(0.2, actx.currentTime + i * 0.12 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + i * 0.12 + 0.6);
        o.connect(g); g.connect(actx.destination);
        o.start(actx.currentTime + i * 0.12);
        o.stop(actx.currentTime + i * 0.12 + 0.7);
    });
}

// ============================================
//  미로 생성 (재귀적 백트래킹)
// ============================================
function generateMaze() {
    grid = Array.from({ length: GRID }, () => Array(GRID).fill(1));
    const stack = [[1, 1]];
    grid[1][1] = 0;
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];

    while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const options = dirs
            .map(([dx, dy]) => [cx + dx, cy + dy, cx + dx / 2, cy + dy / 2])
            .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < GRID - 1 && ny < GRID - 1 && grid[ny][nx] === 1);
        if (!options.length) { stack.pop(); continue; }
        const [nx, ny, wx, wy] = options[Math.floor(Math.random() * options.length)];
        grid[wy][wx] = 0;
        grid[ny][nx] = 0;
        stack.push([nx, ny]);
    }

    // 약간의 루프 추가 (막다른 길 줄이기)
    for (let i = 0; i < 14; i++) {
        const x = 2 + Math.floor(Math.random() * (GRID - 4));
        const y = 2 + Math.floor(Math.random() * (GRID - 4));
        if (grid[y][x] === 1) grid[y][x] = 0;
    }

    floorTiles = [];
    for (let y = 0; y < GRID; y++)
        for (let x = 0; x < GRID; x++)
            if (grid[y][x] === 0) floorTiles.push([x, y]);
}

function tileCenter(tx, tz) {
    return new THREE.Vector3(tx * TILE + TILE / 2, 0, tz * TILE + TILE / 2);
}
function tileOf(v) { return Math.floor(v / TILE); }
function isWallAt(x, z) {
    const tx = tileOf(x), tz = tileOf(z);
    if (tx < 0 || tz < 0 || tx >= GRID || tz >= GRID) return true;
    return grid[tz][tx] === 1;
}
function hasLOS(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const d = Math.hypot(dx, dz);
    const steps = Math.ceil(d / 1.0);
    for (let i = 1; i < steps; i++) {
        if (isWallAt(ax + dx * i / steps, az + dz * i / steps)) return false;
    }
    return true;
}
function collides(x, z, r) {
    for (let tz = tileOf(z - r); tz <= tileOf(z + r); tz++)
        for (let tx = tileOf(x - r); tx <= tileOf(x + r); tx++) {
            const wx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
            const wz = Math.max(tz * TILE, Math.min(z, tz * TILE + TILE));
            if ((x - wx) ** 2 + (z - wz) ** 2 < r * r && isWallTile(tx, tz)) return true;
        }
    return false;
}
function isWallTile(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= GRID || tz >= GRID) return true;
    return grid[tz][tx] === 1;
}
function moveWithCollision(pos, dx, dz, r) {
    pos.x += dx;
    if (collides(pos.x, pos.z, r)) pos.x -= dx;
    pos.z += dz;
    if (collides(pos.x, pos.z, r)) pos.z -= dz;
}

function bfsPath(sx, sz, tx, tz) {
    const start = sz * GRID + sx, goal = tz * GRID + tx;
    if (start === goal) return [];
    const prev = new Int32Array(GRID * GRID).fill(-2);
    prev[start] = -1;
    const q = [start];
    const dirs = [1, -1, GRID, -GRID];
    let found = false;
    while (q.length) {
        const cur = q.shift();
        if (cur === goal) { found = true; break; }
        const cx = cur % GRID;
        for (const d of dirs) {
            const nxt = cur + d;
            if (nxt < 0 || nxt >= GRID * GRID || prev[nxt] !== -2) continue;
            const nx = nxt % GRID;
            if (d === 1 && nx === 0) continue;      // 행 넘어감 방지
            if (d === -1 && nx === GRID - 1) continue;
            if (grid[Math.floor(nxt / GRID)][nx] === 1) continue;
            prev[nxt] = cur;
            q.push(nxt);
        }
    }
    if (!found) return [];
    const path = [];
    let cur = goal;
    while (cur !== start) {
        path.push(tileCenter(cur % GRID, Math.floor(cur / GRID)));
        cur = prev[cur];
    }
    return path.reverse();
}

// ============================================
//  씬 초기화
// ============================================
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04040a);
    scene.fog = new THREE.FogExp2(0x04040a, 0.028);

    camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 120);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 환경광 (배경 실루엣 정도는 보이게)
    scene.add(new THREE.AmbientLight(0x4a4a66, 0.85));

    // 손전등 (밝게 + 넓게 + 멀리)
    spot = new THREE.SpotLight(0xfff2dd, 5.2, 60, 0.72, 0.32, 1.0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.camera.near = 0.3;
    spot.shadow.camera.far = 35;
    spot.position.set(0.12, -0.08, 0);
    camera.add(spot);
    spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, -6);
    camera.add(spotTarget);
    spot.target = spotTarget;

    buildWorld();
    animate();
}

function buildWorld() {
    generateMaze();

    const size = GRID * TILE;
    // 바닥 / 천장
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshLambertMaterial({ color: 0x2a2a30 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(size / 2, 0, size / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshLambertMaterial({ color: 0x16161c })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(size / 2, 3.4, size / 2);
    scene.add(ceil);

    // 벽 (인스턴스 대신 개별 메시, 그림자 지원)
    const wallGeo = new THREE.BoxGeometry(TILE, 3.4, TILE);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x3d3d48 });
    wallsGroup = new THREE.Group();
    for (let z = 0; z < GRID; z++) {
        for (let x = 0; x < GRID; x++) {
            if (grid[z][x] !== 1) continue;
            const w = new THREE.Mesh(wallGeo, wallMat);
            const c = tileCenter(x, z);
            w.position.set(c.x, 1.7, c.z);
            w.castShadow = true;
            w.receiveShadow = true;
            wallsGroup.add(w);
        }
    }
    scene.add(wallsGroup);

    // 먼지 입자
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 260;
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        pos[i * 3] = Math.random() * size;
        pos[i * 3 + 1] = Math.random() * 3;
        pos[i * 3 + 2] = Math.random() * size;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
        color: 0x8888aa, size: 0.045, transparent: true, opacity: 0.5
    }));
    scene.add(dust);

    // 플레이어 시작 (1,1)
    const startC = tileCenter(1, 1);
    player = new THREE.Vector3(startC.x, 0, startC.z);
    yaw = 0; pitch = 0;

    // ===== 노트 5개 (막다른 길 우선) =====
    const deadEnds = floorTiles.filter(([x, z]) => {
        let n = 0;
        if (grid[z][x - 1] === 0) n++;
        if (grid[z][x + 1] === 0) n++;
        if (grid[z - 1] && grid[z - 1][x] === 0) n++;
        if (grid[z + 1] && grid[z + 1][x] === 0) n++;
        return n === 1 && (x + z) > 8;
    });
    const shuffled = deadEnds.sort(() => Math.random() - 0.5);
    const noteTiles = shuffled.slice(0, 5);
    let fallback = floorTiles.filter(([x, z]) => (x + z) > 16).sort(() => Math.random() - 0.5);
    while (noteTiles.length < 5 && fallback.length) {
        const t = fallback.pop();
        if (!noteTiles.some(n => n[0] === t[0] && n[1] === t[1])) noteTiles.push(t);
    }

    const noteGeo = new THREE.PlaneGeometry(0.55, 0.75);
    const noteMsgs = [
        '“그것은 소리를 듣는다. 숨을 죽여라.”',
        '“불빛은 그의 눈을 끈다. 필요할 때만 켜라.”',
        '“복도 끝 발소리... 그건 내 발소리가 아니다.”',
        '“문은 다섯 개의 기억으로만 열린다.”',
        '“이제 달려라. 문으로. 빨리!”'
    ];
    noteTiles.forEach((t, i) => {
        const c = tileCenter(t[0], t[1]);
        const m = new THREE.Mesh(noteGeo, new THREE.MeshBasicMaterial({
            color: 0xfff8dc, side: THREE.DoubleSide
        }));
        m.position.set(c.x, 0.9, c.z);
        m.rotation.x = -Math.PI / 2 + 0.35;
        m.rotation.z = Math.random() * Math.PI;
        m.userData = { msg: noteMsgs[i] };
        scene.add(m);
        notesArr.push(m);
    });

    // ===== 배터리 3개 =====
    const battTiles = floorTiles.filter(([x, z]) =>
        !noteTiles.some(n => n[0] === x && n[1] === z) && (x + z) > 10
    ).sort(() => Math.random() - 0.5).slice(0, 3);
    battTiles.forEach(t => {
        const c = tileCenter(t[0], t[1]);
        const m = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.45, 10),
            new THREE.MeshBasicMaterial({ color: 0xffcc33 })
        );
        m.position.set(c.x, 0.25, c.z);
        scene.add(m);
        batteriesArr.push(m);
    });

    // ===== 탈출문 (맞은편 구석) =====
    const exitC = tileCenter(GRID - 2, GRID - 2);
    exitDoorMat = new THREE.MeshBasicMaterial({ color: 0xaa1111 });
    exitDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 0.25), exitDoorMat);
    exitDoor.position.set(exitC.x, 1.5, exitC.z);
    scene.add(exitDoor);
    const exitLight = new THREE.PointLight(0xff2222, 1.2, 10);
    exitLight.position.set(exitC.x, 2.2, exitC.z);
    scene.add(exitLight);
    exitDoor.userData = { light: exitLight };

    // ===== 괴물 (반대편 구석 스폰) =====
    const mSpawn = tileCenter(1, GRID - 2);
    monster = buildMonster();
    monster.group.position.copy(mSpawn);
    scene.add(monster.group);
}

function buildMonster() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.62, 2.7, 10),
        new THREE.MeshLambertMaterial({ color: 0x08080a })
    );
    body.position.y = 1.35;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0x0a0a0c })
    );
    head.position.y = 2.95;
    group.add(head);

    // 팔 (기다란)
    const armGeo = new THREE.BoxGeometry(0.14, 1.7, 0.14);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0c });
    [-0.55, 0.55].forEach(x => {
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(x, 1.5, 0);
        group.add(arm);
    });

    // 빛나는 눈
    const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.14, 0.14].forEach(x => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(x, 3.0, -0.34);
        group.add(eye);
    });

    // 희미한 붉은 광원
    const glow = new THREE.PointLight(0xff2200, 0.7, 9);
    glow.position.y = 1.6;
    group.add(glow);

    return { group, body, phase: Math.random() * 10 };
}

// ============================================
//  입력 & 포인터락
// ============================================
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyF' && running && !paused) toggleFlash();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== renderer?.domElement) return;
    yaw -= e.movementX * 0.0022;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + e.movementY * 0.0022));
});

function toggleFlash() {
    if (battery <= 0) return;
    flashOn = !flashOn;
    spot.visible = flashOn;
}

let overlayMode = 'start';
startBtn.addEventListener('click', () => {
    initAudio();
    if (overlayMode === 'start') {
        overlay.style.display = 'none';
        running = true;
        clock = new THREE.Clock();
    } else {
        overlay.style.display = 'none';
        paused = false;
        clock.getDelta();
    }
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer?.domElement;
    if (!locked && running && !gameOver && !won) {
        paused = true;
        overlayMode = 'pause';
        document.getElementById('overlay-box').querySelector('h1').textContent = '일시정지';
        overlaySub.innerHTML = '잠시 숨을 돌리세요...<br>그러나 그것은 쉬지 않습니다.';
        startBtn.textContent = '계속하기';
        overlay.style.display = 'flex';
    }
});

restartBtn.addEventListener('click', () => location.reload());
againBtn.addEventListener('click', () => location.reload());

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ============================================
//  게임 오버 / 승리
// ============================================
function catchPlayer() {
    if (gameOver || won) return;
    gameOver = true;
    running = false;
    playScream();
    if (droneGain) droneGain.gain.value = 0;
    document.exitPointerLock();
    jumpscare.style.display = 'flex';
    setTimeout(() => {
        jumpscare.style.display = 'none';
        finalTextEl.innerHTML = `수집한 노트: ${notes} / 5<br>생존 시간: ${Math.floor(elapsed)}초<br><br>그것은 아직 배고프습니다...`;
        gameoverEl.style.display = 'flex';
    }, 1300);
}

function winGame() {
    if (won || gameOver) return;
    won = true;
    running = false;
    playUnlock();
    if (droneGain) droneGain.gain.value = 0;
    document.exitPointerLock();
    winTextEl.innerHTML = `탈출 소요 시간: ${Math.floor(elapsed)}초<br>남은 배터리: ${Math.max(0, Math.floor(battery))}%<br><br>당신은 어둠에서 빠져나왔습니다... 아마도.`;
    escapedEl.style.display = 'flex';
}

let toastTimer = null;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = 0; }, 4200);
}

// ============================================
//  업데이트
// ============================================
function updatePlayer(dt) {
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp']) move.add(f);
    if (keys['KeyS'] || keys['ArrowDown']) move.sub(f);
    if (keys['KeyD'] || keys['ArrowRight']) move.add(r);
    if (keys['KeyA'] || keys['ArrowLeft']) move.sub(r);

    const moving = move.lengthSq() > 0;
    const wantRun = (keys['ShiftLeft'] || keys['ShiftRight']) && moving && stamina > 1;
    const speed = wantRun ? 5.6 : 3.3;

    if (wantRun) {
        stamina = Math.max(0, stamina - 30 * dt);
    } else {
        stamina = Math.min(100, stamina + 16 * dt);
    }

    if (moving) {
        move.normalize().multiplyScalar(speed * dt);
        moveWithCollision(player, move.x, move.z, 0.55);
        bobPhase += dt * (wantRun ? 13 : 8);

        stepTimer -= dt;
        if (stepTimer <= 0) {
            playFootstep(wantRun);
            stepTimer = wantRun ? 0.3 : 0.48;
        }
    }

    // 배터리
    if (flashOn) {
        battery = Math.max(0, battery - 1.15 * dt);
        if (battery <= 0) { flashOn = false; spot.visible = false; showToast('🔋 배터리가 방전되었습니다...'); }
    }

    // 카메라
    const bob = moving ? Math.sin(bobPhase) * 0.055 : 0;
    camera.position.set(player.x, 1.68 + bob, player.z);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // 노트 줍기
    for (let i = notesArr.length - 1; i >= 0; i--) {
        const n = notesArr[i];
        n.rotation.z += dt * 0.6;
        n.position.y = 0.9 + Math.sin(elapsed * 2 + i) * 0.08;
        if (n.position.distanceTo(camera.position) < 1.6) {
            scene.remove(n);
            notesArr.splice(i, 1);
            notes++;
            notesCountEl.textContent = notes;
            playPickup();
            showToast(`📜 ${n.userData.msg}`);
            if (notes === 5) {
                doorUnlocked = true;
                exitDoorMat.color.set(0x22cc55);
                exitDoor.userData.light.color.set(0x22ff66);
                playUnlock();
                setTimeout(() => showToast('🚪 탈출문이 열렸습니다! 맞은편 구석으로!'), 4400);
            }
        }
    }

    // 배터리 줍기
    for (let i = batteriesArr.length - 1; i >= 0; i--) {
        const b = batteriesArr[i];
        b.rotation.y += dt * 2;
        if (b.position.distanceTo(camera.position) < 1.4) {
            scene.remove(b);
            batteriesArr.splice(i, 1);
            battery = Math.min(100, battery + 45);
            playPickup();
            showToast('🔋 배터리를 주웠습니다 (+45)');
        }
    }

    // 탈출 체크
    if (doorUnlocked && exitDoor.position.distanceTo(camera.position) < 2.4) winGame();
}

function updateMonster(dt) {
    if (!monster) return;
    const m = monster.group;
    const mp = m.position;
    const dist = Math.hypot(player.x - mp.x, player.z - mp.z);
    const los = hasLOS(mp.x, mp.z, player.x, player.z);

    // 감지 판정
    let sensed = false;
    if (los && dist < (flashOn ? 24 : 13)) sensed = true;                 // 시야
    if (keys['ShiftLeft'] && dist < 20 && elapsed > 3) sensed = true;     // 달리는 소리
    if (dist < 4.5) sensed = true;                                        // 너무 가까움

    const chasing = sensed || (lostTimer > 0 && dist < 30);
    if (sensed) {
        lostTimer = 5;
        lastKnown = { x: player.x, z: player.z };
        if (!stingPlayed) { playSting(); stingPlayed = true; }
    } else {
        stingPlayed = false;
        if (lostTimer > 0) lostTimer -= dt;
    }

    // 경로 재계산
    pathTimer -= dt;
    if (pathTimer <= 0) {
        pathTimer = chasing ? 0.45 : 1.2;
        let target;
        if (chasing && lastKnown) {
            target = [tileOf(lastKnown.x), tileOf(lastKnown.z)];
        } else if (!monsterPath.length) {
            const t = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            target = t;
        }
        if (target) {
            monsterPath = bfsPath(tileOf(mp.x), tileOf(mp.z), target[0], target[1]);
        }
    }

    // 이동
    const spd = (chasing ? monsterChaseSpeed : monsterRoamSpeed) * dt;
    if (monsterPath.length) {
        const wp = monsterPath[0];
        const dx = wp.x - mp.x, dz = wp.z - mp.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) {
            monsterPath.shift();
        } else {
            moveWithCollision(mp, dx / d * spd, dz / d * spd, 0.5);
            m.rotation.y = Math.atan2(dx, dz);
        }
    } else if (chasing && lastKnown) {
        // 경로 없으면 직진 시도
        const dx = lastKnown.x - mp.x, dz = lastKnown.z - mp.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.1) {
            moveWithCollision(mp, dx / d * spd, dz / d * spd, 0.5);
            m.rotation.y = Math.atan2(dx, dz);
        }
    }

    // 워킹 애니메이션
    monster.phase += dt * (chasing ? 11 : 5);
    monster.body.position.y = 1.35 + Math.sin(monster.phase) * 0.07;
    m.rotation.z = Math.sin(monster.phase * 0.5) * 0.04;

    // 포획
    if (dist < 1.7) catchPlayer();

    // 심장박동 & 위험 비네트
    const danger = Math.max(0, (26 - dist) / 26);
    dangerDiv.style.opacity = chasing ? (0.25 + danger * 0.75) : danger * 0.4;
    hbTimer -= dt;
    if (hbTimer <= 0) {
        const rate = danger * 1.9 + (chasing ? 0.8 : 0.1);
        if (rate > 0.12) playHeartbeat();
        hbTimer = 1 / Math.max(0.25, rate);
    }
}

function updateRamp(dt) {
    // 시간이 지날수록 괴물이 빨라짐
    rampTimer += dt;
    if (rampTimer >= 40) {
        rampTimer = 0;
        monsterChaseSpeed = Math.min(5.2, monsterChaseSpeed + 0.22);
        monsterRoamSpeed = Math.min(3.0, monsterRoamSpeed + 0.12);
        showToast('...발소리가 가까워지는 것 같다.');
    }
    whisperTimer -= dt;
    if (whisperTimer <= 0) {
        whisperTimer = 16 + Math.random() * 18;
        playWhisper();
    }
}

function updateHUD() {
    batteryBar.style.width = battery + '%';
    batteryBar.classList.toggle('low', battery < 25);
    staminaBar.style.width = stamina + '%';
    staminaBar.classList.toggle('low', stamina < 30);
}

// ============================================
//  메인 루프
// ============================================
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock ? clock.getDelta() : 0, 0.05);

    if (running && !paused && !gameOver && !won) {
        elapsed += dt;
        updatePlayer(dt);
        updateMonster(dt);
        updateRamp(dt);
        updateHUD();
    }

    renderer.render(scene, camera);
}

// THREE 로드 확인
if (typeof THREE === 'undefined') {
    overlaySub.textContent = '인터넷 연결 후 새로고침해주세요 (Three.js 로드 실패)';
    startBtn.style.display = 'none';
} else {
    init();
}
