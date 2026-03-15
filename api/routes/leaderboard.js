/**
 * Leaderboard Routes
 * Handles global rankings with time-based filtering
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { asyncHandler } = require('../lib/middleware');

/**
 * GET /api/leaderboard
 * Get global leaderboard with time filtering
 * Query params:
 * - period: 'today', 'week', 'month', 'year', 'all' (default: 'all')
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { period = 'all', page = 1, limit = 20 } = req.query;
  
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  // Calculate date filter based on period
  let dateFilter = null;
  const now = new Date();

  switch (period) {
    case 'today':
      dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      dateFilter = weekStart.toISOString();
      break;
    case 'month':
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      break;
    case 'year':
      dateFilter = new Date(now.getFullYear(), 0, 1).toISOString();
      break;
    default:
      dateFilter = null;
  }

  try {
    // Get total count for pagination
    let countQuery = supabase
      .from('leaderboard_view')
      .select('*', { count: 'exact', head: true });

    // Get leaderboard data
    let dataQuery = supabase
      .from('leaderboard_view')
      .select('*')
      .order('total_score', { ascending: false })
      .order('games_won', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Apply date filter if needed
    if (dateFilter) {
      // For time-based filtering, we need to query games directly
      // This is a more complex query that joins games with users
      const { data, error } = await supabase.rpc('get_leaderboard_by_period', {
        p_start_date: dateFilter,
        p_limit: limitNum,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        // Fall back to simpler query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_stats')
          .select(`
            user_id,
            total_games,
            games_won,
            games_lost,
            total_score,
            users (telegram_id, username, first_name, photo_url)
          `)
          .order('total_score', { ascending: false })
          .range(offset, offset + limitNum - 1);

        if (fallbackError) {
          return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }

        return res.json({
          success: true,
          leaderboard: fallbackData.map((item, index) => ({
            rank: offset + index + 1,
            userId: item.users?.telegram_id,
            username: item.users?.username,
            firstName: item.users?.first_name,
            photoUrl: item.users?.photo_url,
            totalGames: item.total_games,
            gamesWon: item.games_won,
            gamesLost: item.games_lost,
            totalScore: item.total_score,
            winRate: item.total_games > 0 
              ? Math.round((item.games_won / item.total_games) * 100) 
              : 0
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            period,
            hasMore: fallbackData.length === limitNum
          }
        });
      }

      return res.json({
        success: true,
        leaderboard: data.map((item, index) => ({
          rank: offset + index + 1,
          userId: item.telegram_id,
          username: item.username,
          firstName: item.first_name,
          photoUrl: item.photo_url,
          totalGames: item.total_games,
          gamesWon: item.games_won,
          gamesLost: item.games_lost,
          totalScore: item.total_score,
          winRate: item.total_games > 0 
            ? Math.round((item.games_won / item.total_games) * 100) 
            : 0
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          period,
          hasMore: data.length === limitNum
        }
      });
    }

    // All-time leaderboard (simpler query)
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        total_games,
        games_won,
        games_lost,
        total_score,
        users (telegram_id, username, first_name, photo_url)
      `)
      .order('total_score', { ascending: false })
      .order('games_won', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    res.json({
      success: true,
      leaderboard: data.map((item, index) => ({
        rank: offset + index + 1,
        userId: item.users?.telegram_id,
        username: item.users?.username,
        firstName: item.users?.first_name,
        photoUrl: item.users?.photo_url,
        totalGames: item.total_games,
        gamesWon: item.games_won,
        gamesLost: item.games_lost,
        totalScore: item.total_score,
        winRate: item.total_games > 0 
          ? Math.round((item.games_won / item.total_games) * 100) 
          : 0
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        period,
        hasMore: data.length === limitNum
      }
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}));

/**
 * GET /api/leaderboard/user/:userId
 * Get a specific user's rank on the leaderboard
 */
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { period = 'all' } = req.query;

  // Get user's stats
  const { data: userStats, error } = await supabase
    .from('user_stats')
    .select(`
      *,
      users (telegram_id, username, first_name, photo_url)
    `)
    .eq('users.telegram_id', userId)
    .single();

  if (error || !userStats) {
    return res.status(404).json({ error: 'User not found on leaderboard' });
  }

  // Calculate rank (count users with higher score)
  const { count } = await supabase
    .from('user_stats')
    .select('*', { count: 'exact', head: true })
    .gt('total_score', userStats.total_score);

  const rank = (count || 0) + 1;

  res.json({
    success: true,
    rank,
    stats: {
      userId: userStats.users?.telegram_id,
      username: userStats.users?.username,
      firstName: userStats.users?.first_name,
      photoUrl: userStats.users?.photo_url,
      totalGames: userStats.total_games,
      gamesWon: userStats.games_won,
      gamesLost: userStats.games_lost,
      totalScore: userStats.total_score,
      winRate: userStats.total_games > 0 
        ? Math.round((userStats.games_won / userStats.total_games) * 100) 
        : 0
    }
  });
}));

/**
 * GET /api/leaderboard/top/:count
 * Get top N players
 */
router.get('/top/:count', asyncHandler(async (req, res) => {
  const { count } = req.params;
  const limit = Math.min(10, Math.max(1, parseInt(count) || 10));

  const { data, error } = await supabase
    .from('user_stats')
    .select(`
      user_id,
      total_games,
      games_won,
      games_lost,
      total_score,
      users (telegram_id, username, first_name, photo_url)
    `)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top players:', error);
    return res.status(500).json({ error: 'Failed to fetch top players' });
  }

  res.json({
    success: true,
    leaderboard: data.map((item, index) => ({
      rank: index + 1,
      userId: item.users?.telegram_id,
      username: item.users?.username,
      firstName: item.users?.first_name,
      photoUrl: item.users?.photo_url,
      totalGames: item.total_games,
      gamesWon: item.games_won,
      gamesLost: item.games_lost,
      totalScore: item.total_score,
      winRate: item.total_games > 0 
        ? Math.round((item.games_won / item.total_games) * 100) 
        : 0
    }))
  });
}));

module.exports = router;