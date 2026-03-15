/**
 * Configuration
 * Central configuration for the application
 */

const CONFIG = {
    // API Base URL - will be set dynamically based on environment
    API_BASE_URL: window.location.origin,
    
    // Game Settings
    BOARD_SIZE: 6,
    POINTS_PER_LINE: 5,
    
    // Telegram
    BOT_USERNAME: 'your_bot_username', // Will be updated from backend
    
    // Timeouts (in milliseconds)
    REQUEST_TIMEOUT: 10000,
    POLLING_INTERVAL: 3000,
    LOBBY_REFRESH_INTERVAL: 5000,
    
    // Pagination
    LEADERBOARD_PAGE_SIZE: 20,
    HISTORY_PAGE_SIZE: 10,
    
    // Animation durations (in milliseconds)
    ANIMATION_FAST: 150,
    ANIMATION_NORMAL: 250,
    ANIMATION_SLOW: 400,
    
    // Storage keys
    STORAGE_KEYS: {
        USER_DATA: 'ttt_user_data',
        AUTH_DATA: 'ttt_auth_data',
        LAST_LOBBY: 'ttt_last_lobby'
    },
    
    // Default avatar URL
    DEFAULT_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMxYTFmMmUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iIzNiNTJmNiIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9Ijg1IiByeD0iMzUiIHJ5PSIyMCIgZmlsbD0iIzNiNTJmNiIvPjwvc3ZnPg=='
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);