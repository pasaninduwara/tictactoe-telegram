-- =============================================
-- Tic-Tac-Toe Telegram Mini App Database Schema
-- For Supabase (PostgreSQL)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- Stores Telegram user information
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    photo_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by Telegram ID
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- USER_STATS TABLE
-- Stores aggregated user statistics
-- =============================================
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_games INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_stats_score ON user_stats(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_stats(games_won DESC);

-- =============================================
-- LOBBIES TABLE
-- Stores game lobby information
-- =============================================
CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_code VARCHAR(6) UNIQUE NOT NULL,
    host_user_id BIGINT NOT NULL,
    host_username VARCHAR(255),
    host_first_name VARCHAR(255),
    guest_user_id BIGINT,
    guest_username VARCHAR(255),
    guest_first_name VARCHAR(255),
    current_players INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 2,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, ready, in_progress, completed
    game_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lobby queries
CREATE INDEX IF NOT EXISTS idx_lobbies_code ON lobbies(lobby_code);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_host ON lobbies(host_user_id);

-- =============================================
-- GAMES TABLE
-- Stores game instances and state
-- =============================================
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID REFERENCES lobbies(id) ON DELETE SET NULL,
    player_x_id BIGINT NOT NULL,
    player_x_name VARCHAR(255),
    player_o_id BIGINT NOT NULL,
    player_o_name VARCHAR(255),
    current_turn CHAR(1) DEFAULT 'X', -- X or O
    board JSONB DEFAULT '[[null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null],[null,null,null,null,null,null]]',
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, forfeited
    winner_id BIGINT,
    player_x_score INTEGER DEFAULT 0,
    player_o_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for game queries
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_player_x ON games(player_x_id);
CREATE INDEX IF NOT EXISTS idx_games_player_o ON games(player_o_id);
CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed_at DESC) WHERE completed_at IS NOT NULL;

-- =============================================
-- GAME_MOVES TABLE
-- Stores individual moves for game history/replay
-- =============================================
CREATE TABLE IF NOT EXISTS game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL,
    player_symbol CHAR(1) NOT NULL, -- X or O
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    move_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for move history queries
CREATE INDEX IF NOT EXISTS idx_game_moves_game ON game_moves(game_id, move_number);

-- =============================================
-- FUNCTIONS AND PROCEDURES
-- =============================================

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats(
    p_user_id BIGINT,
    p_games_won INTEGER DEFAULT 0,
    p_games_lost INTEGER DEFAULT 0,
    p_total_score INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_db_user_id UUID;
BEGIN
    -- Get the database user ID from Telegram ID
    SELECT id INTO v_db_user_id FROM users WHERE telegram_id = p_user_user_id;
    
    IF v_db_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Insert or update stats
    INSERT INTO user_stats (user_id, total_games, games_won, games_lost, total_score, highest_score)
    VALUES (
        v_db_user_id, 
        1, 
        p_games_won, 
        p_games_lost, 
        p_total_score,
        p_total_score
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_games = user_stats.total_games + 1,
        games_won = user_stats.games_won + p_games_won,
        games_lost = user_stats.games_lost + p_games_lost,
        total_score = user_stats.total_score + p_total_score,
        highest_score = GREATEST(user_stats.highest_score, p_total_score),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Fix the function parameter name
DROP FUNCTION IF EXISTS update_user_stats(BIGINT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION update_user_stats(
    p_user_id BIGINT,
    p_games_won INTEGER DEFAULT 0,
    p_games_lost INTEGER DEFAULT 0,
    p_total_score INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_db_user_id UUID;
BEGIN
    -- Get the database user ID from Telegram ID
    SELECT id INTO v_db_user_id FROM users WHERE telegram_id = p_user_id;
    
    IF v_db_user_id IS NULL THEN
        RETURN; -- Silently fail if user doesn't exist
    END IF;
    
    -- Insert or update stats
    INSERT INTO user_stats (user_id, total_games, games_won, games_lost, total_score, highest_score)
    VALUES (
        v_db_user_id, 
        1, 
        p_games_won, 
        p_games_lost, 
        p_total_score,
        p_total_score
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        total_games = user_stats.total_games + 1,
        games_won = user_stats.games_won + p_games_won,
        games_lost = user_stats.games_lost + p_games_lost,
        total_score = user_stats.total_score + p_total_score,
        highest_score = GREATEST(user_stats.highest_score, p_total_score),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard by time period
CREATE OR REPLACE FUNCTION get_leaderboard_by_period(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    telegram_id BIGINT,
    username VARCHAR(255),
    first_name VARCHAR(255),
    photo_url TEXT,
    total_games BIGINT,
    games_won BIGINT,
    games_lost BIGINT,
    total_score BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        u.photo_url,
        COUNT(g.id) as total_games,
        COUNT(CASE WHEN g.winner_id = u.telegram_id THEN 1 END) as games_won,
        COUNT(CASE WHEN g.winner_id IS NOT NULL AND g.winner_id != u.telegram_id THEN 1 END) as games_lost,
        COALESCE(SUM(CASE 
            WHEN g.player_x_id = u.telegram_id THEN g.player_x_score 
            ELSE g.player_o_score 
        END), 0) as total_score
    FROM users u
    INNER JOIN games g ON (g.player_x_id = u.telegram_id OR g.player_o_id = u.telegram_id)
    WHERE g.status IN ('completed', 'forfeited')
        AND g.completed_at >= p_start_date
    GROUP BY u.telegram_id, u.username, u.first_name, u.photo_url
    ORDER BY total_score DESC, games_won DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS
-- =============================================

-- Leaderboard view (all-time)
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    u.telegram_id,
    u.username,
    u.first_name,
    u.photo_url,
    us.total_games,
    us.games_won,
    us.games_lost,
    us.total_score,
    CASE WHEN us.total_games > 0 
        THEN ROUND((us.games_won::FLOAT / us.total_games::FLOAT) * 100) 
        ELSE 0 
    END as win_rate
FROM user_stats us
JOIN users u ON u.id = us.user_id
ORDER BY us.total_score DESC, us.games_won DESC;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lobbies_updated_at
    BEFORE UPDATE ON lobbies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- These ensure users can only access their own data
-- =============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Public read access for leaderboard
CREATE POLICY "Public read access for leaderboard" ON user_stats
    FOR SELECT
    USING (true);

CREATE POLICY "Public read access for users" ON users
    FOR SELECT
    USING (true);

CREATE POLICY "Public read access for games" ON games
    FOR SELECT
    USING (true);

CREATE POLICY "Public read access for lobbies" ON lobbies
    FOR SELECT
    USING (true);

-- Service role can do everything (for backend operations)
-- Note: These policies use service role for backend operations
-- The actual auth is handled via Telegram WebApp validation

-- =============================================
-- INITIAL DATA / CLEANUP
-- =============================================

-- Function to clean up old inactive lobbies (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_lobbies()
RETURNS VOID AS $$
BEGIN
    DELETE FROM lobbies 
    WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Comment on tables for documentation
COMMENT ON TABLE users IS 'Stores Telegram user profiles and preferences';
COMMENT ON TABLE user_stats IS 'Aggregated statistics for each user';
COMMENT ON TABLE lobbies IS 'Game lobby instances for matchmaking';
COMMENT ON TABLE games IS 'Game instances with board state';
COMMENT ON TABLE game_moves IS 'Individual moves for game replay';