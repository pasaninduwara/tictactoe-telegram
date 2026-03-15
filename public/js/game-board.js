/**
 * Main Application Entry Point
 */

const App = {
    /**
     * Initialize the application
     */
    async init() {
        console.log("Initializing Tic-Tac-Toe App...");

        try {
            // 1. Initialize Telegram WebApp
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }

            // 2. Initialize Core Modules
            // We wait for DOM to be fully loaded to ensure HTML elements exist
            if (window.Screens) window.Screens.init();
            if (window.LobbyController) window.LobbyController.init();
            if (window.GameController) window.GameController.init();

            // 3. Authenticate User
            const user = await this.authenticateUser();
            if (!user) {
                throw new Error("Authentication failed");
            }

            // 4. Check Subscription (Optional - based on your index.html logic)
            const isSubscribed = await this.checkSubscription(user.id);
            
            if (!isSubscribed) {
                if (window.Screens) window.Screens.show('subscription-screen');
            } else {
                // Load user data into the UI
                this.loadUserData(user);
                // Finally, show the main menu
                if (window.Screens) window.Screens.show('menu-screen');
            }

            // Hide the loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';

        } catch (error) {
            console.error("App Initialization Error:", error);
            // Display error to user
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = "Error loading app. Please refresh.";
        }
    },

    /**
     * Authenticate user via Telegram or Mock data for testing
     */
    async authenticateUser() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            // Use real Telegram data
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            if (window.GameState) window.GameState.playerId = tgUser.id.toString();
            return tgUser;
        } else {
            // Mock user for PC browser testing
            console.warn("Running outside Telegram. Using mock user.");
            const mockId = 'user_' + Math.floor(Math.random() * 1000);
            if (window.GameState) window.GameState.playerId = mockId;
            return { id: mockId, first_name: "Developer", last_name: "Mode" };
        }
    },

    /**
     * Mock subscription check
     */
    async checkSubscription(userId) {
        // Replace with your actual API call to check Telegram channel membership
        return true; 
    },

    /**
     * Populate UI with player details
     */
    loadUserData(user) {
        const nameElement = document.getElementById('player-name');
        if (nameElement) nameElement.textContent = user.first_name || "Player";
        
        const avatarImg = document.getElementById('avatar-img');
        if (avatarImg && user.photo_url) {
            avatarImg.src = user.photo_url;
        }
    }
};

// Start the app when the window is fully loaded
window.addEventListener('load', () => {
    App.init();
});
