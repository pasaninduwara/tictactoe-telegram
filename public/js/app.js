/**
 * Main Application Entry Point
 * Handles initialization and Telegram WebApp integration
 */

const App = {
    initialized: false,
    tg: nullwindow.App = {
    async init() {
        // Wait for Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }

        // Safety: ensure all modules exist
        if (!window.Screens || !window.GameState) {
            console.error("Missing Modules!");
            return;
        }

        // Show the menu and hide the loader
        window.Screens.show('menu-screen');
    }
};

// Start when all scripts and images are done loading
window.addEventListener('load', () => window.App.init());,
    pendingStartParam: null,
    
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
            if (typeof MenuController !== 'undefined') MenuController.update();
            if (typeof Screens !== 'undefined') Screens.showMenu();
            
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
        if (tg.BackButton) {
            tg.BackButton.onClick(() => {
                if (typeof Screens !== 'undefined') Screens.goBack();
            });
        }
        
        // Handle theme changes
        tg.onEvent('themeChanged', () => {
            this.applyTheme();
        });
        
        // Expand to full height
        tg.expand();
        
        // Show the app
        tg.ready();
    },
    
    /**
     * Apply Telegram theme to the app
     */
    applyTheme() {
        if (!this.tg) return;
        
        const theme = this.tg.themeParams;
        const root = document.documentElement;
        
        if (theme.bg_color) root.style.setProperty('--bg-primary', theme.bg_color);
        if (theme.secondary_bg_color) root.style.setProperty('--bg-secondary', theme.secondary_bg_color);
        if (theme.text_color) root.style.setProperty('--text-primary', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--text-secondary', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--accent-gold', theme.link_color);
        if (theme.button_color) root.style.setProperty('--accent-purple', theme.button_color);
        
        if (this.tg.setHeaderColor) {
            this.tg.setHeaderColor(theme.secondary_bg_color || '#111827');
        }
        if (this.tg.setBackgroundColor) {
            this.tg.setBackgroundColor(theme.bg_color || '#0a0e1a');
        }
    },
    
    /**
     * Check Telegram authentication
     */
    async checkAuth() {
        // If no Telegram data, check if we are in a testing environment
        if (!this.tg?.initData) {
            console.warn('No Telegram init data - checking environment...');
            
            const isTesting = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.hostname.includes('vercel.app');

            if (isTesting) {
                return this.createMockUser();
            }
            return false;
        }
        
        try {
            const response = await API.validateAuth(this.tg.initData);
            
            if (response.success && response.user) {
                const userData = {
                    id: response.user.id,
                    username: response.user.username,
                    firstName: response.user.firstName,
                    lastName: response.user.lastName,
                    languageCode: response.user.languageCode,
                    photoUrl: response.user.photoUrl,
                    dbId: response.user.dbId
                };
                
                if (typeof GameState !== 'undefined') GameState.setUser(userData);
                if (response.startParam) this.pendingStartParam = response.startParam;
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            // Fallback for testing if API fails on Vercel
            if (window.location.hostname.includes('vercel.app')) return this.createMockUser();
            return false;
        }
    },
    
    createMockUser() {
        const mockUser = {
            id: 12345678,
            username: 'dev_user',
            firstName: 'Dev',
            lastName: 'User'
        };
        
        if (typeof GameState !== 'undefined') GameState.setUser(mockUser);
        console.log('Using mock user for development');
        return true;
    },

    async checkSubscription() {
        try {
            const channelInfo = await API.getChannelInfo();
            if (!channelInfo.channelRequired) return true;
            
            const userId = GameState.getUserId();
            const result = await API.checkSubscription(userId);
            if (result.isSubscribed) return true;
            
            if (typeof Screens !== 'undefined') Screens.showSubscription(channelInfo);
            return false;
        } catch (e) { return true; }
    },

    async loadUserData() {
        const userId = typeof GameState !== 'undefined' ? GameState.getUserId() : null;
        if (!userId) return;
        try {
            const response = await API.getUser(userId);
            if (response.success && response.user && typeof GameState !== 'undefined') {
                GameState.updateUser({ stats: response.user.stats });
            }
        } catch (e) {}
    },

    async handleStartParam() {
        const startParam = this.pendingStartParam;
        if (!startParam) return;
        // Logic to join lobby based on startParam
        this.pendingStartParam = null;
    },
    
    showAuthError() {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = 'Please open this app from Telegram';
        if (typeof Screens !== 'undefined') Screens.show('loading-screen', false);
    },
    
    showError(message) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = message;
    },
    
    onClose() {
        if (typeof GameState !== 'undefined') {
            GameState.saveToStorage();
            GameState.stopPolling();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('beforeunload', () => App.onClose());
window.App = App;
