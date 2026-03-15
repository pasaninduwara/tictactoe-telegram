/**
 * Game State Manager
 * Handles data synchronization and polling
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
        console.log("GameState ready.");
        // Try to load player from localStorage if Telegram isn't available
        if (!this.playerId) {
            const savedId = localStorage.getItem('ttt_player_id');
            if (savedId) {
                this.playerId = savedId;
            } else {
                this.playerId = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('ttt_player_id', this.playerId);
            }
        }
    },

    /**
     * Create a new lobby
     */
    async createLobby() {
        try {
            // Ensure API exists
            if (!window.API) throw new Error("API module not loaded");
            
            const lobby = await API.createLobby(this.playerId);
            this.lobby = lobby;
            this.playerSymbol = 'X'; 
            return lobby;
        } catch (error) {
            console.error("Lobby creation failed:", error);
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
            this.playerSymbol = 'O';
            return lobby;
        } catch (error) {
            console.error("Lobby join failed:", error);
            throw error;
        }
    },

    /**
     * Polling logic to detect when the game starts
     */
    startLobbyPolling(lobbyId, onUpdate) {
        this.stopPolling();
        
        this.lobbyPollingTimer = setInterval(async () => {
            try {
                const lobby = await API.getLobby(lobbyId);
                if (!lobby) return;

                this.lobby = lobby;

                // TRIGGER: If status is 'playing', switch screens immediately
                if (lobby.status === 'playing') {
                    console.log("MATCH STARTING...");
                    this.stopPolling();
                    
                    if (window.GameController) {
                        window.GameController.enterGame(lobby);
                    }
                }

                if (onUpdate) onUpdate(lobby);
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 2000);
    },

    /**
     * Polling logic for moves during the game
     */
    startGamePolling(onUpdate) {
        this.stopGamePolling();
        
        this.gamePollingTimer = setInterval(async () => {
            try {
                const game = await API.getGame(this.lobby.id);
                if (game) {
                    this.game = game;
                    if (onUpdate) onUpdate(game);
                }
            } catch (error) {
                console.error("Game update error:", error);
            }
        }, 1000);
    },

    async makeMove(row, col) {
        if (!this.game || this.game.currentTurn !== this.playerId) return;

        try {
            await API.makeMove(this.lobby.id, this.playerId, row, col);
        } catch (error) {
            console.error("Move failed:", error);
        }
    },

    stopPolling() {
        if (this.lobbyPollingTimer) clearInterval(this.lobbyPollingTimer);
    },

    stopGamePolling() {
        if (this.gamePollingTimer) clearInterval(this.gamePollingTimer);
    }
};

// Global assignment
window.GameState = GameState;

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GameState.init());
} else {
    GameState.init();
}
