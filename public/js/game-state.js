/**
 * Game State Manager
 * Synchronizes database state with the UI
 */

const GameState = {
    playerId: null,
    lobby: null,
    game: null,
    playerSymbol: null,
    lobbyPollingTimer: null,
    gamePollingTimer: null,

    /**
     * Initialize GameState
     */
    init() {
        console.log("GameState initialized.");
        // Player ID is set by App.js during setup
    },

    /**
     * Create a new lobby
     */
    async createLobby() {
        try {
            const lobby = await API.createLobby(this.playerId);
            this.lobby = lobby;
            this.playerSymbol = 'X'; // Host is always X
            return lobby;
        } catch (error) {
            console.error("Error creating lobby:", error);
            throw error;
        }
    },

    /**
     * Join an existing lobby
     */
    async joinLobby(lobbyCode) {
        try {
            const lobby = await API.joinLobby(lobbyCode, this.playerId);
            this.lobby = lobby;
            this.playerSymbol = 'O'; // Joining player is always O
            return lobby;
        } catch (error) {
            console.error("Error joining lobby:", error);
            throw error;
        }
    },

    /**
     * Monitor the lobby for the start of the game
     */
    startLobbyPolling(lobbyId, onUpdate) {
        this.stopPolling();
        console.log("Monitoring lobby status...");

        this.lobbyPollingTimer = setInterval(async () => {
            try {
                const lobby = await API.getLobby(lobbyId);
                if (!lobby) return;

                this.lobby = lobby;

                // CRITICAL FIX: If host started the game, tell the UI to switch
                if (lobby.status === 'playing') {
                    console.log("Match found! Transitioning to Game Screen...");
                    this.stopPolling();
                    
                    if (window.GameController) {
                        window.GameController.enterGame(lobby);
                    }
                }

                if (onUpdate) onUpdate(lobby);
            } catch (error) {
                console.error("Lobby polling error:", error);
            }
        }, 2000); // Check every 2 seconds
    },

    /**
     * Monitor the active game board for moves
     */
    startGamePolling(onUpdate) {
        this.stopGamePolling();
        
        this.gamePollingTimer = setInterval(async () => {
            try {
                const game = await API.getGame(this.lobby.id);
                if (!game) return;

                this.game = game;
                if (onUpdate) onUpdate(game);
            } catch (error) {
                console.error("Game polling error:", error);
            }
        }, 1500); // Faster polling during active play
    },

    /**
     * Send a move to the database
     */
    async makeMove(row, col) {
        // Check if it's actually this player's turn
        if (this.game && this.game.currentTurn !== this.playerId) {
            console.warn("It is not your turn!");
            return;
        }

        try {
            await API.makeMove(this.lobby.id, this.playerId, row, col);
        } catch (error) {
            console.error("Error making move:", error);
        }
    },

    stopPolling() {
        if (this.lobbyPollingTimer) {
            clearInterval(this.lobbyPollingTimer);
            this.lobbyPollingTimer = null;
        }
    },

    stopGamePolling() {
        if (this.gamePollingTimer) {
            clearInterval(this.gamePollingTimer);
            this.gamePollingTimer = null;
        }
    }
};

// Make GameState globally available
window.GameState = GameState;
GameState.init();
