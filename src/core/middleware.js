import logger from './logger.js';
import agentRegistry from './agentRegistry.js';

/**
 * Logging middleware - logs all messages passing through
 */
export async function loggingMiddleware(message, context, next) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] Message from ${context.platform || context.from || 'unknown'}:`, {
    message: message.substring(0, 100),
    user: context.user || context.username,
  });
  
  await next();
}

/**
 * Access control middleware - verifies agent access
 */
export async function accessControlMiddleware(message, context, next) {
  // Only apply to agent messages
  if (context.from && context.type === 'agent') {
    const agentName = context.from;
    
    // Verify agent is registered
    if (!agentRegistry.hasAgent(agentName)) {
      logger.warn(`Access denied: Unknown agent ${agentName}`);
      throw new Error(`Agent ${agentName} is not registered`);
    }

    // Verify secret if provided
    if (context.secret && !agentRegistry.verifySecret(agentName, context.secret)) {
      logger.warn(`Access denied: Invalid secret for agent ${agentName}`);
      throw new Error('Invalid agent secret');
    }

    // Verify IP if available
    if (context.ip && !agentRegistry.isIPAllowed(agentName, context.ip)) {
      logger.warn(`Access denied: IP ${context.ip} not allowed for agent ${agentName}`);
      throw new Error('IP address not allowed');
    }

    logger.debug(`Access granted for agent ${agentName}`);
  }

  await next();
}

/**
 * User filtering middleware - restricts which users can interact
 */
export async function userFilterMiddleware(message, context, next) {
  // This is a placeholder for user-based filtering
  // Can be extended to check allowed users list from config
  
  if (context.platform && context.user) {
    logger.debug(`User ${context.user} from ${context.platform} authorized`);
  }

  await next();
}

/**
 * Rate limiting middleware - prevents spam
 */
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;

export async function rateLimitMiddleware(message, context, next) {
  const key = context.user || context.from || context.ip || 'unknown';
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    const limit = rateLimits.get(key);
    
    if (now > limit.resetAt) {
      // Reset the counter
      limit.count = 1;
      limit.resetAt = now + RATE_LIMIT_WINDOW;
    } else {
      limit.count++;
      
      if (limit.count > MAX_MESSAGES_PER_WINDOW) {
        logger.warn(`Rate limit exceeded for ${key}`);
        throw new Error('Rate limit exceeded. Please slow down.');
      }
    }
  }

  await next();
}

/**
 * Message validation middleware - validates message format
 */
export async function validationMiddleware(message, context, next) {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format');
  }

  if (message.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (message.length > 10000) {
    throw new Error('Message too long (max 10000 characters)');
  }

  await next();
}

/**
 * Command detection middleware - detects and marks commands
 */
export async function commandDetectionMiddleware(message, context, next) {
  if (message.startsWith('/')) {
    const parts = message.split(' ');
    const command = parts[0].substring(1).toLowerCase();
    const args = parts.slice(1);
    
    context.isCommand = true;
    context.command = command;
    context.args = args;
    
    logger.debug(`Command detected: ${command}`, { args });
  }

  await next();
}

export default {
  loggingMiddleware,
  accessControlMiddleware,
  userFilterMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
  commandDetectionMiddleware,
};
