window.App = {
    async init() {
        console.log("App: Forced Initialization Started");

        // 1. Setup Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }

        // 2. Initialize UI Controllers
        if (window.GameController) window.GameController.init();
        if (window.LobbyController) window.LobbyController.init();

        // 3. FORCE SHOW MENU (This stops the infinite loading screen)
        setTimeout(() => {
            if (window.Screens) {
                window.Screens.show('menu-screen');
            }
        }, 500);
    }
};

// Use 'load' to ensure all other files (API, GameState, etc.) are 100% finished
window.addEventListener('load', () => window.App.init());
