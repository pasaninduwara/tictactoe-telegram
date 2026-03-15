window.Screens = {
    show(id) {
        // 1. Hide the loader immediately
        const loader = document.getElementById('loading-screen');
        if (loader) loader.style.display = 'none';

        // 2. Switch Screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active');
            console.log("Screens: Switched to " + id);
        }
    }
};

window.GameController = {
    init() {
        const playBtn = document.getElementById('play-btn');
        if (playBtn) playBtn.onclick = () => window.Screens.show('play-mode-screen');
    }
};

window.LobbyController = {
    init() {
        const createBtn = document.getElementById('create-lobby-btn');
        if (createBtn) createBtn.onclick = async () => {
            const lobby = await window.GameState.createLobby();
            window.Screens.show('lobby-room-screen');
            document.getElementById('room-lobby-code').textContent = lobby.code;
            window.GameState.startLobbyPolling(lobby.id);
        };
    }
};
