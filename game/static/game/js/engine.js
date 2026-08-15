const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLOR_PALETTE = [
    { id: 1, name: 'Crimson Flame', color: '#ff2a5f', light: '#ff94b1', dark: '#500014' },
    { id: 2, name: 'Emerald Poison', color: '#00f576', light: '#99ffd1', dark: '#004720' },
    { id: 3, name: 'Arcane Frost', color: '#00d4ff', light: '#b3f3ff', dark: '#003a4d' },
    { id: 4, name: 'Solar Flare', color: '#ffd000', light: '#fff099', dark: '#4d3e00' },
    { id: 5, name: 'Void Nether', color: '#c026d3', light: '#f0abfc', dark: '#3b0764' },
    { id: 6, name: 'Abyssal Lava', color: '#ff6600', light: '#ffc299', dark: '#4d1f00' },
    { id: 7, name: 'Spectral Soul', color: '#e0e7ff', light: '#ffffff', dark: '#312e81' },
    { id: 8, name: 'Shadow Curse', color: '#f43f5e', light: '#fda4af', dark: '#4c0519' }
];

let ROWS = 9;
let COLS = 6;
let CELL_W = 0;
let CELL_H = 0;

let players = [];
let activePlayerIndex = 0;
let grid = [];
let isProcessing = false;
let totalTurns = 0;
let particles = [];
let projectiles = [];
let shockwaves = [];
let gridFlashes = [];
let orbRotationAngle = 0;
let isLoopRunning = false;
let selectedBehavior = 'breathing';
let selectedShape = 'sphere';
let selectedCollisionStyle = 'ripple';

// Compute Grid Orientation & Dimension Constraints
function configureGridDimensions() {
    const preset = document.getElementById('grid-size-select').value;
    const isDesktopLandscape = window.innerWidth > window.innerHeight;

    if (preset === 'small') {
        if (isDesktopLandscape) { ROWS = 4; COLS = 6; }
        else { ROWS = 6; COLS = 4; }
    } else if (preset === 'large') {
        if (isDesktopLandscape) { ROWS = 8; COLS = 12; }
        else { ROWS = 12; COLS = 8; }
    } else if (preset === 'square') {
        ROWS = 8; 
        COLS = 8;
    } else if (preset === 'titan') {
        ROWS = 16; 
        COLS = 16;
    } else {
        // Auto / Standard
        if (isDesktopLandscape) {
            ROWS = 6;
            COLS = 9;
        } else {
            ROWS = 9;
            COLS = 6;
        }
    }
}

function resizeGameCanvas() {
    const aspect = COLS / ROWS;
    
    // Reserve ~140px for HUD + top/bottom screen breathing room
    const maxAvailableHeight = window.innerHeight - 140;
    const maxAvailableWidth = window.innerWidth - 40;

    let targetHeight = maxAvailableHeight;
    let targetWidth = targetHeight * aspect;

    if (targetWidth > maxAvailableWidth) {
        targetWidth = maxAvailableWidth;
        targetHeight = targetWidth / aspect;
    }

    canvas.width = Math.floor(targetWidth);
    canvas.height = Math.floor(targetHeight);

    // Lock HUD width to match canvas exactly
    const hud = document.getElementById('hud');
    if (hud) {
        hud.style.width = `${canvas.width}px`;
    }

    CELL_W = canvas.width / COLS;
    CELL_H = canvas.height / ROWS;
}

// Setup & Start Game
function startNewGame() {
    const playerCount = parseInt(document.getElementById('player-count-select').value);
    const difficulty = document.getElementById('ai-difficulty').value;
    selectedBehavior = document.getElementById('orb-behavior-select').value;
    selectedShape = document.getElementById('orb-shape-select').value;
    selectedCollisionStyle = document.getElementById('collision-style-select').value;
    
    players = [];
    for (let i = 0; i < playerCount; i++) {
        const typeSelect = document.getElementById(`player-type-${i}`);
        players.push({
            ...COLOR_PALETTE[i],
            isAi: typeSelect ? typeSelect.value === 'ai' : (i > 0),
            difficulty: difficulty
        });
    }

    configureGridDimensions();
    resizeGameCanvas();
    initGrid();

    activePlayerIndex = 0;
    totalTurns = 0;
    particles = [];
    projectiles = [];
    shockwaves = [];
    isProcessing = false;

    document.getElementById('lobby-modal').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    canvas.style.display = 'block';

    updateHUD();

    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(render);
    }

    triggerAiIfNeeded();
}

function initGrid() {
    grid = [];
    gridFlashes = [];
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        let flashRow = [];
        for (let c = 0; c < COLS; c++) {
            let critical = 4;
            const isTopOrBottom = (r === 0 || r === ROWS - 1);
            const isLeftOrRight = (c === 0 || c === COLS - 1);

            if (isTopOrBottom && isLeftOrRight) critical = 2; // Corner
            else if (isTopOrBottom || isLeftOrRight) critical = 3; // Edge

            row.push({ count: 0, player: null, critical: critical });
            flashRow.push(0);
        }
        grid.push(row);
        gridFlashes.push(flashRow);
    }
}

function updateHUD() {
    const p = players[activePlayerIndex];
    if (!p) return;
    document.getElementById('current-player-name').innerText = `${p.name}'s Turn ${p.isAi ? '(AI)' : ''}`;
    const dot = document.getElementById('current-player-dot');
    dot.style.backgroundColor = p.color;
    dot.style.color = p.color;
}

// User Interaction
canvas.addEventListener('click', (e) => {
    if (isProcessing) return;
    const current = players[activePlayerIndex];
    if (current && current.isAi) return;

    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / CELL_W);
    const r = Math.floor((e.clientY - rect.top) / CELL_H);

    makeMove(r, c);
});

async function makeMove(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = grid[r][c];
    const current = players[activePlayerIndex];

    if (cell.player !== null && cell.player.id !== current.id) return;

    cell.count += 1;
    cell.player = current;
    gridFlashes[r][c] = 0.8;
    totalTurns++;
    sounds.playPlace(1);

    await processChainReaction();
    nextTurn();
}

async function processChainReaction() {
    isProcessing = true;
    let combo = 1;

    while (true) {
        let unstableCells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c].count >= grid[r][c].critical) {
                    unstableCells.push({ r, c, player: grid[r][c].player, critical: grid[r][c].critical });
                }
            }
        }

        if (unstableCells.length === 0) break;

        sounds.playExplode(combo++);

        for (let item of unstableCells) {
            const { r, c, player, critical } = item;
            grid[r][c].count -= critical;
            if (grid[r][c].count === 0) grid[r][c].player = null;

            const cx = c * CELL_W + CELL_W / 2;
            const cy = r * CELL_H + CELL_H / 2;

            shockwaves.push(new Shockwave(cx, cy, player.color));
            gridFlashes[r][c] = 1.0;

            for (let i = 0; i < 12; i++) {
                particles.push(new Particle(cx, cy, player.color));
            }

            const neighbors = GameAI.getNeighbors(ROWS, COLS, r, c);
            for (let n of neighbors) {
                const targetX = n.c * CELL_W + CELL_W / 2;
                const targetY = n.r * CELL_H + CELL_H / 2;
                
                projectiles.push(new Projectile(cx, cy, targetX, targetY, player.color, () => {
                    grid[n.r][n.c].count += 1;
                    grid[n.r][n.c].player = player;
                    
                    // Trigger custom collision effect
                    triggerCellCollision(n.r, n.c, player.color);
                }));
            }
        }

        while (projectiles.length > 0) {
            await new Promise(res => setTimeout(res, 16));
        }

        if (checkWinner()) return;
        await new Promise(res => setTimeout(res, 60));
    }

    isProcessing = false;
}

function nextTurn() {
    if (checkWinner()) return;

    do {
        activePlayerIndex = (activePlayerIndex + 1) % players.length;
    } while (totalTurns >= players.length && !isPlayerAlive(players[activePlayerIndex]));

    updateHUD();
    triggerAiIfNeeded();
}

function isPlayerAlive(player) {
    if (totalTurns < players.length) return true;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c].player && grid[r][c].player.id === player.id) return true;
        }
    }
    return false;
}

function checkWinner() {
    if (totalTurns < players.length) return false;

    const alive = players.filter(p => isPlayerAlive(p));
    if (alive.length === 1) {
        sounds.playWin();
        alert(`🔮 VICTORY: ${alive[0].name} (${alive[0].isAi ? 'CPU' : 'Player'}) Wins!`);
        document.getElementById('lobby-modal').style.display = 'block';
        document.getElementById('hud').style.display = 'none';
        canvas.style.display = 'none';
        isProcessing = false;
        return true;
    }
    return false;
}

async function triggerAiIfNeeded() {
    const current = players[activePlayerIndex];
    if (current && current.isAi && !isProcessing) {
        isProcessing = true;
        await new Promise(res => setTimeout(res, 450));
        const move = GameAI.getBestMove(grid, ROWS, COLS, current, current.difficulty, players);
        isProcessing = false;
        if (move) makeMove(move.r, move.c);
    }
}

// 60FPS Render Loop
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grid Lines and Flash Ripples
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL_W;
            const y = r * CELL_H;

            if (gridFlashes[r] && gridFlashes[r][c] > 0) {
                ctx.fillStyle = `rgba(16, 185, 129, ${gridFlashes[r][c] * 0.25})`;
                ctx.fillRect(x, y, CELL_W, CELL_H);
                gridFlashes[r][c] -= 0.025;
            }

            ctx.strokeStyle = 'rgba(52, 211, 153, 0.18)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x, y, CELL_W, CELL_H);
        }
    }

    orbRotationAngle += 0.045;

    // 2. Render Orbs with User-Selected Behavior
    const baseRadius = Math.min(CELL_W, CELL_H) * 0.22;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = grid[r] ? grid[r][c] : null;
            if (cell && cell.count > 0 && cell.player) {
                drawDynamicOrb(r, c, cell.count, cell.player, cell.critical, baseRadius);
            }
        }
    }

    // 3. Shockwaves
    shockwaves = shockwaves.filter(s => s.alpha > 0);
    shockwaves.forEach(s => { s.update(); s.draw(ctx); });

    // 4. Sparks
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(ctx); });

    // 5. Projectiles
    projectiles = projectiles.filter(pr => !pr.update());
    projectiles.forEach(pr => pr.draw(ctx));

    requestAnimationFrame(render);
}

// Breathing Resonance Renderer
function drawBreathingMarbles(r, c, count, player, baseRadius, breathe) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;
    const radius = Math.max(4, baseRadius + breathe);

    const renderSingleSphere = (ox, oy, currentRadius) => {
        ctx.save();
        ctx.shadowColor = player.color;
        ctx.shadowBlur = currentRadius * 1.2;

        const grad = ctx.createRadialGradient(
            ox - currentRadius * 0.35, 
            oy - currentRadius * 0.35, 
            currentRadius * 0.1, 
            ox, 
            oy, 
            currentRadius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, player.light || player.color);
        grad.addColorStop(0.7, player.color);
        grad.addColorStop(1, player.dark || '#000000');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(ox, oy, currentRadius - 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    };

    if (count === 1) {
        // Single orb pulses gently in center
        renderSingleSphere(cx, cy, radius);
    } else if (count === 2) {
        // Two orbs expand and contract symmetrically
        const offset = baseRadius * 0.85;
        renderSingleSphere(cx - offset, cy, radius * 0.95);
        renderSingleSphere(cx + offset, cy, radius * 0.95);
    } else if (count >= 3) {
        // Three orbs in tight triangular resonance
        const offset = baseRadius * 0.9;
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
            const ox = cx + Math.cos(angle) * offset;
            const oy = cy + Math.sin(angle) * offset;
            renderSingleSphere(ox, oy, radius * 0.9);
        }
    }
}

// Universal Multi-Behavior Renderer
function drawDynamicOrb(r, c, count, player, critical, baseRadius) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;
    const isNearCritical = count >= critical - 1;

    // Multi-Shape Geometry Dispatcher
    const renderSphere = (ox, oy, radius) => {
        ctx.save();
        ctx.shadowColor = player.color;
        ctx.shadowBlur = radius * 1.2;

        if (selectedShape === 'crystal') {
            // Faceted Hexagonal Crystal Gem
            ctx.fillStyle = player.color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI / 3) + Math.PI / 6;
                const px = ox + Math.cos(a) * radius;
                const py = oy + Math.sin(a) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Inner bevel facet highlight
            ctx.strokeStyle = player.light || '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Center facet shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(ox, oy, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (selectedShape === 'diamond') {
            // 4-Point Arcane Diamond Prism
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.moveTo(ox, oy - radius * 1.15);
            ctx.lineTo(ox + radius * 0.85, oy);
            ctx.lineTo(ox, oy + radius * 1.15);
            ctx.lineTo(ox - radius * 0.85, oy);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } 
        else if (selectedShape === 'plasma') {
            // Bio-Plasma Radial Glow Core
            const pGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius * 1.2);
            pGrad.addColorStop(0, '#ffffff');
            pGrad.addColorStop(0.3, player.light || player.color);
            pGrad.addColorStop(0.75, player.color);
            pGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(ox, oy, radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (selectedShape === 'ring_core') {
            // Planetary Sphere with Tilted Halo Ring
            const grad = ctx.createRadialGradient(ox - radius * 0.3, oy - radius * 0.3, radius * 0.1, ox, oy, radius * 0.8);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, player.light || player.color);
            grad.addColorStop(0.75, player.color);
            grad.addColorStop(1, player.dark || '#000000');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ox, oy, radius * 0.75, 0, Math.PI * 2);
            ctx.fill();

            // Outer Ring
            ctx.strokeStyle = player.light || '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(ox, oy, radius * 1.35, radius * 0.45, Math.PI / 4, 0, Math.PI * 2);
            ctx.stroke();
        } 
        else {
            // Default: 3D Glossy Marble Sphere
            const grad = ctx.createRadialGradient(
                ox - radius * 0.35,
                oy - radius * 0.35,
                radius * 0.1,
                ox,
                oy,
                radius
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.25, player.light || player.color);
            grad.addColorStop(0.7, player.color);
            grad.addColorStop(1, player.dark || '#000000');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ox, oy, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(ox, oy, radius - 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    };

    // --- BEHAVIOR 1: Super-Mass Fusion (Merges into 1 Mega-Orb) ---
    if (selectedBehavior === 'liquid_fuse') {
        const growth = 1 + (count - 1) * 0.35;
        const fusePulse = Math.sin(Date.now() * 0.003) * 1.2;
        renderSphere(cx, cy, baseRadius * growth + fusePulse);
        return;
    }

    // --- BEHAVIOR 2: Floating Levitation (Vertical 3D Hover) ---
    if (selectedBehavior === 'levitate') {
        const hoverOffset = baseRadius * 0.85;
        if (count === 1) {
            const hoverY = Math.sin(Date.now() * 0.003 + (r + c)) * 2.5;
            renderSphere(cx, cy + hoverY, baseRadius);
        } else if (count === 2) {
            const h1 = Math.sin(Date.now() * 0.003 + r) * 2.5;
            const h2 = Math.cos(Date.now() * 0.003 + c) * 2.5;
            renderSphere(cx - hoverOffset, cy + h1, baseRadius * 0.95);
            renderSphere(cx + hoverOffset, cy + h2, baseRadius * 0.95);
        } else if (count >= 3) {
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
                const h = Math.sin(Date.now() * 0.0035 + i) * 2.5;
                renderSphere(cx + Math.cos(angle) * hoverOffset, cy + Math.sin(angle) * hoverOffset + h, baseRadius * 0.9);
            }
        }
        return;
    }

    // --- BEHAVIOR 3: Unstable Overcharge (Jitter/Vibration at Near-Critical) ---
    if (selectedBehavior === 'critical_jitter') {
        let jx = 0, jy = 0;
        if (isNearCritical) {
            jx = (Math.random() - 0.5) * 2.5;
            jy = (Math.random() - 0.5) * 2.5;
        }
        const offset = baseRadius * 0.85;
        if (count === 1) {
            renderSphere(cx + jx, cy + jy, baseRadius);
        } else if (count === 2) {
            renderSphere(cx - offset + jx, cy + jy, baseRadius * 0.95);
            renderSphere(cx + offset + jx, cy + jy, baseRadius * 0.95);
        } else if (count >= 3) {
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
                renderSphere(cx + Math.cos(angle) * offset + jx, cy + Math.sin(angle) * offset + jy, baseRadius * 0.9);
            }
        }
        return;
    }

    // --- BEHAVIOR 4: Orbital Vortex (Classic Dynamic Rotation) ---
    if (selectedBehavior === 'vortex') {
        let speedMultiplier = isNearCritical ? 1.8 : 0.8;
        let rotAngle = orbRotationAngle * speedMultiplier;
        const offset = baseRadius * 0.85;

        if (count === 1) {
            renderSphere(cx, cy, baseRadius);
        } else if (count === 2) {
            renderSphere(cx + Math.cos(rotAngle) * offset, cy + Math.sin(rotAngle) * offset, baseRadius * 0.95);
            renderSphere(cx - Math.cos(rotAngle) * offset, cy - Math.sin(rotAngle) * offset, baseRadius * 0.95);
        } else if (count >= 3) {
            for (let i = 0; i < 3; i++) {
                const a = rotAngle + (i * Math.PI * 2 / 3);
                renderSphere(cx + Math.cos(a) * offset, cy + Math.sin(a) * offset, baseRadius * 0.9);
            }
        }
        return;
    }

    // --- BEHAVIOR 5: Gentle Breathing (Default) ---
    const pulseFreq = isNearCritical ? 0.005 : 0.0025;
    const pulseAmp = isNearCritical ? 1.0 : 0.5;
    const breathe = Math.sin(Date.now() * pulseFreq) * pulseAmp;
    const radius = Math.max(3, baseRadius + breathe);
    const offset = baseRadius * 0.85;

    if (count === 1) {
        renderSphere(cx, cy, radius);
    } else if (count === 2) {
        renderSphere(cx - offset, cy, radius * 0.95);
        renderSphere(cx + offset, cy, radius * 0.95);
    } else if (count >= 3) {
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
            renderSphere(cx + Math.cos(angle) * offset, cy + Math.sin(angle) * offset, radius * 0.9);
        }
    }
}

// Dynamic Impact & Collision Dispatcher
function triggerCellCollision(r, c, color) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;

    switch (selectedCollisionStyle) {
        case 'ripple':
            // Expanding sharp ring
            shockwaves.push(new Shockwave(cx, cy, color));
            gridFlashes[r][c] = 0.2;
            break;

        case 'splatter':
            // High-speed directional splash particles
            for (let i = 0; i < 8; i++) {
                particles.push(new Particle(cx, cy, color));
            }
            gridFlashes[r][c] = 0.15;
            break;

        case 'starburst':
            // 4-point expanding starburst nova
            shockwaves.push(new Shockwave(cx, cy, color));
            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(cx, cy, '#ffffff'));
            }
            gridFlashes[r][c] = 0.3;
            break;

        case 'implosion':
            // Inward converging sparks
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 20 + 15;
                const p = new Particle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, color);
                p.vx = -Math.cos(angle) * 2;
                p.vy = -Math.sin(angle) * 2;
                particles.push(p);
            }
            gridFlashes[r][c] = 0.2;
            break;

        case 'subtle_flash':
        default:
            gridFlashes[r][c] = 0.4;
            break;
    }
}