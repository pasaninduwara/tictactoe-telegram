/**
 * Screen Manager
 * Handles navigation between different screens
 */

const Screens = {
    currentScreen: null,
    previousScreen: null,
    
    /**
     * Initialize screen manager
     */
    init() {
        // Set up back button handlers
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => this.goBack());
        });
        
        // Set up period tabs for leaderboard
        document.querySelectorAll('.period-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handlePeriodTabClick(e));
        });
    },
    
    /**
     * Show a screen by ID
     * @param {string} screenId - Screen element ID
     * @param {boolean} addToHistory - Add to navigation history
     */
    show(screenId, addToHistory = true) {
        const screen = document.getElementById(screenId);
        if (!screen) {
            console.error(`Screen not found: ${screenId}`);
            return;
        }
        
        // Store previous screen for back navigation
        if (addToHistory && this.currentScreen) {
            this.previousScreen = this.currentScreen;
        }
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });
        
        // Show target screen
        screen.classList.add('active');
        this.currentScreen = screenId;
        
        // Handle Telegram back button visibility
        if (window.Telegram && window.Telegram.WebApp) {
            if (screenId === 'menu-screen') {
                window.Telegram.WebApp.BackButton.hide();
            } else {
                window.Telegram.WebApp.BackButton.show();
            }
        }
    },

    /**
     * Navigate to previous screen
     */
    goBack() {
        if (this.previousScreen) {
            this.show(this.previousScreen, false);
            this.previousScreen = null;
        } else {
            this.show('menu-screen', false);
        }
    },

    handlePeriodTabClick(e) {
        const tabs = document.querySelectorAll('.period-tab');
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const period = e.target.getAttribute('data-period');
        LeaderboardController.load(period);
    }
};

/**
 * Lobby Controller
 * Handles lobby creation, joining, and waiting room logic
 */
const LobbyController = {
    init() {
        // Setup listeners for lobby actions
        const createBtn = document.getElementById('create-lobby-btn');
        if (createBtn) createBtn.addEventListener('click', () => this.createLobby());

        const joinBtn = document.getElementById('join-by-code-btn');
        if (joinBtn) joinBtn.addEventListener('click', () => this.joinLobby());
    },

    async createLobby() {
        try {
            const lobby = await GameState.createLobby();
            this.showLobbyWaiting(lobby);
            this.startLobbyPolling(lobby.id);
        } catch (error) {
            console.error("Lobby creation failed", error);
        }
    },

    showLobbyWaiting(lobby) {
        Screens.show('lobby-room-screen');
        document.getElementById('room-lobby-code').textContent = lobby.code;
        // Update player slots...
    },

    startLobbyPolling(lobbyId) {
        GameState.startLobbyPolling(lobbyId, (lobby) => {
            if (lobby.status === 'playing') {
                GameState.stopPolling();
                GameController.enterGame(lobby);
            }
        });
    }
};

/**
 * Game Controller
 * Manages the active game session and UI updates
 */
const GameController = {
    init() {
        // Initialize game board and local listeners
    },

    /**
     * Transition into the game screen and initialize the board
     * @param {Object} game - The active game data
     */
    enterGame(game) {
        Screens.show('game-screen');
        
        // Force board initialization for both players
        if (window.GameBoard) {
            window.GameBoard.init(6); // 6x6 grid
            window.GameBoard.render(game.board);
        }
        
        this.startPolling();
    },

    startPolling() {
        GameState.startGamePolling((game) => {
            if (window.GameBoard) {
                window.GameBoard.render(game.board);
            }
            this.updateTurnIndicator(game);
            
            if (game.status === 'completed' || game.status === 'forfeited') {
                GameState.stopPolling();
                setTimeout(() => this.showGameOver(game), 1000);
            }
        });
    },

    updateTurnIndicator(game) {
        const indicator = document.getElementById('turn-indicator');
        const turnText = document.querySelector('.turn-text');
        const isMyTurn = game.currentTurn === GameState.playerId;
        
        if (indicator) {
            turnText.textContent = isMyTurn ? "Your Turn" : "Opponent's Turn";
            indicator.className = isMyTurn ? "turn-indicator my-turn" : "turn-indicator opponent-turn";
        }
    },

    showGameOver(game) {
        Screens.show('game-over-screen');
        const resultText = document.getElementById('result-text');
        if (game.winnerId === GameState.playerId) {
            resultText.textContent = "Victory!";
        } else if (game.winnerId) {
            resultText.textContent = "Defeat";
        } else {
            resultText.textContent = "It's a Draw!";
        }
    }
};

// Initialize all controllers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Screens.init();
    if (window.MenuController) window.MenuController.init();
    LobbyController.init();
    GameController.init();
});

// Make controllers globally available
window.Screens = Screens;
window.LobbyController = LobbyController;
window.GameController = GameController;
