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
    size: 6,
    
    /**
     * Initialize the game board
     * @param {number} size - Optional board size (defaults to 6)
     */
    init(size = 6) {
        this.size = size;
        this.boardElement = document.getElementById('game-board');
        
        if (!this.boardElement) {
            console.error("Game board container (#game-board) not found in HTML");
            return;
        }

        this.disabled = false;
        this.createBoard();
    },
    
    /**
     * Create the 6x6 board grid
     */
    createBoard() {
        this.boardElement.innerHTML = '';
        this.cells = [];
        
        // Use CSS Grid for layout
        this.boardElement.style.display = 'grid';
        this.boardElement.style.columns = `repeat(${this.size}, 1fr)`;
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
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
     */
    handleCellClick(row, col) {
        if (this.disabled) return;
        
        // Call the move function in GameState
        if (window.GameState && typeof window.GameState.makeMove === 'function') {
            window.GameState.makeMove(row, col);
        }
    },
    
    /**
     * Render the board state
     * @param {Array} boardData - 2D array representing the board
     */
    render(boardData) {
        if (!boardData) return;
        this.board = boardData;
        
        const flatBoard = boardData.flat();
        this.cells.forEach((cell, index) => {
            const value = flatBoard[index];
            const content = cell.querySelector('.cell-content');
            
            cell.classList.remove('x', 'o');
            if (value) {
                cell.classList.add(value.toLowerCase());
                content.textContent = value;
            } else {
                content.textContent = '';
            }
        });
    },

    /**
     * Disable board interactions
     */
    disable() {
        this.disabled = true;
        if (this.boardElement) {
            this.boardElement.classList.add('disabled');
        }
    },

    /**
     * Enable board interactions
     */
    enable() {
        this.disabled = false;
        if (this.boardElement) {
            this.boardElement.classList.remove('disabled');
        }
    }
};

// Make GameBoard globally available
window.GameBoard = GameBoard;
