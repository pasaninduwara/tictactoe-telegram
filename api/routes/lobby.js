/**
 * Lobby Routes
 * Handles game lobby creation, joining, and management
 */

const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { generateLobbyId } = require('../lib/game-logic');
const { asyncHandler } = require('../lib/middleware');
const { generateMiniAppLink } = require('../lib/telegram');

/**
 * POST /api/lobby/create
 * Create a new game lobby
 */
router.post('/create', asyncHandler(async (req, res) => {
  const { hostUserId, hostUsername, hostFirstName } = req.body;

  if (!hostUserId) {
    return res.status(400).json({ error: 'hostUserId is required' });
  }

  // Generate unique lobby ID
  let lobbyId;
  let attempts = 0;
  let isUnique = false;

  while (!isUnique && attempts < 10) {
    lobbyId = generateLobbyId();
    
    // Check if lobby ID already exists
    const { data: existing } = await supabase
      .from('lobbies')
      .select('id')
      .eq('lobby_code', lobbyId)
      .single();

    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    return res.status(500).json({ error: 'Failed to generate unique lobby ID' });
  }

  // Create lobby in database
  const { data: lobby, error } = await supabaseAdmin
    .from('lobbies')
    .insert({
      lobby_code: lobbyId,
      host_user_id: hostUserId,
      host_username: hostUsername,
      host_first_name: hostFirstName,
      status: 'waiting',
      current_players: 1,
      max_players: 2,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating lobby:', error);
    return res.status(500).json({ error: 'Failed to create lobby' });
  }

  // Generate invite link
  const botUsername = process.env.BOT_USERNAME || 'your_bot';
  const inviteLink = generateMiniAppLink(botUsername, lobbyId);

  res.json({
    success: true,
    lobby: {
      id: lobby.id,
      lobbyCode: lobbyId,
      status: 'waiting',
      hostUserId,
      inviteLink,
      currentPlayers: 1,
      maxPlayers: 2
    }
  });
}));

/**
 * POST /api/lobby/join
 * Join an existing lobby
 */
router.post('/join', asyncHandler(async (req, res) => {
  const { lobbyCode, userId, username, firstName } = req.body;

  if (!lobbyCode || !userId) {
    return res.status(400).json({ error: 'lobbyCode and userId are required' });
  }

  // Find the lobby
  const { data: lobby, error: findError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('lobby_code', lobbyCode.toUpperCase())
    .single();

  if (findError || !lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Check lobby status
  if (lobby.status !== 'waiting') {
    return res.status(400).json({ error: 'Lobby is not accepting new players' });
  }

  // Check if lobby is full
  if (lobby.current_players >= lobby.max_players) {
    return res.status(400).json({ error: 'Lobby is full' });
  }

  // Check if user is already in the lobby (as host)
  if (lobby.host_user_id === userId) {
    return res.json({
      success: true,
      lobby: {
        id: lobby.id,
        lobbyCode: lobby.lobby_code,
        status: lobby.status,
        isHost: true,
        hostUserId: lobby.host_user_id,
        hostUsername: lobby.host_username,
        hostFirstName: lobby.host_first_name,
        currentPlayers: lobby.current_players
      }
    });
  }

  // Add guest player
  const { error: updateError } = await supabaseAdmin
    .from('lobbies')
    .update({
      guest_user_id: userId,
      guest_username: username,
      guest_first_name: firstName,
      current_players: 2,
      status: 'ready'
    })
    .eq('id', lobby.id);

  if (updateError) {
    console.error('Error joining lobby:', updateError);
    return res.status(500).json({ error: 'Failed to join lobby' });
  }

  res.json({
    success: true,
    lobby: {
      id: lobby.id,
      lobbyCode: lobby.lobby_code,
      status: 'ready',
      isHost: false,
      hostUserId: lobby.host_user_id,
      hostUsername: lobby.host_username,
      hostFirstName: lobby.host_first_name,
      guestUserId: userId,
      guestUsername: username,
      guestFirstName: firstName,
      currentPlayers: 2
    }
  });
}));

/**
 * GET /api/lobby/:lobbyCode
 * Get lobby information
 */
router.get('/:lobbyCode', asyncHandler(async (req, res) => {
  const { lobbyCode } = req.params;

  const { data: lobby, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('lobby_code', lobbyCode.toUpperCase())
    .single();

  if (error || !lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  res.json({
    success: true,
    lobby: {
      id: lobby.id,
      lobbyCode: lobby.lobby_code,
      status: lobby.status,
      hostUserId: lobby.host_user_id,
      hostUsername: lobby.host_username,
      hostFirstName: lobby.host_first_name,
      guestUserId: lobby.guest_user_id,
      guestUsername: lobby.guest_username,
      guestFirstName: lobby.guest_first_name,
      currentPlayers: lobby.current_players,
      maxPlayers: lobby.max_players,
      createdAt: lobby.created_at
    }
  });
}));

/**
 * POST /api/lobby/:lobbyCode/start
 * Start a game from a ready lobby
 */
router.post('/:lobbyCode/start', asyncHandler(async (req, res) => {
  const { lobbyCode } = req.params;
  const { hostUserId } = req.body;

  const { data: lobby, error: findError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('lobby_code', lobbyCode.toUpperCase())
    .single();

  if (findError || !lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Only host can start the game
  if (lobby.host_user_id !== hostUserId) {
    return res.status(403).json({ error: 'Only the host can start the game' });
  }

  if (lobby.status !== 'ready') {
    return res.status(400).json({ error: 'Lobby is not ready to start' });
  }

  // Create game in database
  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .insert({
      lobby_id: lobby.id,
      player_x_id: lobby.host_user_id,
      player_x_name: lobby.host_username || lobby.host_first_name,
      player_o_id: lobby.guest_user_id,
      player_o_name: lobby.guest_username || lobby.guest_first_name,
      current_turn: 'X',
      board: Array(6).fill(null).map(() => Array(6).fill(null)),
      status: 'in_progress',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (gameError) {
    console.error('Error creating game:', gameError);
    return res.status(500).json({ error: 'Failed to create game' });
  }

  // Update lobby status
  await supabaseAdmin
    .from('lobbies')
    .update({ status: 'in_progress', game_id: game.id })
    .eq('id', lobby.id);

  res.json({
    success: true,
    game: {
      id: game.id,
      lobbyId: lobby.id,
      playerXId: game.player_x_id,
      playerXName: game.player_x_name,
      playerOId: game.player_o_id,
      playerOName: game.player_o_name,
      currentTurn: game.current_turn,
      status: game.status
    }
  });
}));

/**
 * POST /api/lobby/:lobbyCode/leave
 * Leave a lobby
 */
router.post('/:lobbyCode/leave', asyncHandler(async (req, res) => {
  const { lobbyCode } = req.params;
  const { userId } = req.body;

  const { data: lobby, error: findError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('lobby_code', lobbyCode.toUpperCase())
    .single();

  if (findError || !lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // If host leaves, delete the lobby
  if (lobby.host_user_id === userId) {
    await supabaseAdmin
      .from('lobbies')
      .delete()
      .eq('id', lobby.id);

    return res.json({ success: true, message: 'Lobby closed' });
  }

  // If guest leaves, remove them
  if (lobby.guest_user_id === userId) {
    await supabaseAdmin
      .from('lobbies')
      .update({
        guest_user_id: null,
        guest_username: null,
        guest_first_name: null,
        current_players: 1,
        status: 'waiting'
      })
      .eq('id', lobby.id);

    return res.json({ success: true, message: 'Left lobby' });
  }

  res.status(400).json({ error: 'User not in lobby' });
}));

/**
 * GET /api/lobby/public/list
 * Get list of public waiting lobbies (optional feature)
 */
router.get('/public/list', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const { data: lobbies, error } = await supabase
    .from('lobbies')
    .select('id, lobby_code, host_user_id, host_username, host_first_name, current_players, created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (error) {
    console.error('Error fetching lobbies:', error);
    return res.status(500).json({ error: 'Failed to fetch lobbies' });
  }

  res.json({
    success: true,
    lobbies: lobbies.map(l => ({
      id: l.id,
      lobbyCode: l.lobby_code,
      hostName: l.host_username || l.host_first_name,
      currentPlayers: l.current_players,
      createdAt: l.created_at
    }))
  });
}));

module.exports = router;