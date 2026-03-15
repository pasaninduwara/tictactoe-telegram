/**
 * App Entry - RIDMA MOBILE FINAL
 */
window.App = {
    init() {
        console.log("App: Forced Start");
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }

        // Wake up controllers
        if (window.GameController) window.GameController.init();
        if (window.LobbyController) window.LobbyController.init();

        // Show menu immediately
        window.Screens.show('menu-screen');
    }
};

window.addEventListener('load', () => window.App.init());
