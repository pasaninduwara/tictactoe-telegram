/**
 * Telegram API Utilities
 * Handles validation of Telegram WebApp data and API calls
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

/**
 * Validates Telegram WebApp initData
 * This ensures the request is genuinely from Telegram
 * 
 * @param {string} initData - The initData string from Telegram WebApp
 * @param {string} botToken - Your bot's token
 * @returns {Object|null} Parsed user data if valid, null otherwise
 */
function validateTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) {
    return null;
  }

  try {
    // Parse the query string
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return null;
    }

    // Remove hash from params for verification
    params.delete('hash');

    // Create data-check-string by sorting params alphabetically
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key using HMAC-SHA256 with "WebAppData" as key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate the hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare hashes
    if (calculatedHash !== hash) {
      console.log('Hash mismatch: Invalid initData');
      return null;
    }

    // Check auth_date (optional: reject old data)
    const authDate = parseInt(params.get('auth_date') || '0');
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (currentTime - authDate > maxAge) {
      console.log('Auth data too old');
      return null;
    }

    // Parse user data
    const userJson = params.get('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      valid: true,
      user,
      queryId: params.get('query_id'),
      authDate,
      startParam: params.get('start_param'),
      chatType: params.get('chat_type'),
      chatInstance: params.get('chat_instance')
    };
  } catch (error) {
    console.error('Error validating initData:', error);
    return null;
  }
}

/**
 * Check if a user is a member of a Telegram channel/group
 * Uses Telegram Bot API getChatMember method
 * 
 * @param {string} botToken - Your bot's token
 * @param {string} chatId - Channel/Group ID (e.g., @username or -1001234567890)
 * @param {number} userId - Telegram user ID
 * @returns {Promise<Object>} Membership status info
 */
async function checkChannelMembership(botToken, chatId, userId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      console.log('getChatMember error:', data.description);
      return {
        isMember: false,
        status: 'error',
        error: data.description
      };
    }

    const memberStatus = data.result.status;
    
    // These statuses indicate the user is a member
    const memberStatuses = ['creator', 'administrator', 'member'];
    // These statuses indicate the user has left or is restricted
    const nonMemberStatuses = ['left', 'kicked', 'restricted'];

    const isMember = memberStatuses.includes(memberStatus);

    return {
      isMember,
      status: memberStatus,
      canInviteUsers: data.result.can_invite_users || false
    };
  } catch (error) {
    console.error('Error checking channel membership:', error);
    return {
      isMember: false,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Send a message via Telegram Bot API
 * 
 * @param {string} botToken - Your bot's token
 * @param {number|string} chatId - Target chat ID
 * @param {string} text - Message text
 * @param {Object} options - Additional options (parse_mode, reply_markup, etc.)
 * @returns {Promise<Object>} API response
 */
async function sendTelegramMessage(botToken, chatId, text, options = {}) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const body = {
      chat_id: chatId,
      text,
      ...options
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Generate a Telegram deep link for the Mini App
 * 
 * @param {string} botUsername - Your bot's username
 * @param {string} startParam - Optional start parameter (e.g., lobby ID)
 * @returns {string} The deep link URL
 */
function generateMiniAppLink(botUsername, startParam = '') {
  const baseUrl = `https://t.me/${botUsername}`;
  if (startParam) {
    return `${baseUrl}?startapp=${encodeURIComponent(startParam)}`;
  }
  return `${baseUrl}?startapp`;
}

/**
 * Generate a direct Mini App link
 * 
 * @param {string} botUsername - Your bot's username
 * @param {string} appPath - App path (e.g., 'game')
 * @param {string} startParam - Optional start parameter
 * @returns {string} The direct link URL
 */
function generateDirectMiniAppLink(botUsername, appPath = '', startParam = '') {
  let url = `https://t.me/${botUsername}`;
  if (appPath) {
    url += `/${appPath}`;
  }
  if (startParam) {
    url += `?startapp=${encodeURIComponent(startParam)}`;
  }
  return url;
}

module.exports = {
  validateTelegramWebAppData,
  checkChannelMembership,
  sendTelegramMessage,
  generateMiniAppLink,
  generateDirectMiniAppLink
};