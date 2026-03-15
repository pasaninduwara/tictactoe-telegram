/**
 * Authentication Routes
 * Handles Telegram WebApp authentication and channel subscription verification
 */

const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { validateTelegramWebAppData, checkChannelMembership } = require('../lib/telegram');
const { asyncHandler } = require('../lib/middleware');

/**
 * POST /api/auth/validate
 * Validate Telegram WebApp initData and return user info
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { initData } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData) {
    return res.status(400).json({ error: 'initData is required' });
  }

  if (!botToken) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  // Validate the initData
  const validationResult = validateTelegramWebAppData(initData, botToken);

  if (!validationResult || !validationResult.valid) {
    return res.status(401).json({ error: 'Invalid authentication data' });
  }

  const user = validationResult.user;

  // Upsert user in database
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from('users')
    .upsert({
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      language_code: user.language_code || 'en',
      photo_url: user.photo_url || null,
      last_seen: new Date().toISOString()
    }, {
      onConflict: 'telegram_id',
      update: {
        username: user.username || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        photo_url: user.photo_url || null,
        last_seen: new Date().toISOString()
      }
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database error:', dbError);
    // Continue anyway - user is authenticated
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      languageCode: user.language_code,
      photoUrl: user.photo_url,
      dbId: dbUser?.id
    },
    startParam: validationResult.startParam
  });
}));

/**
 * POST /api/auth/check-subscription
 * Check if user is subscribed to the required channel
 */
router.post('/check-subscription', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const requiredChannelId = process.env.REQUIRED_CHANNEL_ID;

  // If no channel is configured, return success
  if (!requiredChannelId) {
    return res.json({
      success: true,
      isSubscribed: true,
      channelRequired: false
    });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!botToken) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  // Check channel membership
  const membershipResult = await checkChannelMembership(botToken, requiredChannelId, userId);

  res.json({
    success: true,
    isSubscribed: membershipResult.isMember,
    channelRequired: true,
    channelId: requiredChannelId,
    status: membershipResult.status
  });
}));

/**
 * GET /api/auth/channel-info
 * Get information about the required channel
 */
router.get('/channel-info', asyncHandler(async (req, res) => {
  const requiredChannelId = process.env.REQUIRED_CHANNEL_ID;

  if (!requiredChannelId) {
    return res.json({
      channelRequired: false
    });
  }

  // Return channel info (you might want to cache this)
  res.json({
    channelRequired: true,
    channelId: requiredChannelId,
    // The frontend can construct the invite link
    inviteLink: requiredChannelId.startsWith('@') 
      ? `https://t.me/${requiredChannelId.substring(1)}`
      : null
  });
}));

/**
 * POST /api/auth/logout
 * Handle user logout (if needed)
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is typically handled client-side
  // This endpoint can be used for logging or cleanup if needed
  res.json({ success: true, message: 'Logged out successfully' });
}));

module.exports = router;