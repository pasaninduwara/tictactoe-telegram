/**
 * Game State Manager
 * Manages all application state
 */

const GameState = {
    // Current user data
    user: null,
    
    // Current lobby data
    lobby: null,
    
    // Current game data
    game: null,
    
    // Player symbol in current game ('X' or 'O')
    playerSymbol: null,
    
    // Subscription status
    subscriptionChecked: false,
    isSubscribed: true,
    requiredChannel: null,
    
    // Polling timers
    lobbyPollingTimer: null,
    gamePollingTimer: null,
    
    // Event listeners
    listeners: new Map(),
    
    /**
     * Initialize game state
     */
    init() {
        this.loadFromStorage();
    },
    
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            if (userData) {
                this.user = JSON.parse(userData);
            }
            
            const lastLobby = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_LOBBY);
            if (lastLobby) {
                this.lobby = JSON.parse(lastLobby);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    },
    
    /**
     * Save state to localStorage
     */
    saveToStorage() {
        try {
            if (this.user) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.user));
            }
            if (this.lobby) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LOBBY, JSON.stringify(this.lobby));
            }
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    },
    
    /**
     * Clear all state
     */
    clear() {
        this.user = null;
        this.lobby = null;
        this.game = null;
        this.playerSymbol = null;
        this.stopPolling();
        
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_LOBBY);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_DATA);
    },
    
    // ==========================================
    // User State
    // ==========================================
    
    /**
     * Set current user
     * @param {Object} user - User data
     */
    setUser(user) {
        this.user = user;
        this.saveToStorage();
        this.emit('userChanged', user);
    },
    
    /**
     * Update user data
     * @param {Object} updates - Fields to update
     */
    updateUser(updates) {
        this.user = { ...this.user, ...updates };
        this.saveToStorage();
        this.emit('userChanged', this.user);
    },
    
    /**
     * Get current user ID
     * @returns {number|null}
     */
    getUserId() {
        return this.user?.id || null;
    },
    
    // ==========================================
    // Lobby State
    // ==========================================
    
    /**
     * Set current lobby
     * @param {Object} lobby - Lobby data
     */
    setLobby(lobby) {
        this.lobby = lobby;
        this.saveToStorage();
        this.emit('lobbyChanged', lobby);
    },
    
    /**
     * Clear lobby state
     */
    clearLobby() {
        this.lobby = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_LOBBY);
        this.emit('lobbyChanged', null);
    },
    
    /**
     * Check if user is lobby host
     * @returns {boolean}
     */
    isLobbyHost() {
        return this.lobby?.hostUserId === this.getUserId();
    },
    
    // ==========================================
    // Game State
    // ==========================================
    
    /**
     * Set current game
     * @param {Object} game - Game data
     */
    setGame(game) {
        this.game = game;
        
        // Determine player symbol
        if (game) {
            this.playerSymbol = game.playerXId === this.getUserId() ? 'X' : 'O';
        } else {
            this.playerSymbol = null;
        }
        
        this.emit('gameChanged', game);
    },
    
    /**
     * Update game board
     * @param {Array} board - New board state
     */
    updateBoard(board) {
        if (this.game) {
            this.game.board = board;
            this.emit('boardChanged', board);
        }
    },
    
    /**
     * Check if it's current player's turn
     * @returns {boolean}
     */
    isMyTurn() {
        return this.game?.currentTurn === this.playerSymbol;
    },
    
    /**
     * Get opponent's name
     * @returns {string}
     */
    getOpponentName() {
        if (!this.game) return 'Opponent';
        
        if (this.playerSymbol === 'X') {
            return this.game.playerOName || 'Opponent';
        }
        return this.game.playerXName || 'Opponent';
    },
    
    /**
     * Get opponent's score
     * @returns {number}
     */
    getOpponentScore() {
        if (!this.game) return 0;
        
        const scores = this.game.scores || { X: 0, O: 0 };
        if (this.playerSymbol === 'X') {
            return scores.O;
        }
        return scores.X;
    },
    
    /**
     * Get current player's score
     * @returns {number}
     */
    getMyScore() {
        if (!this.game) return 0;
        
        const scores = this.game.scores || { X: 0, O: 0 };
        if (this.playerSymbol === 'X') {
            return scores.X;
        }
        return scores.O;
    },
    
    // ==========================================
    // Polling
    // ==========================================
    
    /**
     * Start polling for lobby updates
     * @param {Function} callback - Callback function
     */
    startLobbyPolling(callback) {
        this.stopLobbyPolling();
        
        const poll = async () => {
            if (!this.lobby?.lobbyCode) return;
            
            try {
                const response = await API.getLobby(this.lobby.lobbyCode);
                if (response.success) {
                    this.setLobby(response.lobby);
                    callback(response.lobby);
                }
            } catch (error) {
                console.error('Lobby polling error:', error);
            }
        };
        
        // Initial poll
        poll();
        
        // Start interval
        this.lobbyPollingTimer = setInterval(poll, CONFIG.POLLING_INTERVAL);
    },
    
    /**
     * Stop lobby polling
     */
    stopLobbyPolling() {
        if (this.lobbyPollingTimer) {
            clearInterval(this.lobbyPollingTimer);
            this.lobbyPollingTimer = null;
        }
    },
    
    /**
     * Start polling for game updates
     * @param {Function} callback - Callback function
     */
    startGamePolling(callback) {
        this.stopGamePolling();
        
        const poll = async () => {
            if (!this.game?.id) return;
            
            try {
                const response = await API.getGame(this.game.id);
                if (response.success) {
                    this.setGame(response.game);
                    callback(response.game);
                }
            } catch (error) {
                console.error('Game polling error:', error);
            }
        };
        
        // Initial poll
        poll();
        
        // Start interval
        this.gamePollingTimer = setInterval(poll, CONFIG.POLLING_INTERVAL);
    },
    
    /**
     * Stop game polling
     */
    stopGamePolling() {
        if (this.gamePollingTimer) {
            clearInterval(this.gamePollingTimer);
            this.gamePollingTimer = null;
        }
    },
    
    /**
     * Stop all polling
     */
    stopPolling() {
        this.stopLobbyPolling();
        this.stopGamePolling();
    },
    
    // ==========================================
    // Event System
    // ==========================================
    
    /**
     * Subscribe to state changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        return () => this.off(event, callback);
    },
    
    /**
     * Unsubscribe from state changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    },
    
    /**
     * Emit a state change event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
};

// Initialize on load
GameState.init();

// Make GameState globally available
window.GameState = GameState;