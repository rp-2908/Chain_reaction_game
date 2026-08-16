const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLOR_PALETTE = [
    { id: 1, name: 'Captain Crimson', color: '#ff3366', light: '#ff99b3', dark: '#66001a', symbol: '☠️' },
    { id: 2, name: 'Siren Emerald',   color: '#006442', light: '#99ffd6', dark: '#006644', symbol: '⚓' },
    { id: 3, name: 'Corsair Gold',    color: '#ffcc00', light: '#ffea80', dark: '#665200', symbol: '⚔️' },
    { id: 4, name: 'Abyssal Kraken',  color: '#aa00ff', light: '#dd80ff', dark: '#440066', symbol: '🐙' },
    { id: 5, name: 'Navigator Azure', color: '#00bfff', light: '#99e6ff', dark: '#004c66', symbol: '🧭' },
    { id: 6, name: 'Powder Orange',   color: '#ff6600', light: '#ffb380', dark: '#662900', symbol: '💣' },
    { id: 7, name: 'Ghost Silver',    color: '#e0e6ed', light: '#ffffff', dark: '#5a6268', symbol: '🗡️' },
    { id: 8, name: 'Shadow Black',    color: '#553377', light: '#9966cc', dark: '#221133', symbol: '📜' }
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
let isLoopRunning = false;

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
    } else if (preset == 'open') {
        ROWS = 8;
        COLS = 20;
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
    sounds.init();
    const playerCount = parseInt(document.getElementById('player-count-select').value);
    const difficulty = document.getElementById('ai-difficulty').value;
    
    players = [];
    for (let i = 0; i < playerCount; i++) {
        const typeSelect = document.getElementById(`player-type-${i}`);
        players.push({
            ...COLOR_PALETTE[i],
            isAi: typeSelect ? typeSelect.value === 'ai' : (i > 0),
            difficulty: difficulty,
            isAlive: true
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
    document.getElementById('current-player-name').innerText = `${p.symbol} ${p.name}'s Turn ${p.isAi ? '(AI)' : ''}`;
    const dot = document.getElementById('current-player-dot');
    dot.style.backgroundColor = p.color;
    dot.style.color = p.color;
}

// User Interaction
canvas.addEventListener('click', (e) => {
    sounds.init();
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

    // sounds.playPlace(1); // (Muted per request)

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

        // sounds.playExplode(combo++); // (Muted per request)

        for (let item of unstableCells) {
            const { r, c, player, critical } = item;
            grid[r][c].count -= critical;
            if (grid[r][c].count === 0) grid[r][c].player = null;

            const cx = c * CELL_W + CELL_W / 2;
            const cy = r * CELL_H + CELL_H / 2;

            shockwaves.push(new Shockwave(cx, cy, player.color));
            gridFlashes[r][c] = 1.0;

            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(cx, cy, player.color));
            }

            const neighbors = GameAI.getNeighbors(ROWS, COLS, r, c);
            for (let n of neighbors) {
                const targetX = n.c * CELL_W + CELL_W / 2;
                const targetY = n.r * CELL_H + CELL_H / 2;
                
                projectiles.push(new Projectile(cx, cy, targetX, targetY, player.color, () => {
                    grid[n.r][n.c].count += 1;
                    grid[n.r][n.c].player = player;
                    triggerCellCollision(n.r, n.c, player.color);
                }));
            }
        }

        // Wait for all flying projectiles to land
        while (projectiles.length > 0) {
            await new Promise(res => setTimeout(res, 25));
        }

        if (checkWinner()) return;

        // Transition Pause: Smooth cascade pacing
        await new Promise(res => setTimeout(res, 260));
    }

    // Turn handover transition pause
    await new Promise(res => setTimeout(res, 150));
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
        alert(`🔮 VICTORY: ${alive[0].symbol} ${alive[0].name} (${alive[0].isAi ? 'CPU' : 'Player'}) Wins!`);
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
        await new Promise(res => setTimeout(res, 750));
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
                ctx.fillStyle = `rgba(16, 185, 129, ${gridFlashes[r][c] * 0.8})`;
                ctx.fillRect(x, y, CELL_W, CELL_H);
                gridFlashes[r][c] -= 0.05; 
            }

            ctx.strokeStyle = 'rgba(52, 211, 153, 0.18)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x, y, CELL_W, CELL_H);
        }
    }

    // 2. Render Orbs with Default Floating Levitation + Insignias
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

// Default Floating Levitation + Insignia Renderer
function drawDynamicOrb(r, c, count, player, critical, baseRadius) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;

    // Helper: Draw 3D glossy sphere with glowing pirate insignia
    const renderSphere = (ox, oy, radius) => {
        ctx.save();
        ctx.shadowColor = player.color;
        ctx.shadowBlur = radius * 1.1;

        // 1. Base Marble Gradient
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

        // 2. Translucent Inner Border Ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(ox, oy, radius - 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Pirate Insignia Overlay
        if (player.symbol) {
            ctx.font = `${Math.floor(radius * 1.1)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 3;
            ctx.fillText(player.symbol, ox, oy + 1);
        }

        ctx.restore();
    };

    // Default Floating Levitation Motion
    const hoverOffset = baseRadius * 0.85;
    const time = Date.now() * 0.003;

    if (count === 1) {
        const hoverY = Math.sin(time + (r + c)) * 3.0;
        renderSphere(cx, cy + hoverY, baseRadius);
    } else if (count === 2) {
        const h1 = Math.sin(time + r) * 3.0;
        const h2 = Math.cos(time + c) * 3.0;
        renderSphere(cx - hoverOffset, cy + h1, baseRadius * 0.95);
        renderSphere(cx + hoverOffset, cy + h2, baseRadius * 0.95);
    } else if (count >= 3) {
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
            const h = Math.sin(time + i) * 3.0;
            renderSphere(cx + Math.cos(angle) * hoverOffset, cy + Math.sin(angle) * hoverOffset + h, baseRadius * 0.9);
        }
    }
}

// Default Shockwave Ring Impact Effect
function triggerCellCollision(r, c, color) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;

    shockwaves.push(new Shockwave(cx, cy, color));
    gridFlashes[r][c] = 0.35;

    for (let i = 0; i < 6; i++) {
        particles.push(new Particle(cx, cy, color));
    }
}