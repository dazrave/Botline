import TelegramBot from 'node-telegram-bot-api';
import logger from '../../core/logger.js';
import config from '../../config/index.js';
import messageRouter from '../../core/router.js';

/**
 * Telegram Platform Adapter
 * Handles communication with Telegram using Bot API
 */
class TelegramAdapter {
  constructor() {
    this.bot = null;
  }

  /**
   * Initialize the Telegram adapter
   */
  async initialize() {
    try {
      if (!config.telegram.botToken) {
        logger.warn('Telegram bot token not configured. Telegram adapter will not start.');
        return false;
      }

      // Use polling for simplicity (webhook can be used in production)
      this.bot = new TelegramBot(config.telegram.botToken, {
        polling: true,
      });

      // Set up event handlers
      this.setupEventHandlers();

      logger.info('Telegram adapter initialized with polling');

      // Get bot info
      const me = await this.bot.getMe();
      logger.info(`Telegram bot username: @${me.username}`);

      return true;
    } catch (error) {
      logger.error('Error initializing Telegram adapter:', error);
      throw error;
    }
  }

  /**
   * Set up Telegram event handlers
   */
  setupEventHandlers() {
    // Handle all text messages
    this.bot.on('message', async (msg) => {
      try {
        // Ignore non-text messages
        if (!msg.text) {
          return;
        }

        // Ignore messages from bots
        if (msg.from.is_bot) {
          return;
        }

        await this.handleMessage(msg);
      } catch (error) {
        logger.error('Error handling Telegram message:', error);
        await this.sendErrorMessage(msg.chat.id);
      }
    });

    logger.debug('Telegram event handlers set up');
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(msg) {
    try {
      const message = msg.text;
      const chatId = msg.chat.id;

      logger.info(`Received Telegram message from user ${msg.from.id} (${msg.from.username}): ${message}`);

      const context = {
        platform: 'telegram',
        chatId,
        userId: msg.from.id,
        username: msg.from.username,
        messageId: msg.message_id,
      };

      await messageRouter.routeMessage('telegram', message, context);
    } catch (error) {
      logger.error('Error handling Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send a message to Telegram
   */
  async sendMessage(response, context) {
    try {
      await this.bot.sendMessage(context.chatId, response.text, {
        parse_mode: 'Markdown',
        reply_to_message_id: context.messageId,
      });

      logger.debug('Message sent to Telegram');
    } catch (error) {
      logger.error('Error sending message to Telegram:', error);
      throw error;
    }
  }

  /**
   * Send an error message
   */
  async sendErrorMessage(chatId) {
    try {
      await this.bot.sendMessage(
        chatId,
        'Sorry, I encountered an error processing your message. Please try again.'
      );
    } catch (error) {
      logger.error('Error sending error message to Telegram:', error);
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured() {
    return config.telegram.enabled;
  }

  /**
   * Stop the bot
   */
  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
      logger.info('Telegram bot stopped');
    }
  }

  /**
   * Broadcast a message (for agent notifications)
   */
  async broadcastMessage(message) {
    try {
      // For now, we'll log that broadcast is not implemented
      // In a real implementation, you might maintain a list of subscribed users
      logger.info('Telegram broadcast not implemented - would send:', message);
      
      // Example implementation:
      // if (this.subscribedUsers) {
      //   for (const userId of this.subscribedUsers) {
      //     await this.bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
      //   }
      // }
    } catch (error) {
      logger.error('Error broadcasting message to Telegram:', error);
    }
  }
}

export default TelegramAdapter;
