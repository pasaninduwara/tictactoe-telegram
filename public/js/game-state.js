/**
 * Game State Manager - RIDMA MOBILE EDITION
 * This version is designed to wait for all other scripts to load.
 */

const GameState = {
    playerId: null,
    lobby: null,
    game: null,
    playerSymbol: null,
    timers: {},

    init() {
        console.log("GameState: Initializing...");
        // Handle Player ID
        let id = localStorage.getItem('ttt_player_id');
        if (!id) {
            id = 'u_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ttt_player_id', id);
        }
        this.playerId = id;
    },

    async createLobby() {
        if (!window.API) return console.error("API not loaded");
        const lobby = await window.API.createLobby(this.playerId);
        this.lobby = lobby;
        this.playerSymbol = 'X';
        return lobby;
    },

    async joinLobby(code) {
        if (!window.API) return console.error("API not loaded");
        const lobby = await window.API.joinLobby(code, this.playerId);
        this.lobby = lobby;
        this.playerSymbol = 'O';
        return lobby;
    },

    startLobbyPolling(lobbyId) {
        this.stopPolling('lobby');
        console.log("GameState: Polling Lobby", lobbyId);

        this.timers.lobby = setInterval(async () => {
            try {
                if (!window.API) return;
                const lobby = await window.API.getLobby(lobbyId);
                
                // If the game has started in the database...
                if (lobby && lobby.status === 'playing') {
                    console.log("GameState: Status is PLAYING. Transitioning...");
                    this.stopPolling('lobby');
                    
                    // SAFE CALL: Check if GameController exists before calling
                    if (window.GameController && typeof window.GameController.enterGame === 'function') {
                        window.GameController.enterGame(lobby);
                    } else {
                        // If it's not ready yet, try again in 500ms
                        console.warn("GameController not ready, retrying...");
                    }
                }
            } catch (e) {
                console.log("Polling...");
            }
