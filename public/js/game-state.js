/**
 * Game State Manager - RIDMA MOBILE Unified Version
 */
window.GameState = {
    playerId: null,
    lobby: null,
    playerSymbol: null,
    pollTimer: null,

    init() {
        // Ensure a persistent ID exists
        let id = localStorage.getItem('ttt_player_id');
        if (!id) {
            id = 'u' + Math.random().toString(36).substr(2, 7);
            localStorage.setItem('ttt_player_id', id);
        }
        this.playerId = id;
        console.log("GameState: Player ready - " + id);
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
        
        console.log("GameState: Polling for game start...");
        this.pollTimer = setInterval(async () => {
            try {
                const lobby = await window.API.getLobby(lobbyId);
                
                if (lobby && lobby.status === 'playing') {
                    console.log("GameState: Match found! Starting UI...");
                    clearInterval(this.pollTimer);
                    
                    // FORCE TRANSITION FOR JOINING PLAYER
                    if (window.Screens) window.Screens.show('game-screen');
                    
                    if (window.GameBoard) {
                        const boardDiv = document.getElementById('game-board');
                        window.GameBoard.init(boardDiv, (r, c) => {
                            this.makeMove(r, c);
                        });
                        window.GameBoard.render(lobby.board || []);
                    }
                }
            } catch (e) { console.log("Waiting for host..."); }
        }, 1500);
    },

    async makeMove(r, c) {
        if (!this.lobby) return;
        try {
            await window.API.makeMove(this.lobby.id, this.playerId, r, c);
        } catch (e) { console.error("Move failed", e); }
    }
};

window.GameState.init();
