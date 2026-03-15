window.Screens = {
    show(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
        
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';
    }
};

window.GameController = {
    enterGame(lobby) {
        window.Screens.show('game-screen');
        if (window.GameBoard) {
            window.GameBoard.init();
            window.GameBoard.render(lobby.board);
        }
    }
};
