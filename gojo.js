// Gojo Portrait Drawing
const gojoCanvas = document.getElementById('gojo-canvas');
const gojoCtx = gojoCanvas.getContext('2d');

function drawGojo() {
    const ctx = gojoCtx;
    const w = gojoCanvas.width;
    const h = gojoCanvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a2a');
    bgGrad.addColorStop(1, '#1a1a4a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Hair (white/silver)
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.ellipse(w/2, h*0.25, 55, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair spikes
    ctx.fillStyle = '#e8e8f0';
    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI - Math.PI / 2;
        const x1 = w/2 + Math.cos(angle) * 50;
        const y1 = h*0.25 + Math.sin(angle) * 55;
        const x2 = w/2 + Math.cos(angle) * 75;
        const y2 = h*0.25 + Math.sin(angle) * 80;
        ctx.beginPath();
        ctx.moveTo(x1 - 10, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1 + 10, y1);
        ctx.closePath();
        ctx.fill();
    }

    // Face
    ctx.fillStyle = '#ffe4d4';
    ctx.beginPath();
    ctx.ellipse(w/2, h*0.35, 40, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blindfold (black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(w/2 - 45, h*0.28, 90, 25);

    // Blindfold shine
    ctx.fillStyle = '#333';
    ctx.fillRect(w/2 - 40, h*0.28 + 5, 80, 5);

    // Smile
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w/2, h*0.42, 15, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#ffe4d4';
    ctx.fillRect(w/2 - 12, h*0.48, 24, 20);

    // Uniform (black high collar)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(w/2 - 50, h);
    ctx.lineTo(w/2 - 45, h*0.55);
    ctx.lineTo(w/2 + 45, h*0.55);
    ctx.lineTo(w/2 + 50, h);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(w/2 - 35, h*0.52, 70, 15);

    // Buttons
    ctx.fillStyle = '#444';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(w/2, h*0.65 + i * 25, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Infinity aura effect
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(w/2, h/2, 80 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
    }
}

drawGojo();

// Skill Demo
const demoCanvas = document.getElementById('demo-canvas');
const demoCtx = demoCanvas.getContext('2d');

let particles = [];
let skillEffects = [];
let gojoX = 100;
let gojoY = 200;

function createParticles(x, y, color, count = 20, speed = 5) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed * (0.5 + Math.random()),
            dy: Math.sin(angle) * speed * (0.5 + Math.random()),
            life: 60,
            color: color,
            size: 3 + Math.random() * 5
        });
    }
}

function castSkill(skill) {
    const centerX = demoCanvas.width / 2;
    const centerY = demoCanvas.height / 2;

    switch(skill) {
        case 'blue':
            // Blue - suction effect
            skillEffects.push({
                type: 'blue',
                x: centerX,
                y: centerY,
                life: 60,
                maxLife: 60
            });
            createParticles(centerX, centerY, '#00aaff', 30, 8);
            break;

        case 'red':
            // Red - repel effect
            skillEffects.push({
                type: 'red',
                x: centerX,
                y: centerY,
                life: 40,
                maxLife: 40
            });
            createParticles(centerX, centerY, '#ff4444', 40, 12);
            break;

        case 'purple':
            // Hollow Purple - massive beam
            skillEffects.push({
                type: 'purple',
                x: centerX,
                y: centerY,
                life: 80,
                maxLife: 80
            });
            createParticles(centerX, centerY, '#aa44ff', 60, 15);
            break;

        case 'infinity':
            // Infinity - barrier
            skillEffects.push({
                type: 'infinity',
                x: gojoX,
                y: gojoY,
                life: 120,
                maxLife: 120
            });
            break;

        case 'reverse':
            // Reversal - healing
            skillEffects.push({
                type: 'reverse',
                x: gojoX,
                y: gojoY,
                life: 60,
                maxLife: 60
            });
            createParticles(gojoX, gojoY, '#44ff88', 25, 4);
            break;
    }
}

function drawDemo() {
    const ctx = demoCtx;
    const w = demoCanvas.width;
    const h = demoCanvas.height;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Draw Gojo
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.arc(gojoX, gojoY - 20, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe4d4';
    ctx.beginPath();
    ctx.arc(gojoX, gojoY, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(gojoX - 18, gojoY - 5, 36, 10);

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(gojoX - 25, gojoY + 50);
    ctx.lineTo(gojoX - 20, gojoY + 15);
    ctx.lineTo(gojoX + 20, gojoY + 15);
    ctx.lineTo(gojoX + 25, gojoY + 50);
    ctx.closePath();
    ctx.fill();

    // Draw skill effects
    skillEffects.forEach((effect, index) => {
        const progress = 1 - effect.life / effect.maxLife;

        switch(effect.type) {
            case 'blue':
                // Suction rings
                ctx.strokeStyle = `rgba(0, 170, 255, ${1 - progress})`;
                ctx.lineWidth = 3;
                for (let i = 0; i < 5; i++) {
                    const radius = 20 + i * 30 + progress * 100;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;

            case 'red':
                // Explosion rings
                ctx.strokeStyle = `rgba(255, 68, 68, ${1 - progress})`;
                ctx.lineWidth = 4;
                for (let i = 0; i < 3; i++) {
                    const radius = 30 + i * 40 + progress * 150;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;

            case 'purple':
                // Massive beam
                const beamWidth = 30 + progress * 50;
                const grad = ctx.createLinearGradient(effect.x - beamWidth, 0, effect.x + beamWidth, 0);
                grad.addColorStop(0, 'rgba(170, 68, 255, 0)');
                grad.addColorStop(0.5, `rgba(170, 68, 255, ${1 - progress})`);
                grad.addColorStop(1, 'rgba(170, 68, 255, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(effect.x - beamWidth, 0, beamWidth * 2, h);

                // Core beam
                ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - progress * 0.8})`;
                ctx.fillRect(effect.x - 10, 0, 20, h);
                break;

            case 'infinity':
                // Barrier circles
                ctx.strokeStyle = `rgba(0, 150, 255, ${0.5 + Math.sin(progress * 10) * 0.3})`;
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, 40 + i * 15, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;

            case 'reverse':
                // Healing aura
                ctx.strokeStyle = `rgba(68, 255, 136, ${1 - progress})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 30 + progress * 50, 0, Math.PI * 2);
                ctx.stroke();

                // Cross symbol
                ctx.strokeStyle = `rgba(68, 255, 136, ${1 - progress})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(effect.x - 15, effect.y);
                ctx.lineTo(effect.x + 15, effect.y);
                ctx.moveTo(effect.x, effect.y - 15);
                ctx.lineTo(effect.x, effect.y + 15);
                ctx.stroke();
                break;
        }

        effect.life--;
        if (effect.life <= 0) {
            skillEffects.splice(index, 1);
        }
    });

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.size *= 0.97;

        ctx.globalAlpha = p.life / 60;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    ctx.globalAlpha = 1;

    // Draw target dummy
    const targetX = demoCanvas.width - 150;
    const targetY = demoCanvas.height / 2;
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(targetX - 5, targetY - 40, 10, 80);
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.arc(targetX, targetY - 50, 20, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(drawDemo);
}

drawDemo();
