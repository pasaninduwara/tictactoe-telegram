/**
 * User Routes
 * Handles user profiles, stats, and game history
 */

const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { asyncHandler } = require('../lib/middleware');

/**
 * GET /api/user/:userId
 * Get user profile by Telegram ID
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get user stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  res.json({
    success: true,
    user: {
      id: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name || user.username || user.first_name,
      languageCode: user.language_code,
      photoUrl: user.photo_url,
      createdAt: user.created_at,
      stats: stats ? {
        totalGames: stats.total_games,
        gamesWon: stats.games_won,
        gamesLost: stats.games_lost,
        totalScore: stats.total_score,
        highestScore: stats.highest_score,
        averageScore: stats.total_games > 0 
          ? Math.round(stats.total_score / stats.total_games) 
          : 0,
        winRate: stats.total_games > 0 
          ? Math.round((stats.games_won / stats.total_games) * 100) 
          : 0
      } : null
    }
  });
}));

/**
 * PUT /api/user/:userId
 * Update user profile
 */
router.put('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { displayName } = req.body;

  const updateData = {};
  if (displayName !== undefined) {
    updateData.display_name = displayName;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('telegram_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }

  res.json({
    success: true,
    user: {
      id: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name
    }
  });
}));

/**
 * GET /api/user/:userId/history
 * Get user's game history
 */
router.get('/:userId/history', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  // Get user's database ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', userId)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get games where user was a player
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .or(`player_x_id.eq.${userId},player_o_id.eq.${userId}`)
    .in('status', ['completed', 'forfeited'])
    .order('completed_at', { ascending: false })
    .limit(Math.min(20, parseInt(limit) || 10));

  if (error) {
    console.error('Error fetching game history:', error);
    return res.status(500).json({ error: 'Failed to fetch game history' });
  }

  res.json({
    success: true,
    games: games.map(game => {
      const isPlayerX = game.player_x_id === userId;
      const playerScore = isPlayerX ? game.player_x_score : game.player_o_score;
      const opponentScore = isPlayerX ? game.player_o_score : game.player_x_score;
      const opponentName = isPlayerX ? game.player_o_name : game.player_x_name;
      
      let result = 'draw';
      if (game.winner_id === userId) {
        result = 'win';
      } else if (game.winner_id && game.winner_id !== userId) {
        result = 'loss';
      }

      return {
        id: game.id,
        opponentName,
        playerScore,
        opponentScore,
        result,
        status: game.status,
        completedAt: game.completed_at
      };
    })
  });
}));

/**
 * GET /api/user/:userId/stats
 * Get user's detailed statistics
 */
router.get('/:userId/stats', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get user's database ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', userId)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get recent form (last 5 games)
  const { data: recentGames } = await supabase
    .from('games')
    .select('winner_id, player_x_id, player_o_id')
    .or(`player_x_id.eq.${userId},player_o_id.eq.${userId}`)
    .in('status', ['completed', 'forfeited'])
    .order('completed_at', { ascending: false })
    .limit(5);

  const recentForm = (recentGames || []).map(game => {
    if (game.winner_id === userId) return 'W';
    if (game.winner_id && game.winner_id !== userId) return 'L';
    return 'D';
  });

  // Calculate average score
  const { data: avgScore } = await supabase
    .from('games')
    .select('player_x_score, player_o_score')
    .or(`player_x_id.eq.${userId},player_o_id.eq.${userId}`)
    .eq('status', 'completed');

  let totalPlayerScore = 0;
  let gamesCounted = 0;
  (avgScore || []).forEach(game => {
    if (game.player_x_id === userId) {
      totalPlayerScore += game.player_x_score || 0;
    } else {
      totalPlayerScore += game.player_o_score || 0;
    }
    gamesCounted++;
  });

  res.json({
    success: true,
    stats: {
      totalGames: stats?.total_games || 0,
      gamesWon: stats?.games_won || 0,
      gamesLost: stats?.games_lost || 0,
      gamesDraw: (stats?.total_games || 0) - (stats?.games_won || 0) - (stats?.games_lost || 0),
      totalScore: stats?.total_score || 0,
      highestScore: stats?.highest_score || 0,
      averageScore: gamesCounted > 0 ? Math.round(totalPlayerScore / gamesCounted) : 0,
      winRate: stats?.total_games > 0 
        ? Math.round((stats.games_won / stats.total_games) * 100) 
        : 0,
      recentForm
    }
  });
}));

/**
 * POST /api/user/sync
 * Sync/create user from Telegram data
 */
router.post('/sync', asyncHandler(async (req, res) => {
  const { telegramUser } = req.body;

  if (!telegramUser || !telegramUser.id) {
    return res.status(400).json({ error: 'Invalid Telegram user data' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .upsert({
      telegram_id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      language_code: telegramUser.language_code || 'en',
      photo_url: telegramUser.photo_url || null,
      last_seen: new Date().toISOString()
    }, {
      onConflict: 'telegram_id',
      update: {
        username: telegramUser.username || null,
        first_name: telegramUser.first_name || null,
        last_name: telegramUser.last_name || null,
        photo_url: telegramUser.photo_url || null,
        last_seen: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }

  // Ensure user stats record exists
  await supabaseAdmin
    .from('user_stats')
    .upsert({
      user_id: user.id,
      total_games: 0,
      games_won: 0,
      games_lost: 0,
      total_score: 0,
      highest_score: 0
    }, {
      onConflict: 'user_id'
    });

  res.json({
    success: true,
    user: {
      id: user.telegram_id,
      dbId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_url
    }
  });
}));

module.exports = router;