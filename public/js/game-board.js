/**
 * Game Board - RIDMA MOBILE FINAL
 */
window.GameBoard = {
    container: null,
    
    init(container, onClick) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = 'repeat(6, 1fr)';

        for (let i = 0; i < 36; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const r = Math.floor(i / 6);
            const c = i % 6;
            cell.onclick = () => onClick(r, c);
            this.container.appendChild(cell);
        }
    },

    render(boardData) {
        if (!boardData) return;
        const cells = this.container.querySelectorAll('.cell');
        const flatBoard = boardData.flat();
        cells.forEach((cell, i) => {
            cell.textContent = flatBoard[i] || '';
            if (flatBoard[i]) cell.classList.add(flatBoard[i].toLowerCase());
        });
    }
};
