window.GameState = {
    playerId: null,
    lobby: null,
    game: null,
    playerSymbol: null,
    timers: {},

    init() {
        console.log("GameState: Initializing...");
        this.playerId = localStorage.getItem('ttt_player_id') || 'u_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('ttt_player_id', this.playerId);
    },

    async createLobby() {
        const lobby = await window.API.createLobby(this.playerId);
        this.lobby = lobby;
        this.playerSymbol = 'X';
        return lobby;
    },

    async joinLobby(code) {
        const lobby = await window.API.joinLobby(code, this.playerId);
        this.lobby = lobby;
        this.playerSymbol = 'O';
        return lobby;
    },

    startLobbyPolling(lobbyId) {
        this.stopPolling('lobby');
        this.timers.lobby = setInterval(async () => {
            try {
                const lobby = await window.API.getLobby(lobbyId);
                if (lobby && lobby.status === 'playing') {
                    this.stopPolling('lobby');
                    if (window.GameController) window.GameController.enterGame(lobby);
                }
            } catch (e) { console.error("Lobby Poll Error", e); }
        }, 2000);
    },

    stopPolling(name) {
        if (this.timers[name]) {
            clearInterval(this.timers[name]);
            delete this.timers[name];
        }
    }
};
window.GameState.init();
