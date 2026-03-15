/**
 * Main Application Entry Point
 * Handles initialization and Telegram WebApp integration
 */

const App = {
    initialized: false,
    tg: null,
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Tic-Tac-Toe Telegram Mini App initializing...');
        
        // Get Telegram WebApp instance
        this.tg = window.Telegram?.WebApp;
        
        if (this.tg) {
            // Configure Telegram WebApp
            this.configureTelegram();
        }
        
        try {
            // Step 1: Check authentication
            const isAuthed = await this.checkAuth();
            
            if (!isAuthed) {
                this.showAuthError();
                return;
            }
            
            // Step 2: Check channel subscription (if required)
            const hasSubscription = await this.checkSubscription();
            
            if (!hasSubscription) {
                // Subscription screen will be shown by checkSubscription
                return;
            }
            
            // Step 3: Load user data
            await this.loadUserData();
            
            // Step 4: Check for start parameter (deep link)
            await this.handleStartParam();
            
            // Step 5: Show main menu
            this.initialized = true;
            MenuController.update();
            Screens.showMenu();
            
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize app. Please try again.');
        }
    },
    
    /**
     * Configure Telegram WebApp settings
     */
    configureTelegram() {
        const tg = this.tg;
        
        // Set theme
        this.applyTheme();
        
        // Enable closing confirmation
        tg.enableClosingConfirmation();
        
        // Set up main button (hidden by default)
        tg.MainButton.hide();
        
        // Set up back button
        tg.BackButton.onClick(() => {
            Screens.goBack();
        });
        
        // Handle theme changes
        tg.onEvent('themeChanged', () => {
            this.applyTheme();
        });
        
        // Handle viewport changes
        tg.onEvent('viewportChanged', () => {
            // Can be used to adjust layout if needed
        });
        
        // Expand to full height
        tg.expand();
        
        // Show the app
        tg.ready();
        
        console.log('Telegram WebApp configured:', {
            platform: tg.platform,
            version: tg.version,
            colorScheme: tg.colorScheme
        });
    },
    
    /**
     * Apply Telegram theme to the app
     */
    applyTheme() {
        if (!this.tg) return;
        
        const theme = this.tg.themeParams;
        
        // Override CSS variables with Telegram theme if available
        const root = document.documentElement;
        
        if (theme.bg_color) {
            root.style.setProperty('--bg-primary', theme.bg_color);
        }
        if (theme.secondary_bg_color) {
            root.style.setProperty('--bg-secondary', theme.secondary_bg_color);
        }
        if (theme.text_color) {
            root.style.setProperty('--text-primary', theme.text_color);
        }
        if (theme.hint_color) {
            root.style.setProperty('--text-secondary', theme.hint_color);
        }
        if (theme.link_color) {
            root.style.setProperty('--accent-gold', theme.link_color);
        }
        if (theme.button_color) {
            root.style.setProperty('--accent-purple', theme.button_color);
        }
        if (theme.button_text_color) {
            // Can be used for button text
        }
        
        // Set header color
        if (this.tg.setHeaderColor) {
            this.tg.setHeaderColor(theme.secondary_bg_color || '#111827');
        }
        
        // Set background color
        if (this.tg.setBackgroundColor) {
            this.tg.setBackgroundColor(theme.bg_color || '#0a0e1a');
        }
    },
    
    /**
     * Check Telegram authentication
     * @returns {Promise<boolean>}
     */
    async checkAuth() {
        if (!this.tg?.initData) {
            console.warn('No Telegram init data - running in standalone mode');
            // For testing outside Telegram, create mock user
            async checkAuth() {
    if (!this.tg?.initData) {
        console.warn('No Telegram init data - running in standalone mode');
        
        // Allow BOTH localhost AND your Vercel domain to use the mock user for testing
        const isTesting = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('vercel.app');

        if (isTesting) {
            return this.createMockUser();
        }
        return this.createMockUser();
    }
    // ... rest of your code
}
        
        try {
            const response = await API.validateAuth(this.tg.initData);
            
            if (response.success && response.user) {
                // Store user data
                const userData = {
                    id: response.user.id,
                    username: response.user.username,
                    firstName: response.user.firstName,
                    lastName: response.user.lastName,
                    languageCode: response.user.languageCode,
                    photoUrl: response.user.photoUrl,
                    dbId: response.user.dbId
                };
                
                GameState.setUser(userData);
                
                // Store start parameter if present
                if (response.startParam) {
                    this.pendingStartParam = response.startParam;
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    },
    
    /**
     * Create mock user for local development
     * @returns {boolean}
     */
    createMockUser() {
        const mockUser = {
            id: Math.floor(Math.random() * 1000000000),
            username: 'dev_user',
            firstName: 'Dev',
            lastName: 'User',
            languageCode: 'en',
            photoUrl: null
        };
        
        GameState.setUser(mockUser);
        console.log('Created mock user for development:', mockUser);
        
        // Check for start parameter in URL
        const params = Utils.parseUrlParams();
        if (params.tgWebAppStartParam) {
            this.pendingStartParam = params.tgWebAppStartParam;
        }
        
        return true;
    },
    
    /**
     * Check channel subscription
     * @returns {Promise<boolean>}
     */
    async checkSubscription() {
        try {
            // First check if subscription is required
            const channelInfo = await API.getChannelInfo();
            
            if (!channelInfo.channelRequired) {
                // No subscription required
                return true;
            }
            
            // Check if user is subscribed
            const userId = GameState.getUserId();
            const result = await API.checkSubscription(userId);
            
            if (result.isSubscribed) {
                return true;
            }
            
            // Show subscription screen
            Screens.showSubscription(channelInfo);
            
            // Set up check subscription button
            const checkBtn = document.getElementById('check-subscription-btn');
            checkBtn.onclick = async () => {
                Utils.showToast('Checking subscription...', 'info');
                
                const newResult = await API.checkSubscription(userId);
                
                if (newResult.isSubscribed) {
                    Utils.showToast('Subscription confirmed!', 'success');
                    // Continue initialization
                    await this.loadUserData();
                    this.initialized = true;
                    MenuController.update();
                    Screens.showMenu();
                } else {
                    Utils.showToast('Please subscribe to the channel first', 'warning');
                }
            };
            
            return false;
        } catch (error) {
            console.error('Subscription check failed:', error);
            // Continue anyway if check fails
            return true;
        }
    },
    
    /**
     * Load additional user data from backend
     */
    async loadUserData() {
        const userId = GameState.getUserId();
        if (!userId) return;
        
        try {
            const response = await API.getUser(userId);
            
            if (response.success && response.user) {
                GameState.updateUser({
                    stats: response.user.stats
                });
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            // Non-critical, continue
        }
    },
    
    /**
     * Handle start parameter from deep link
     */
    async handleStartParam() {
        const startParam = this.pendingStartParam;
        
        if (!startParam) return;
        
        console.log('Handling start parameter:', startParam);
        
        // Check if it's a lobby code (6 characters, alphanumeric)
        if (/^[A-Z0-9]{6}$/i.test(startParam)) {
            // Try to join the lobby
            try {
                Utils.showToast(`Joining lobby ${startParam}...`, 'info');
                
                const user = GameState.user;
                const response = await API.joinLobby(startParam, {
                    userId: user.id,
                    username: user.username,
                    firstName: user.firstName
                });
                
                if (response.success) {
                    GameState.setLobby(response.lobby);
                    LobbyController.showLobbyRoom(response.lobby);
                    LobbyController.startLobbyPolling();
                }
            } catch (error) {
                Utils.showToast('Lobby not found or no longer available', 'warning');
                console.error('Failed to join lobby from deep link:', error);
            }
        }
        
        // Clear the pending param
        this.pendingStartParam = null;
    },
    
    /**
     * Show authentication error
     */
    showAuthError() {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = 'Please open this app from Telegram';
        }
        
        // Keep loading screen visible
        Screens.show('loading-screen', false);
    },
    
    /**
     * Show generic error
     * @param {string} message
     */
    showError(message) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    },
    
    /**
     * Handle app closing
     */
    onClose() {
        // Save any pending data
        GameState.saveToStorage();
        
        // Stop any polling
        GameState.stopPolling();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        App.onClose();
    }
});

// Handle before unload
window.addEventListener('beforeunload', () => {
    App.onClose();
});

// Make App globally available
window.App = App;
