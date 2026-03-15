/**
 * Main Application Entry Point
 * Safe-loading version
 */

const App = {
    async init() {
        console.log("Checking dependencies...");

        // 1. Wait for all global modules to be available
        const dependencies = [
            'Screens', 
            'LobbyController', 
            'GameController', 
            'GameBoard', 
            'GameState'
        ];

        for (const dep of dependencies) {
            if (!window[dep]) {
                console.error(`Missing dependency: ${dep}. Make sure your script tags in index.html are correct.`);
                this.showError(`Error: ${dep} failed to load.`);
                return;
            }
        }

        try {
            // 2. Initialize Telegram
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }

            // 3. Initialize all modules
            window.Screens.init();
            window.LobbyController.init();
            window.GameController.init();
            // GameBoard is initialized inside GameController.enterGame

            // 4. Identity Check
            await this.setupPlayer();

            // 5. Success! Show the Menu
            window.Screens.show('menu-screen');
            
            // Hide loading overlay
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';

        } catch (error) {
            console.error("Initialization failed:", error);
            this.showError("Failed to start the app. Please refresh.");
        }
    },

    async setupPlayer() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            window.GameState.playerId = user.id.toString();
            
            const nameEl = document.getElementById('player-name');
            if (nameEl) nameEl.textContent = user.first_name;
        } else {
            // Fallback for PC testing
            const mockId = 'player_' + Math.random().toString(36).substr(2, 5);
            window.GameState.playerId = mockId;
            console.log("Mock Player ID assigned:", mockId);
        }
    },

    showError(msg) {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = msg;
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) spinner.style.borderTopColor = 'red';
    }
};

// This ensures the DOM is ready AND all scripts are parsed
if (document.readyState === 'complete') {
    App.init();
} else {
    window.addEventListener('load', () => App.init());
}
