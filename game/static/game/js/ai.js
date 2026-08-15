class GameAI {
    static getBestMove(grid, rows, cols, player, difficulty, players) {
        const legalMoves = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].player === null || grid[r][c].player.id === player.id) {
                    legalMoves.push({ r, c });
                }
            }
        }

        if (legalMoves.length === 0) return null;

        // EASY: 75% random, 25% greedy
        if (difficulty === 'easy') {
            if (Math.random() < 0.75) {
                return legalMoves[Math.floor(Math.random() * legalMoves.length)];
            }
        }

        // MEDIUM & HARD: Heuristic Evaluation
        let bestScore = -Infinity;
        let bestMoves = [];

        for (let move of legalMoves) {
            let score = this.evaluateMove(grid, rows, cols, move.r, move.c, player, difficulty);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    static evaluateMove(grid, rows, cols, r, c, player, difficulty) {
        const cell = grid[r][c];
        let score = 0;

        // 1. Positional value
        if (cell.critical === 2) score += 20; // Corner
        else if (cell.critical === 3) score += 10; // Edge
        else score += 5; // Center

        // 2. Chain readiness
        if (cell.count === cell.critical - 1) {
            score += 15;
        }

        const neighbors = this.getNeighbors(rows, cols, r, c);

        // 3. Danger evaluation
        for (let n of neighbors) {
            const neighborCell = grid[n.r][n.c];
            if (neighborCell.player && neighborCell.player.id !== player.id) {
                if (neighborCell.count === neighborCell.critical - 1) {
                    score -= 40; // Adjacent to dangerous enemy bomb
                }
            }
        }

        // 4. Capture potential
        if (cell.count === cell.critical - 1) {
            for (let n of neighbors) {
                const neighborCell = grid[n.r][n.c];
                if (neighborCell.player && neighborCell.player.id !== player.id) {
                    score += 25 * neighborCell.count;
                }
            }
        }

        // HARD MODE: Depth Lookahead penalty
        if (difficulty === 'hard') {
            if (cell.critical === 2 && cell.count === 0) score += 10;
        }

        return score;
    }

    static getNeighbors(rows, cols, r, c) {
        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const neighbors = [];
        for (let [dr, dc] of deltas) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                neighbors.push({ r: nr, c: nc });
            }
        }
        return neighbors;
    }
}