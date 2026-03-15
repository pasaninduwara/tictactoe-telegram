/**
 * Game State Manager - RIDMA MOBILE FINAL
 */
const GameState = {
    playerId: null,
    lobby: null,
    playerSymbol: null,
    pollTimer: null,

    init() {
        // Ensure Player ID is set immediately
        this.playerId = localStorage.getItem('ttt_player_id') || 'u' + Math.random().toString(36).substr(2, 7);
        localStorage.setItem('ttt_player_id', this.playerId);
        console.log("GameState: Ready");
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
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            try {
                const lobby = await window.API.getLobby(lobbyId);
                if (lobby && lobby.status === 'playing') {
                    clearInterval(this.pollTimer);
                    // FORCE THE TRANSITION
                    window.Screens.show('game-screen');
                    if (window.GameBoard) {
                        window.GameBoard.init(document.getElementById('game-board'), (r, c) => {
                            this.makeMove(r, c);
                        });
                        window.GameBoard.render(lobby.board);
                    }
                }
            } catch (e) { console.log("Syncing..."); }
        }, 1500);
    },

    async makeMove(r, c) {
        if (!this.lobby) return;
        await window.API.makeMove(this.lobby.id, this.playerId, r, c);
    }
};

window.GameState = GameState;
GameState.init();
