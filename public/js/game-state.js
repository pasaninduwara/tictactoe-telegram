/**
 * Game State Manager - Crash-Proof Version
 */
window.GameState = {
    playerId: null,
    lobby: null,
    game: null,
    playerSymbol: null,
    timers: {},

    init() {
        console.log("GameState: Initializing...");
        try {
            // Ensure we have a Player ID
            let id = localStorage.getItem('ttt_player_id');
            if (!id) {
                id = 'u_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('ttt_player_id', id);
            }
            this.playerId = id;
            console.log("GameState: Player ID is", this.playerId);
        } catch (e) {
            console.error("GameState Init Error:", e);
            this.playerId = 'guest_' + Date.now(); // Emergency fallback
        }
    },

    async createLobby() {
        try {
            if (!window.API) throw new Error("API module missing");
            const lobby = await window.API.createLobby(this.playerId);
            this.lobby = lobby;
            this.playerSymbol = 'X';
            return lobby;
        } catch (e) {
            console.error("Create Lobby Error:", e);
            alert("Connection error. Is the server running?");
            throw e;
        }
    },

    async joinLobby(code) {
        try {
            if (!window.API) throw new Error("API module missing");
            const lobby = await window.API.joinLobby(code, this.playerId);
            this.lobby = lobby;
            this.playerSymbol = 'O';
            return lobby;
        } catch (e) {
            console.error("Join Lobby Error:", e);
            throw e;
        }
    },

    startLobbyPolling(lobbyId) {
        this.stopPolling('lobby');
        console.log("GameState: Starting Lobby Poll for", lobbyId);
        
        this.timers.lobby = setInterval(async () => {
            try {
                if (!window.API || !window.API.getLobby) return;
                
                const lobby = await window.API.getLobby(lobbyId);
                if (lobby && lobby.status === 'playing') {
                    console.log("GameState: Status changed to PLAYING");
                    this.stopPolling('lobby');
                    
                    // Trigger the UI change
                    if (window.GameController && window.GameController.enterGame) {
                        window.GameController.enterGame(lobby);
                    } else {
                        console.error("GameController not ready to enter game!");
                    }
                }
            } catch (e) {
                console.warn("Lobby Polling Heartbeat Error (Normal during deploy):", e);
            }
        }, 2000);
    },

    stopPolling(name) {
        if (this.timers[name]) {
            clearInterval(this.timers[name]);
            delete this.timers[name];
        }
    }
};

// Auto-run init immediately
window.GameState.init();
