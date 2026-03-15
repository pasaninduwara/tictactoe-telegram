/**
 * Game Routes
 * Handles game actions: moves, state, completion
 */

const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { 
  makeMove, 
  calculateScores, 
  getGameResult, 
  switchPlayer,
  boardToString,
  stringToBoard,
  createEmptyBoard
} = require('../lib/game-logic');
const { asyncHandler } = require('../lib/middleware');

/**
 * GET /api/game/:gameId
 * Get current game state
 */
router.get('/:gameId', asyncHandler(async (req, res) => {
  const { gameId } = req.params;

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Parse board if it's a string
  const board = typeof game.board === 'string' 
    ? stringToBoard(game.board) 
    : game.board;

  const scores = calculateScores(board);

  res.json({
    success: true,
    game: {
      id: game.id,
      lobbyId: game.lobby_id,
      board,
      currentTurn: game.current_turn,
      status: game.status,
      playerXId: game.player_x_id,
      playerXName: game.player_x_name,
      playerOId: game.player_o_id,
      playerOName: game.player_o_name,
      winnerId: game.winner_id,
      scores,
      createdAt: game.created_at,
      completedAt: game.completed_at
    }
  });
}));

/**
 * POST /api/game/:gameId/move
 * Make a move in the game
 */
router.post('/:gameId/move', asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { userId, row, col } = req.body;

  if (userId === undefined || row === undefined || col === undefined) {
    return res.status(400).json({ error: 'userId, row, and col are required' });
  }

  // Get current game state
  const { data: game, error: findError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (findError || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.status !== 'in_progress') {
    return res.status(400).json({ error: 'Game is not in progress' });
  }

  // Determine which player is making the move
  let playerSymbol = null;
  if (game.player_x_id === userId) {
    playerSymbol = 'X';
  } else if (game.player_o_id === userId) {
    playerSymbol = 'O';
  } else {
    return res.status(403).json({ error: 'You are not a player in this game' });
  }

  // Check if it's the player's turn
  if (game.current_turn !== playerSymbol) {
    return res.status(400).json({ error: 'Not your turn' });
  }

  // Parse board
  const currentBoard = typeof game.board === 'string' 
    ? stringToBoard(game.board) 
    : game.board;

  // Make the move
  const moveResult = makeMove(currentBoard, row, col, playerSymbol);

  if (!moveResult.success) {
    return res.status(400).json({ error: moveResult.error });
  }

  const newBoard = moveResult.board;
  const newTurn = switchPlayer(playerSymbol);

  // Check for game completion
  const gameResult = getGameResult(newBoard);
  const scores = calculateScores(newBoard);

  // Prepare update data
  const updateData = {
    board: newBoard,
    current_turn: newTurn
  };

  if (gameResult.gameOver) {
    updateData.status = 'completed';
    updateData.completed_at = new Date().toISOString();

    if (gameResult.winner === 'X') {
      updateData.winner_id = game.player_x_id;
    } else if (gameResult.winner === 'O') {
      updateData.winner_id = game.player_o_id;
    }

    // Calculate final scores
    updateData.player_x_score = scores.X;
    updateData.player_o_score = scores.O;
  }

  // Update game in database
  const { error: updateError } = await supabaseAdmin
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (updateError) {
    console.error('Error updating game:', updateError);
    return res.status(500).json({ error: 'Failed to update game' });
  }

  res.json({
    success: true,
    move: {
      row,
      col,
      player: playerSymbol
    },
    game: {
      id: gameId,
      board: newBoard,
      currentTurn: newTurn,
      status: gameResult.gameOver ? 'completed' : 'in_progress',
      scores,
      gameResult: gameResult.gameOver ? {
        winner: gameResult.winner,
        winnerId: updateData.winner_id || null,
        isDraw: gameResult.isDraw
      } : null
    }
  });

  // Update stats if game is over
  if (gameResult.gameOver) {
    await updateGameStats(game, gameResult, scores);
  }
}));

/**
 * POST /api/game/:gameId/forfeit
 * Forfeit the game
 */
router.post('/:gameId/forfeit', asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { userId } = req.body;

  const { data: game, error: findError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (findError || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.status !== 'in_progress') {
    return res.status(400).json({ error: 'Game is not in progress' });
  }

  // Determine forfeiting player
  let winnerId = null;
  if (game.player_x_id === userId) {
    winnerId = game.player_o_id;
  } else if (game.player_o_id === userId) {
    winnerId = game.player_x_id;
  } else {
    return res.status(403).json({ error: 'You are not a player in this game' });
  }

  // Update game
  const { error: updateError } = await supabaseAdmin
    .from('games')
    .update({
      status: 'forfeited',
      winner_id: winnerId,
      completed_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (updateError) {
    console.error('Error forfeiting game:', updateError);
    return res.status(500).json({ error: 'Failed to forfeit game' });
  }

  // Update lobby status
  if (game.lobby_id) {
    await supabaseAdmin
      .from('lobbies')
      .update({ status: 'completed' })
      .eq('id', game.lobby_id);
  }

  // Update stats
  const currentBoard = typeof game.board === 'string' 
    ? stringToBoard(game.board) 
    : game.board;
  const scores = calculateScores(currentBoard);

  await updateGameStats(game, { winner: winnerId === game.player_x_id ? 'X' : 'O', isDraw: false }, scores, true);

  res.json({
    success: true,
    message: 'Game forfeited',
    winnerId
  });
}));

/**
 * GET /api/game/:gameId/history
 * Get game history (for replay)
 */
router.get('/:gameId/history', asyncHandler(async (req, res) => {
  const { gameId } = req.params;

  const { data: moves, error } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });

  if (error) {
    console.error('Error fetching move history:', error);
    return res.status(500).json({ error: 'Failed to fetch move history' });
  }

  res.json({
    success: true,
    moves: moves || []
  });
}));

/**
 * Helper function to update game statistics
 */
async function updateGameStats(game, gameResult, scores, forfeited = false) {
  try {
    // Update stats for player X
    const xUpdates = {
      total_games: 1,
      total_score: scores.X
    };
    
    if (gameResult.winner === 'X') {
      xUpdates.games_won = 1;
    } else if (gameResult.winner === 'O') {
      xUpdates.games_lost = 1;
    }

    // Update stats for player O
    const oUpdates = {
      total_games: 1,
      total_score: scores.O
    };
    
    if (gameResult.winner === 'O') {
      oUpdates.games_won = 1;
    } else if (gameResult.winner === 'X') {
      oUpdates.games_lost = 1;
    }

    // Use raw SQL to increment stats
    await supabaseAdmin.rpc('update_user_stats', {
      p_user_id: game.player_x_id,
      p_games_won: gameResult.winner === 'X' ? 1 : 0,
      p_games_lost: gameResult.winner === 'O' ? 1 : 0,
      p_total_score: scores.X
    });

    await supabaseAdmin.rpc('update_user_stats', {
      p_user_id: game.player_o_id,
      p_games_won: gameResult.winner === 'O' ? 1 : 0,
      p_games_lost: gameResult.winner === 'X' ? 1 : 0,
      p_total_score: scores.O
    });

    console.log('Stats updated for game:', game.id);
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

module.exports = router;