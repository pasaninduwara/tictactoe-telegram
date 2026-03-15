/**
 * Express Middleware Utilities
 */

/**
 * Authentication middleware
 * Validates Telegram WebApp initData from request headers
 */
function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData) {
    return res.status(401).json({ error: 'No authentication data provided' });
  }

  const { validateTelegramWebAppData } = require('./telegram');
  const validationResult = validateTelegramWebAppData(initData, botToken);

  if (!validationResult || !validationResult.valid) {
    return res.status(401).json({ error: 'Invalid authentication data' });
  }

  // Attach user info to request
  req.user = validationResult.user;
  req.telegramData = validationResult;
  next();
}

/**
 * Optional authentication middleware
 * Validates if data is present, but doesn't require it
 */
function optionalAuthMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (initData && botToken) {
    const { validateTelegramWebAppData } = require('./telegram');
    const validationResult = validateTelegramWebAppData(initData, botToken);

    if (validationResult && validationResult.valid) {
      req.user = validationResult.user;
      req.telegramData = validationResult;
    }
  }

  next();
}

/**
 * Error handler wrapper for async functions
 * Catches errors and passes them to Express error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, consider using a proper rate limiting solution
 */
const rateLimitMap = new Map();

function rateLimitMiddleware(windowMs = 60000, maxRequests = 100) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${Math.floor(Date.now() / windowMs)}`;
    
    const current = rateLimitMap.get(key) || 0;
    
    if (current >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: windowMs / 1000
      });
    }
    
    rateLimitMap.set(key, current + 1);
    
    // Clean up old entries
    if (rateLimitMap.size > 10000) {
      const oldKey = `${ip}:${Math.floor(Date.now() / windowMs) - 1}`;
      rateLimitMap.delete(oldKey);
    }
    
    next();
  };
}

/**
 * Request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  asyncHandler,
  rateLimitMiddleware,
  validateRequest
};