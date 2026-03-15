/**
 * API Client
 * Handles all communication with the backend
 */

const API = {
    /**
     * Make an HTTP request
     * @param {string} endpoint - API endpoint (without /api prefix)
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>}
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}/api${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        // Add Telegram init data if available
        if (window.Telegram?.WebApp?.initData) {
            defaultHeaders['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        // Add body if present
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new APIError(data.error || 'Request failed', response.status, data);
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408);
            }
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(error.message || 'Network error', 0);
        }
    },

    // ==========================================
    // Authentication
    // ==========================================

    /**
     * Validate Telegram WebApp authentication
     * @param {string} initData - Telegram init data
     * @returns {Promise<Object>}
     */
    async validateAuth(initData) {
        return this.request('/auth/validate', {
            method: 'POST',
            body: { initData }
        });
    },

    /**
     * Check channel subscription status
     * @param {number} userId - Telegram user ID
     * @returns {Promise<Object>}
     */
    async checkSubscription(userId) {
        return this.request('/auth/check-subscription', {
            method: 'POST',
            body: { userId }
        });
    },

    /**
     * Get channel info
     * @returns {Promise<Object>}
     */
    async getChannelInfo() {
        return this.request('/auth/channel-info');
    },

    // ==========================================
    // Lobby
    // ==========================================

    /**
     * Create a new lobby
     * @param {Object} data - Lobby data
     * @returns {Promise<Object>}
     */
    async createLobby(data) {
        return this.request('/lobby/create', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Join a lobby
     * @param {string} lobbyCode - Lobby code
     * @param {Object} userData - User data
     * @returns {Promise<Object>}
     */
    async joinLobby(lobbyCode, userData) {
        return this.request('/lobby/join', {
            method: 'POST',
            body: { lobbyCode, ...userData }
        });
    },

    /**
     * Get lobby information
     * @param {string} lobbyCode - Lobby code
     * @returns {Promise<Object>}
     */
    async getLobby(lobbyCode) {
        return this.request(`/lobby/${lobbyCode}`);
    },

    /**
     * Start a game from lobby
     * @param {string} lobbyCode - Lobby code
     * @param {number} hostUserId - Host user ID
     * @returns {Promise<Object>}
     */
    async startGame(lobbyCode, hostUserId) {
        return this.request(`/lobby/${lobbyCode}/start`, {
            method: 'POST',
            body: { hostUserId }
        });
    },

    /**
     * Leave a lobby
     * @param {string} lobbyCode - Lobby code
     * @param {number} userId - User ID
     * @returns {Promise<Object>}
     */
    async leaveLobby(lobbyCode, userId) {
        return this.request(`/lobby/${lobbyCode}/leave`, {
            method: 'POST',
            body: { userId }
        });
    },

    /**
     * Get public lobbies
     * @param {number} limit - Max lobbies to return
     * @returns {Promise<Object>}
     */
    async getPublicLobbies(limit = 20) {
        return this.request(`/lobby/public/list?limit=${limit}`);
    },

    // ==========================================
    // Game
    // ==========================================

    /**
     * Get game state
     * @param {string} gameId - Game ID
     * @returns {Promise<Object>}
     */
    async getGame(gameId) {
        return this.request(`/game/${gameId}`);
    },

    /**
     * Make a move in a game
     * @param {string} gameId - Game ID
     * @param {number} userId - User ID
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {Promise<Object>}
     */
    async makeMove(gameId, userId, row, col) {
        return this.request(`/game/${gameId}/move`, {
            method: 'POST',
            body: { userId, row, col }
        });
    },

    /**
     * Forfeit a game
     * @param {string} gameId - Game ID
     * @param {number} userId - User ID
     * @returns {Promise<Object>}
     */
    async forfeitGame(gameId, userId) {
        return this.request(`/game/${gameId}/forfeit`, {
            method: 'POST',
            body: { userId }
        });
    },

    // ==========================================
    // Leaderboard
    // ==========================================

    /**
     * Get leaderboard
     * @param {string} period - Time period
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>}
     */
    async getLeaderboard(period = 'all', page = 1, limit = 20) {
        return this.request(`/leaderboard?period=${period}&page=${page}&limit=${limit}`);
    },

    /**
     * Get user's rank
     * @param {number} userId - User ID
     * @param {string} period - Time period
     * @returns {Promise<Object>}
     */
    async getUserRank(userId, period = 'all') {
        return this.request(`/leaderboard/user/${userId}?period=${period}`);
    },

    /**
     * Get top players
     * @param {number} count - Number of players
     * @returns {Promise<Object>}
     */
    async getTopPlayers(count = 10) {
        return this.request(`/leaderboard/top/${count}`);
    },

    // ==========================================
    // User
    // ==========================================

    /**
     * Get user profile
     * @param {number} userId - Telegram user ID
     * @returns {Promise<Object>}
     */
    async getUser(userId) {
        return this.request(`/user/${userId}`);
    },

    /**
     * Update user profile
     * @param {number} userId - Telegram user ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>}
     */
    async updateUser(userId, data) {
        return this.request(`/user/${userId}`, {
            method: 'PUT',
            body: data
        });
    },

    /**
     * Get user game history
     * @param {number} userId - User ID
     * @param {number} limit - Max games to return
     * @returns {Promise<Object>}
     */
    async getUserHistory(userId, limit = 10) {
        return this.request(`/user/${userId}/history?limit=${limit}`);
    },

    /**
     * Get user statistics
     * @param {number} userId - User ID
     * @returns {Promise<Object>}
     */
    async getUserStats(userId) {
        return this.request(`/user/${userId}/stats`);
    },

    /**
     * Sync user data
     * @param {Object} telegramUser - Telegram user object
     * @returns {Promise<Object>}
     */
    async syncUser(telegramUser) {
        return this.request('/user/sync', {
            method: 'POST',
            body: { telegramUser }
        });
    }
};

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Make API globally available
window.API = API;
window.APIError = APIError;