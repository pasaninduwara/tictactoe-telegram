window.GameState = {
    playerId: null,
    lobby: null,
    playerSymbol: null,
    
    init() {
        this.playerId = localStorage.getItem('ttt_player_id') || 'u_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('ttt_player_id', this.playerId);
        console.log("GameState Ready: " + this.playerId);
    },

    startLobbyPolling(lobbyId) {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            try {
                const lobby = await window.API.getLobby(lobbyId);
                if (lobby && lobby.status === 'playing') {
                    clearInterval(this.pollTimer);
                    // FORCE TRANSITION
                    window.GameController.enterGame(lobby);
                }
            } catch (e) { console.log("Polling..."); }
        }, 2000);
    }
};
window.GameState.init();
