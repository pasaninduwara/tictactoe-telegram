window.GameBoard = {
    element: null,
    size: 6,

    init() {
        this.element = document.getElementById('game-board');
        if (!this.element) {
            console.error("Board container not found!");
            return;
        }
        this.createGrid();
    },

    createGrid() {
        this.element.innerHTML = '';
        this.element.style.display = 'grid';
        this.element.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            const row = Math.floor(i / this.size);
            const col = i % this.size;
            
            cell.onclick = () => this.handleMove(row, col);
            this.element.appendChild(cell);
        }
    },

    render(boardData) {
        if (!boardData) return;
        const flatBoard = boardData.flat();
        const cells = this.element.querySelectorAll('.cell');
        cells.forEach((cell, i) => {
            cell.textContent = flatBoard[i] || '';
            cell.className = `cell ${flatBoard[i] ? flatBoard[i].toLowerCase() : ''}`;
        });
    },

    handleMove(r, c) {
        if (window.GameState) window.GameState.makeMove(r, c);
    }
};
