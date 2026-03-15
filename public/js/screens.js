window.Screens = {
    show(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
        // Hide loader whenever we switch screens
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';
    }
};

window.GameController = {
    enterGame(lobby) {
        window.Screens.show('game-screen');
        if (window.GameBoard) {
            // Re-init the board to ensure it's fresh for the joining player
            window.GameBoard.init(document.getElementById('game-board'), (r, c) => {
                window.GameState.makeMove(r, c);
            });
            window.GameBoard.render(lobby.board);
        }
    }
};
