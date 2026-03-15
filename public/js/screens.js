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
        
        // Handle Telegram back button
        this.updateTelegramBackButton();
        
        // Haptic feedback
        Utils.haptic('selection');
    },
    
    /**
     * Go back to previous screen
     */
    goBack() {
        if (this.previousScreen) {
            this.show(this.previousScreen, false);
            this.previousScreen = null;
        } else {
            this.show('menu-screen', false);
        }
    },
    
    /**
     * Update Telegram back button visibility
     */
    updateTelegramBackButton() {
        if (!window.Telegram?.WebApp?.BackButton) return;
        
        const BackButton = window.Telegram.WebApp.BackButton;
        
        if (this.currentScreen && this.currentScreen !== 'menu-screen' && this.currentScreen !== 'loading-screen') {
            BackButton.show();
            BackButton.onClick(() => this.goBack());
        } else {
            BackButton.hide();
        }
    },
    
    /**
     * Show loading screen
     */
    showLoading() {
        this.show('loading-screen', false);
    },
    
    /**
     * Show subscription required screen
     * @param {Object} channelInfo - Channel information
     */
    showSubscription(channelInfo) {
        const subscribeLink = document.getElementById('subscribe-link');
        if (subscribeLink && channelInfo?.inviteLink) {
            subscribeLink.href = channelInfo.inviteLink;
        }
        
        this.show('subscription-screen', false);
    },
    
    /**
     * Show main menu
     */
    showMenu() {
        this.show('menu-screen', false);
    },
    
    /**
     * Show game over screen
     * @param {Object} result - Game result data
     */
    showGameOver(result) {
        const resultIcon = document.getElementById('result-icon');
        const resultText = document.getElementById('result-text');
        const winnerScore = document.getElementById('final-score-winner');
        const loserScore = document.getElementById('final-score-loser');
        
        // Determine result
        const isWinner = result.winnerId === GameState.getUserId();
        const isDraw = result.isDraw;
        
        // Set icon and text
        if (isDraw) {
            resultIcon.textContent = '🤝';
            resultText.textContent = 'Draw!';
            resultText.className = 'result-text draw';
        } else if (isWinner) {
            resultIcon.textContent = '🏆';
            resultText.textContent = 'Victory!';
            resultText.className = 'result-text win';
            Utils.haptic('notification');
        } else {
            resultIcon.textContent = '😔';
            resultText.textContent = 'Defeat';
            resultText.className = 'result-text loss';
            Utils.haptic('error');
        }
        
        // Set scores
        if (result.scores) {
            const myScore = GameState.getMyScore();
            const opponentScore = GameState.getOpponentScore();
            
            if (myScore >= opponentScore) {
                winnerScore.querySelector('.final-score-name').textContent = 'You';
                winnerScore.querySelector('.final-score-value').textContent = myScore;
                loserScore.querySelector('.final-score-name').textContent = GameState.getOpponentName();
                loserScore.querySelector('.final-score-value').textContent = opponentScore;
            } else {
                winnerScore.querySelector('.final-score-name').textContent = GameState.getOpponentName();
                winnerScore.querySelector('.final-score-value').textContent = opponentScore;
                loserScore.querySelector('.final-score-name').textContent = 'You';
                loserScore.querySelector('.final-score-value').textContent = myScore;
            }
        }
        
        this.show('game-over-screen', false);
    },
    
    /**
     * Handle period tab click in leaderboard
     * @param {Event} e - Click event
     */
    handlePeriodTabClick(e) {
        const tab = e.target;
        const period = tab.dataset.period;
        
        // Update active tab
        document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Emit event for leaderboard to handle
        GameState.emit('periodChanged', period);
    }
};

/**
 * Screen-specific controllers
 */

const MenuController = {
    /**
     * Initialize menu screen
     */
    init() {
        // Play button
        document.getElementById('play-btn').addEventListener('click', () => {
            Screens.show('play-mode-screen');
        });
        
        // Join lobby button
        document.getElementById('join-lobby-btn').addEventListener('click', () => {
            Screens.show('join-lobby-screen');
            LobbyController.loadPublicLobbies();
        });
        
        // Leaderboard button
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            Screens.show('leaderboard-screen');
            LeaderboardController.load('all');
        });
        
        // Profile button
        document.getElementById('profile-btn').addEventListener('click', () => {
            Screens.show('profile-screen');
            ProfileController.load();
        });
    },
    
    /**
     * Update menu with user data
     */
    update() {
        const user = GameState.user;
        
        if (user) {
            // Update player name
            const nameEl = document.getElementById('player-name');
            nameEl.textContent = user.username || user.firstName || 'Player';
            
            // Update avatar
            const avatarImg = document.getElementById('avatar-img');
            if (user.photoUrl) {
                avatarImg.src = user.photoUrl;
            } else {
                avatarImg.src = CONFIG.DEFAULT_AVATAR;
            }
            
            // Update score
            const scoreEl = document.getElementById('player-total-score');
            scoreEl.textContent = `Score: ${Utils.formatNumber(user.stats?.totalScore || 0)}`;
        }
    }
};

const LobbyController = {
    /**
     * Initialize lobby screens
     */
    init() {
        // Create lobby button
        document.getElementById('create-lobby-btn').addEventListener('click', () => {
            this.createLobby();
        });
        
        // Browse lobbies button
        document.getElementById('browse-lobbies-btn').addEventListener('click', () => {
            Screens.show('join-lobby-screen');
            this.loadPublicLobbies();
        });
        
        // Join by code button
        document.getElementById('join-by-code-btn').addEventListener('click', () => {
            this.joinByCode();
        });
        
        // Lobby code input - auto uppercase
        const lobbyCodeInput = document.getElementById('lobby-code-input');
        lobbyCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
        
        // Copy link button
        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyInviteLink();
        });
        
        // Share to Telegram button
        document.getElementById('share-lobby-btn').addEventListener('click', () => {
            this.shareToTelegram();
        });
        
        // Leave lobby button
        document.getElementById('leave-lobby-btn').addEventListener('click', () => {
            this.leaveLobby();
        });
        
        // Start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
    },
    
    /**
     * Create a new lobby
     */
    async createLobby() {
        try {
            const user = GameState.user;
            const response = await API.createLobby({
                hostUserId: user.id,
                hostUsername: user.username,
                hostFirstName: user.firstName
            });
            
            if (response.success) {
                GameState.setLobby(response.lobby);
                
                // Update UI
                document.getElementById('created-lobby-code').textContent = response.lobby.lobbyCode;
                document.getElementById('lobby-share-link').value = response.lobby.inviteLink;
                document.getElementById('lobby-created-info').style.display = 'block';
                
                Screens.show('create-lobby-screen');
                
                // Start polling for opponent
                this.startLobbyPolling();
                
                Utils.showToast('Lobby created!', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to create lobby', 'error');
            console.error(error);
        }
    },
    
    /**
     * Join lobby by code
     */
    async joinByCode() {
        const lobbyCode = document.getElementById('lobby-code-input').value.trim();
        
        if (!lobbyCode || lobbyCode.length !== 6) {
            Utils.showToast('Please enter a valid 6-character code', 'warning');
            return;
        }
        
        try {
            const user = GameState.user;
            const response = await API.joinLobby(lobbyCode, {
                userId: user.id,
                username: user.username,
                firstName: user.firstName
            });
            
            if (response.success) {
                GameState.setLobby(response.lobby);
                this.showLobbyRoom(response.lobby);
                this.startLobbyPolling();
            }
        } catch (error) {
            Utils.showToast(error.message || 'Failed to join lobby', 'error');
        }
    },
    
    /**
     * Load public lobbies
     */
    async loadPublicLobbies() {
        const listEl = document.getElementById('public-lobby-list');
        listEl.innerHTML = '<div class="loading-text">Loading lobbies...</div>';
        
        try {
            const response = await API.getPublicLobbies();
            
            if (response.success && response.lobbies.length > 0) {
                listEl.innerHTML = response.lobbies.map(lobby => `
                    <div class="lobby-item" data-code="${lobby.lobbyCode}">
                        <div class="lobby-item-info">
                            <span class="lobby-item-code">${lobby.lobbyCode}</span>
                            <span class="lobby-item-host">by ${Utils.escapeHtml(lobby.hostName)}</span>
                            <span class="lobby-item-players">${lobby.currentPlayers}/2 players</span>
                        </div>
                        <button class="btn btn-primary btn-small join-public-btn">Join</button>
                    </div>
                `).join('');
                
                // Add click handlers
                listEl.querySelectorAll('.join-public-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const code = e.target.closest('.lobby-item').dataset.code;
                        document.getElementById('lobby-code-input').value = code;
                        this.joinByCode();
                    });
                });
            } else {
                listEl.innerHTML = '<div class="empty-text">No public lobbies available.<br>Create one to start playing!</div>';
            }
        } catch (error) {
            listEl.innerHTML = '<div class="empty-text">Failed to load lobbies</div>';
        }
    },
    
    /**
     * Show lobby waiting room
     * @param {Object} lobby - Lobby data
     */
    showLobbyRoom(lobby) {
        const roomCodeEl = document.getElementById('room-lobby-code');
        const slot1El = document.getElementById('player-slot-1');
        const slot2El = document.getElementById('player-slot-2');
        const startBtn = document.getElementById('start-game-btn');
        
        roomCodeEl.textContent = lobby.lobbyCode;
        
        // Player 1 (host)
        const slot1Name = slot1El.querySelector('.slot-name');
        const slot1Avatar = slot1El.querySelector('.slot-avatar img');
        slot1Name.textContent = lobby.hostUsername || lobby.hostFirstName || 'Host';
        slot1Avatar.src = CONFIG.DEFAULT_AVATAR;
        slot1El.classList.add('filled');
        
        // Player 2 (guest)
        if (lobby.guestUserId) {
            const slot2Name = slot2El.querySelector('.slot-name');
            const slot2Avatar = slot2El.querySelector('.slot-avatar img');
            slot2Name.textContent = lobby.guestUsername || lobby.guestFirstName || 'Guest';
            slot2Avatar.src = CONFIG.DEFAULT_AVATAR;
            slot2El.classList.add('filled');
        } else {
            const slot2Name = slot2El.querySelector('.slot-name');
            slot2Name.textContent = 'Waiting...';
            slot2El.classList.remove('filled');
        }
        
        // Show/hide start button (only host can start when lobby is ready)
        if (lobby.status === 'ready' && GameState.isLobbyHost()) {
            startBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'none';
        }
        
        Screens.show('lobby-room-screen');
    },
    
    /**
     * Start polling for lobby updates
     */
    startLobbyPolling() {
        GameState.startLobbyPolling((lobby) => {
            this.showLobbyRoom(lobby);
            
            // Check if game started
            if (lobby.status === 'in_progress' && lobby.gameId) {
                GameState.stopLobbyPolling();
                GameController.loadGame(lobby.gameId);
            }
        });
    },
    
    /**
     * Copy invite link
     */
    async copyInviteLink() {
        const link = document.getElementById('lobby-share-link').value;
        const success = await Utils.copyToClipboard(link);
        
        if (success) {
            Utils.showToast('Link copied!', 'success');
        } else {
            Utils.showToast('Failed to copy', 'error');
        }
    },
    
    /**
     * Share to Telegram
     */
    shareToTelegram() {
        const lobby = GameState.lobby;
        if (!lobby) return;
        
        const text = `Join my Tic-Tac-Toe game! 🎮\nLobby Code: ${lobby.lobbyCode}`;
        const url = lobby.inviteLink;
        
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        } else {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        }
    },
    
    /**
     * Leave current lobby
     */
    async leaveLobby() {
        const lobby = GameState.lobby;
        if (!lobby) return;
        
        try {
            await API.leaveLobby(lobby.lobbyCode, GameState.getUserId());
        } catch (error) {
            console.error('Error leaving lobby:', error);
        }
        
        GameState.stopPolling();
        GameState.clearLobby();
        Screens.showMenu();
    },
    
    /**
     * Start the game (host only)
     */
    async startGame() {
        const lobby = GameState.lobby;
        if (!lobby) return;
        
        try {
            const response = await API.startGame(lobby.lobbyCode, GameState.getUserId());
            
            if (response.success) {
                GameState.stopLobbyPolling();
                await GameController.loadGame(response.game.id);
            }
        } catch (error) {
            Utils.showToast('Failed to start game', 'error');
        }
    }
};

const LeaderboardController = {
    currentPage: 1,
    currentPeriod: 'all',
    
    /**
     * Initialize leaderboard
     */
    init() {
        // Listen for period changes
        GameState.on('periodChanged', (period) => {
            this.currentPeriod = period;
            this.currentPage = 1;
            this.load(period);
        });
    },
    
    /**
     * Load leaderboard data
     * @param {string} period - Time period
     * @param {number} page - Page number
     */
    async load(period = 'all', page = 1) {
        const listEl = document.getElementById('leaderboard-list');
        listEl.innerHTML = '<div class="loading-text">Loading...</div>';
        
        try {
            const response = await API.getLeaderboard(period, page, CONFIG.LEADERBOARD_PAGE_SIZE);
            
            if (response.success && response.leaderboard.length > 0) {
                const userId = GameState.getUserId();
                
                listEl.innerHTML = response.leaderboard.map((player, index) => {
                    const rank = (page - 1) * CONFIG.LEADERBOARD_PAGE_SIZE + index + 1;
                    const rankClass = rank <= 3 ? ['gold', 'silver', 'bronze'][rank - 1] : 'default';
                    const isCurrentUser = player.userId === userId;
                    
                    return `
                        <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                            <div class="rank-badge ${rankClass}">${rank}</div>
                            <div class="leaderboard-avatar">
                                <img src="${player.photoUrl || CONFIG.DEFAULT_AVATAR}" alt="">
                            </div>
                            <div class="leaderboard-player">
                                <div class="leaderboard-name">${Utils.escapeHtml(player.username || player.firstName || 'Player')}</div>
                                <div class="leaderboard-stats">
                                    <span>${player.gamesWon}W</span>
                                    <span>${player.gamesLost}L</span>
                                    <span>${player.winRate}%</span>
                                </div>
                            </div>
                            <div class="leaderboard-score">
                                <div class="score-number">${Utils.formatNumber(player.totalScore)}</div>
                                <div class="score-label">points</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                listEl.innerHTML = `
                    <div class="leaderboard-empty">
                        <div class="leaderboard-empty-icon">🏆</div>
                        <p>No players yet</p>
                    </div>
                `;
            }
        } catch (error) {
            listEl.innerHTML = '<div class="empty-text">Failed to load leaderboard</div>';
        }
    }
};

const ProfileController = {
    /**
     * Initialize profile
     */
    init() {
        // Save name button
        document.getElementById('save-name-btn').addEventListener('click', () => {
            this.saveDisplayName();
        });
        
        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            Screens.show('play-mode-screen');
        });
        
        // Back to menu button
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            Screens.showMenu();
        });
    },
    
    /**
     * Load profile data
     */
    async load() {
        const userId = GameState.getUserId();
        if (!userId) return;
        
        try {
            const [userResponse, statsResponse, historyResponse] = await Promise.all([
                API.getUser(userId),
                API.getUserStats(userId),
                API.getUserHistory(userId)
            ]);
            
            if (userResponse.success) {
                const user = userResponse.user;
                
                // Update avatar
                const avatarImg = document.getElementById('profile-avatar-img');
                avatarImg.src = user.photoUrl || CONFIG.DEFAULT_AVATAR;
                
                // Update display name input
                const nameInput = document.getElementById('display-name-input');
                nameInput.value = user.displayName || user.username || user.firstName || '';
            }
            
            if (statsResponse.success) {
                const stats = statsResponse.stats;
                
                document.getElementById('profile-total-games').textContent = stats.totalGames;
                document.getElementById('profile-wins').textContent = stats.gamesWon;
                document.getElementById('profile-losses').textContent = stats.gamesLost;
                document.getElementById('profile-win-rate').textContent = `${stats.winRate}%`;
                document.getElementById('profile-total-score').textContent = Utils.formatNumber(stats.totalScore);
                document.getElementById('profile-highest-score').textContent = stats.highestScore;
            }
            
            if (historyResponse.success) {
                const historyList = document.getElementById('game-history-list');
                
                if (historyResponse.games.length > 0) {
                    historyList.innerHTML = historyResponse.games.map(game => `
                        <div class="history-item">
                            <div class="history-result ${game.result}">
                                ${game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                            </div>
                            <div class="history-details">
                                <div class="history-opponent">vs ${Utils.escapeHtml(game.opponentName)}</div>
                                <div class="history-date">${Utils.formatDate(game.completedAt)}</div>
                            </div>
                            <div class="history-score">
                                <div class="history-score-value">${game.playerScore} - ${game.opponentScore}</div>
                                <div class="history-score-label">points</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    historyList.innerHTML = `
                        <div class="history-empty">
                            <div class="history-empty-icon">🎮</div>
                            <p>No games played yet</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            Utils.showToast('Failed to load profile', 'error');
        }
    },
    
    /**
     * Save display name
     */
    async saveDisplayName() {
        const nameInput = document.getElementById('display-name-input');
        const displayName = nameInput.value.trim();
        
        if (!displayName) {
            Utils.showToast('Please enter a name', 'warning');
            return;
        }
        
        try {
            const response = await API.updateUser(GameState.getUserId(), { displayName });
            
            if (response.success) {
                GameState.updateUser({ displayName });
                Utils.showToast('Name saved!', 'success');
            }
        } catch (error) {
            Utils.showToast('Failed to save name', 'error');
        }
    }
};

const GameController = {
    /**
     * Initialize game screen
     */
    init() {
        // Initialize game board
        const boardContainer = document.getElementById('game-board');
        GameBoard.init(boardContainer, (row, col) => this.handleCellClick(row, col));
    },
    
    /**
     * Load and display a game
     * @param {string} gameId - Game ID
     */
    async loadGame(gameId) {
        try {
            const response = await API.getGame(gameId);
            
            if (response.success) {
                GameState.setGame(response.game);
                this.showGame(response.game);
                this.startGamePolling();
            }
        } catch (error) {
            Utils.showToast('Failed to load game', 'error');
        }
    },
    
    /**
     * Show game screen with current state
     * @param {Object} game - Game data
     */
    showGame(game) {
        // Update opponent info
        const opponentName = GameState.getOpponentName();
        document.getElementById('opponent-name').textContent = opponentName;
        document.getElementById('opponent-avatar-img').src = CONFIG.DEFAULT_AVATAR;
        
        // Update my info
        document.getElementById('my-name').textContent = GameState.user?.username || GameState.user?.firstName || 'You';
        document.getElementById('my-avatar-img').src = GameState.user?.photoUrl || CONFIG.DEFAULT_AVATAR;
        
        // Render board
        GameBoard.render(game.board);
        
        // Update turn indicator
        this.updateTurnIndicator();
        
        // Update scores
        this.updateScores(game.scores);
        
        // Check game status
        if (game.status === 'completed' || game.status === 'forfeited') {
            GameBoard.disable();
            this.showGameOver(game);
        } else {
            // Enable/disable board based on turn
            if (GameState.isMyTurn()) {
                GameBoard.enable();
            } else {
                GameBoard.disable();
            }
        }
        
        Screens.show('game-screen');
    },
    
    /**
     * Handle cell click
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    async handleCellClick(row, col) {
        if (!GameState.isMyTurn()) {
            Utils.showToast('Not your turn', 'warning');
            return;
        }
        
        const game = GameState.game;
        
        // Check if cell is empty
        if (game.board[row][col] !== null) {
            return;
        }
        
        // Disable board while making move
        GameBoard.disable();
        
        try {
            const response = await API.makeMove(game.id, GameState.getUserId(), row, col);
            
            if (response.success) {
                // Update board immediately
                GameBoard.updateCell(row, col, GameState.playerSymbol);
                
                // Update game state
                GameState.game.board = response.game.board;
                GameState.game.currentTurn = response.game.currentTurn;
                GameState.game.scores = response.game.scores;
                GameState.game.status = response.game.status;
                
                // Update UI
                this.updateTurnIndicator();
                this.updateScores(response.game.scores);
                
                // Check for game over
                if (response.game.gameResult) {
                    GameState.stopPolling();
                    GameBoard.disable();
                    
                    // Wait a moment before showing game over
                    setTimeout(() => {
                        Screens.showGameOver(response.game.gameResult);
                    }, 500);
                } else {
                    // Re-enable if game continues and it's our turn
                    if (GameState.isMyTurn()) {
                        GameBoard.enable();
                    }
                }
            }
        } catch (error) {
            Utils.showToast('Failed to make move', 'error');
            GameBoard.enable();
        }
    },
    
    /**
     * Update turn indicator
     */
    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        const turnText = indicator.querySelector('.turn-text');
        const turnSymbol = document.getElementById('turn-symbol');
        
        const isMyTurn = GameState.isMyTurn();
        
        if (isMyTurn) {
            turnText.textContent = 'Your Turn';
            indicator.classList.add('your-turn');
        } else {
            turnText.textContent = "Opponent's Turn";
            indicator.classList.remove('your-turn');
        }
        
        turnSymbol.textContent = GameState.game?.currentTurn || 'X';
        turnSymbol.className = `turn-symbol ${GameState.game?.currentTurn || 'X'}`;
    },
    
    /**
     * Update score display
     * @param {Object} scores - { X: number, O: number }
     */
    updateScores(scores) {
        if (!scores) return;
        
        document.getElementById('score-x').textContent = scores.X;
        document.getElementById('score-o').textContent = scores.O;
        
        // Update player scores in header/footer
        if (GameState.playerSymbol === 'X') {
            document.getElementById('my-score').textContent = `Score: ${scores.X}`;
            document.getElementById('opponent-score').textContent = `Score: ${scores.O}`;
        } else {
            document.getElementById('my-score').textContent = `Score: ${scores.O}`;
            document.getElementById('opponent-score').textContent = `Score: ${scores.X}`;
        }
    },
    
    /**
     * Start polling for game updates
     */
    startGamePolling() {
        GameState.startGamePolling((game) => {
            GameBoard.render(game.board);
            this.updateTurnIndicator();
            this.updateScores(game.scores);
            
            if (game.status === 'completed' || game.status === 'forfeited') {
                GameState.stopPolling();
                GameBoard.disable();
                
                setTimeout(() => {
                    Screens.showGameOver({
                        winnerId: game.winnerId,
                        isDraw: !game.winnerId,
                        scores: game.scores
                    });
                }, 500);
            }
        });
    },
    
    /**
     * Show game over screen
     * @param {Object} game - Game data
     */
    showGameOver(game) {
        Screens.showGameOver({
            winnerId: game.winnerId,
            isDraw: !game.winnerId,
            scores: game.scores
        });
    }
};

// Initialize all controllers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Screens.init();
    MenuController.init();
    LobbyController.init();
    LeaderboardController.init();
    ProfileController.init();
    GameController.init();
});

// Make controllers globally available
window.Screens = Screens;
window.MenuController = MenuController;
window.LobbyController = LobbyController;
window.LeaderboardController = LeaderboardController;
window.ProfileController = ProfileController;
window.GameController = GameController;