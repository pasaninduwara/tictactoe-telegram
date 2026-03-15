/**
 * Game Board Module
 * Handles the 6x6 game board rendering and interactions
 */

const GameBoard = {
    boardElement: null,
    cells: [],
    board: null,
    disabled: false,
    onCellClick: null,
    
    /**
     * Initialize the game board
     * @param {HTMLElement} container - Container element for the board
     * @param {Function} onCellClick - Callback when cell is clicked
     */
    init(container, onCellClick) {
        this.boardElement = container;
        this.onCellClick = onCellClick;
        this.createBoard();
    },
    
    /**
     * Create the 6x6 board grid
     */
    createBoard() {
        this.boardElement.innerHTML = '';
        this.cells = [];
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const content = document.createElement('span');
                content.className = 'cell-content';
                cell.appendChild(content);
                
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                
                this.boardElement.appendChild(cell);
                this.cells.push(cell);
            }
        }
    },
    
    /**
     * Handle cell click
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    handleCellClick(row, col) {
        if (this.disabled) return;
        if (this.board && this.board[row][col] !== null) return;
        
        Utils.haptic('selection');
        
        if (this.onCellClick) {
            this.onCellClick(row, col);
        }
    },
    
    /**
     * Render the board state
     * @param {Array} board - 6x6 array of 'X', 'O', or null
     */
    render(board) {
        this.board = board;
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const index = row * CONFIG.BOARD_SIZE + col;
                const cell = this.cells[index];
                const content = cell.querySelector('.cell-content');
                const value = board[row][col];
                
                // Clear previous state
                cell.classList.remove('occupied', 'winning', 'last-move');
                
                if (value) {
                    content.textContent = value;
                    content.classList.remove('X', 'O');
                    content.classList.add(value);
                    cell.classList.add('occupied');
                } else {
                    content.textContent = '';
                    content.classList.remove('X', 'O');
                }
            }
        }
    },
    
    /**
     * Update a single cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} value - 'X', 'O', or null
     */
    updateCell(row, col, value) {
        const index = row * CONFIG.BOARD_SIZE + col;
        const cell = this.cells[index];
        const content = cell.querySelector('.cell-content');
        
        // Remove last-move from all cells
        this.cells.forEach(c => c.classList.remove('last-move'));
        
        if (value) {
            content.textContent = value;
            content.classList.remove('X', 'O');
            content.classList.add(value);
            cell.classList.add('occupied', 'last-move');
            
            Utils.haptic('impact');
        } else {
            content.textContent = '';
            content.classList.remove('X', 'O');
            cell.classList.remove('occupied');
        }
    },
    
    /**
     * Highlight winning cells
     * @param {Array} winningCells - Array of {row, col} objects
     */
    highlightWinning(winningCells) {
        winningCells.forEach(({ row, col }) => {
            const index = row * CONFIG.BOARD_SIZE + col;
            this.cells[index].classList.add('winning');
        });
    },
    
    /**
     * Clear winning highlights
     */
    clearWinningHighlight() {
        this.cells.forEach(cell => cell.classList.remove('winning'));
    },
    
    /**
     * Enable board interaction
     */
    enable() {
        this.disabled = false;
        this.cells.forEach(cell => cell.classList.remove('disabled'));
    },
    
    /**
     * Disable board interaction
     */
    disable() {
        this.disabled = true;
        this.cells.forEach(cell => cell.classList.add('disabled'));
    },
    
    /**
     * Reset the board
     */
    reset() {
        this.board = null;
        this.disabled = false;
        
        this.cells.forEach(cell => {
            cell.classList.remove('occupied', 'winning', 'last-move', 'disabled');
            const content = cell.querySelector('.cell-content');
            content.textContent = '';
            content.classList.remove('X', 'O');
        });
    },
    
    /**
     * Show temporary move preview
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} symbol - 'X' or 'O'
     */
    showPreview(row, col, symbol) {
        const index = row * CONFIG.BOARD_SIZE + col;
        const cell = this.cells[index];
        
        if (!cell.classList.contains('occupied')) {
            const content = cell.querySelector('.cell-content');
            content.textContent = symbol;
            content.style.opacity = '0.3';
        }
    },
    
    /**
     * Clear move preview
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    clearPreview(row, col) {
        const index = row * CONFIG.BOARD_SIZE + col;
        const cell = this.cells[index];
        
        if (!cell.classList.contains('occupied')) {
            const content = cell.querySelector('.cell-content');
            content.textContent = '';
            content.style.opacity = '';
        }
    },
    
    /**
     * Animate score update
     * @param {string} player - 'X' or 'O'
     */
    animateScoreUpdate(player) {
        const scoreElement = document.getElementById(`score-${player.toLowerCase()}`);
        if (scoreElement) {
            scoreElement.classList.add('score-updated');
            setTimeout(() => scoreElement.classList.remove('score-updated'), 500);
        }
    }
};

/**
 * Score Calculator
 * Calculates lines of 3 and scores (client-side for immediate feedback)
 */
const ScoreCalculator = {
    /**
     * Count lines of exactly 3 consecutive squares
     * @param {Array} board - 6x6 board array
     * @param {string} player - 'X' or 'O'
     * @returns {number} Number of lines
     */
    countLinesOfThree(board, player) {
        let lineCount = 0;
        const counted = new Set();
        
        // Direction vectors: horizontal, vertical, diagonal down-right, diagonal down-left
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal down-right
            [1, -1]   // diagonal down-left
        ];
        
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                if (board[row][col] !== player) continue;
                
                for (const [dr, dc] of directions) {
                    const lineKey = this.getLineKey(board, row, col, dr, dc, player);
                    
                    if (lineKey && !counted.has(lineKey)) {
                        if (this.isExactlyThree(board, row, col, dr, dc, player)) {
                            counted.add(lineKey);
                            lineCount++;
                        }
                    }
                }
            }
        }
        
        return lineCount;
    },
    
    /**
     * Generate a unique key for a line
     */
    getLineKey(board, startRow, startCol, dr, dc, player) {
        const positions = [];
        
        for (let i = 0; i < 3; i++) {
            const r = startRow + i * dr;
            const c = startCol + i * dc;
            
            if (r < 0 || r >= 6 || c < 0 || c >= 6 || board[r][c] !== player) {
                return null;
            }
            
            positions.push(`${r},${c}`);
        }
        
        positions.sort();
        return positions.join('|');
    },
    
    /**
     * Check if there's exactly 3 consecutive pieces (not 4+)
     */
    isExactlyThree(board, startRow, startCol, dr, dc, player) {
        // Check all 3 positions exist and have player's piece
        for (let i = 0; i < 3; i++) {
            const r = startRow + i * dr;
            const c = startCol + i * dc;
            
            if (r < 0 || r >= 6 || c < 0 || c >= 6 || board[r][c] !== player) {
                return false;
            }
        }
        
        // Check that position before the line is NOT player's piece
        const beforeR = startRow - dr;
        const beforeC = startCol - dc;
        const hasBefore = beforeR >= 0 && beforeR < 6 && beforeC >= 0 && beforeC < 6 && board[beforeR][beforeC] === player;
        
        // Check that position after the line is NOT player's piece
        const afterR = startRow + 3 * dr;
        const afterC = startCol + 3 * dc;
        const hasAfter = afterR >= 0 && afterR < 6 && afterC >= 0 && afterC < 6 && board[afterR][afterC] === player;
        
        return !hasBefore && !hasAfter;
    },
    
    /**
     * Calculate scores for both players
     * @param {Array} board - 6x6 board array
     * @returns {Object} { X: number, O: number }
     */
    calculateScores(board) {
        const xLines = this.countLinesOfThree(board, 'X');
        const oLines = this.countLinesOfThree(board, 'O');
        
        return {
            X: xLines * CONFIG.POINTS_PER_LINE,
            O: oLines * CONFIG.POINTS_PER_LINE,
            xLines,
            oLines
        };
    },
    
    /**
     * Check if board is full
     * @param {Array} board - 6x6 board array
     * @returns {boolean}
     */
    isBoardFull(board) {
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                if (board[row][col] === null) {
                    return false;
                }
            }
        }
        return true;
    }
};

// Make modules globally available
window.GameBoard = GameBoard;
window.ScoreCalculator = ScoreCalculator;