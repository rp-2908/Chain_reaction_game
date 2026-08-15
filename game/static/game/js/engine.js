const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLOR_PALETTE = [
    { id: 1, name: 'Red', color: '#ff3366' },
    { id: 2, name: 'Green', color: '#00ff88' },
    { id: 3, name: 'Blue', color: '#00e5ff' },
    { id: 4, name: 'Yellow', color: '#ffe600' },
    { id: 5, name: 'Purple', color: '#b026ff' },
    { id: 6, name: 'Orange', color: '#ff7700' },
    { id: 7, name: 'White', color: '#f8fafc' },
    { id: 8, name: 'Pink', color: '#ff00aa' }
];

const ROWS = 9;
const COLS = 6;
let CELL_W = 70;
let CELL_H = 70;

let players = [];
let activePlayerIndex = 0;
let grid = [];
let isProcessing = false;
let totalTurns = 0;
let particles = [];
let projectiles = [];
let orbRotationAngle = 0;
let isLoopRunning = false;

// Setup & Start Game
function startNewGame() {
    const playerCount = parseInt(document.getElementById('player-count-select').value);
    const difficulty = document.getElementById('ai-difficulty').value;
    
    players = [];
    for (let i = 0; i < playerCount; i++) {
        const typeSelect = document.getElementById(`player-type-${i}`);
        players.push({
            ...COLOR_PALETTE[i],
            isAi: typeSelect ? typeSelect.value === 'ai' : false,
            difficulty: difficulty
        });
    }

    // Set fixed explicit canvas dimensions
    canvas.width = 420;
    canvas.height = 630;
    CELL_W = canvas.width / COLS;
    CELL_H = canvas.height / ROWS;

    initGrid();
    activePlayerIndex = 0;
    totalTurns = 0;
    particles = [];
    projectiles = [];
    isProcessing = false;

    // Show canvas & HUD, hide lobby
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
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            let critical = 4;
            if ((r === 0 || r === ROWS - 1) && (c === 0 || c === COLS - 1)) critical = 2;
            else if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) critical = 3;
            row.push({ count: 0, player: null, critical: critical });
        }
        grid.push(row);
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
    if (current.isAi) return;

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

        // Spawn particles and projectiles
        for (let item of unstableCells) {
            const { r, c, player, critical } = item;
            grid[r][c].count -= critical;
            if (grid[r][c].count === 0) grid[r][c].player = null;

            const cx = c * CELL_W + CELL_W / 2;
            const cy = r * CELL_H + CELL_H / 2;

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
                }));
            }
        }

        // Await projectile flight animations
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
        alert(`🏆 ${alive[0].name} (${alive[0].isAi ? 'CPU' : 'Player'}) Wins!`);
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

    // Draw Grid lines with visible neon styling
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL_H);
        ctx.lineTo(canvas.width, r * CELL_H);
        ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL_W, 0);
        ctx.lineTo(c * CELL_W, canvas.height);
        ctx.stroke();
    }

    // Global base tick increment
    orbRotationAngle += 0.045;

    // Draw Orbs with Dynamic Speeds
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = grid[r] ? grid[r][c] : null;
            if (cell && cell.count > 0 && cell.player) {
                // Calculate speed based on cell critical limit and orb count
                let cellAngle = 0;

                if (cell.count === 1) {
                    cellAngle = 0; // Still (no rotation)
                } else if (cell.critical === 3) {
                    // Edge cell: 2 orbs rotate at full normal speed
                    cellAngle = orbRotationAngle; 
                } else if (cell.critical === 4) {
                    // Center cell: 2 orbs rotate slow (half speed), 3 orbs rotate at normal speed
                    if (cell.count === 2) {
                        cellAngle = orbRotationAngle * 0.45; // Slow rotation
                    } else {
                        cellAngle = orbRotationAngle;        // Normal fast rotation
                    }
                } else {
                    cellAngle = orbRotationAngle;
                }

                drawOrbs(r, c, cell.count, cell.player.color, cellAngle);
            }
        }
    }

    // Update & Draw Particles
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(ctx); });

    // Update & Draw Projectiles
    projectiles = projectiles.filter(pr => !pr.update());
    projectiles.forEach(pr => pr.draw(ctx));

    requestAnimationFrame(render);
}

function drawOrbs(r, c, count, color, angle) {
    const cx = c * CELL_W + CELL_W / 2;
    const cy = r * CELL_H + CELL_H / 2;
    const radius = 11;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    if (count === 1) {
        // Single orb is completely static
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (count === 2) {
        const offset = 9;
        const x1 = cx + Math.cos(angle) * offset;
        const y1 = cy + Math.sin(angle) * offset;
        const x2 = cx - Math.cos(angle) * offset;
        const y2 = cy - Math.sin(angle) * offset;

        ctx.beginPath();
        ctx.arc(x1, y1, radius - 1, 0, Math.PI * 2);
        ctx.arc(x2, y2, radius - 1, 0, Math.PI * 2);
        ctx.fill();
    } else if (count >= 3) {
        const offset = 10;
        for (let i = 0; i < 3; i++) {
            const orbAngle = angle + (i * Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(orbAngle) * offset, cy + Math.sin(orbAngle) * offset, radius - 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}