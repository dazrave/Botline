import { WebClient } from '@slack/web-api';
import { SocketModeClient } from '@slack/socket-mode';
import logger from '../../core/logger.js';
import config from '../../config/index.js';
import messageRouter from '../../core/router.js';

/**
 * Slack Platform Adapter
 * Handles communication with Slack using Socket Mode
 */
class SlackAdapter {
  constructor() {
    this.webClient = null;
    this.socketClient = null;
    this.botUserId = null;
  }

  /**
   * Initialize the Slack adapter
   */
  async initialize() {
    try {
      if (!config.slack.botToken || !config.slack.appToken) {
        logger.warn('Slack credentials not configured. Slack adapter will not start.');
        return false;
      }

      this.webClient = new WebClient(config.slack.botToken);
      this.socketClient = new SocketModeClient({
        appToken: config.slack.appToken,
      });

      // Get bot user ID
      const authResult = await this.webClient.auth.test();
      this.botUserId = authResult.user_id;
      logger.info(`Slack bot user ID: ${this.botUserId}`);

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to Slack
      await this.socketClient.start();
      logger.info('Slack adapter initialized and connected');

      return true;
    } catch (error) {
      logger.error('Error initializing Slack adapter:', error);
      throw error;
    }
  }

  /**
   * Set up Slack event handlers
   */
  setupEventHandlers() {
    this.socketClient.on('slack_event', async ({ event, body, ack }) => {
      await ack();

      try {
        // Handle app_mention events
        if (event.type === 'app_mention') {
          await this.handleMention(event);
        }
        // Handle direct messages
        else if (event.type === 'message' && event.channel_type === 'im' && !event.bot_id) {
          await this.handleDirectMessage(event);
        }
      } catch (error) {
        logger.error('Error handling Slack event:', error);
      }
    });

    logger.debug('Slack event handlers set up');
  }

  /**
   * Handle @bot mentions
   */
  async handleMention(event) {
    try {
      // Remove the bot mention from the message
      const message = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

      logger.info(`Received Slack mention from user ${event.user}: ${message}`);

      const context = {
        platform: 'slack',
        channel: event.channel,
        user: event.user,
        threadTs: event.thread_ts || event.ts,
      };

      await messageRouter.routeMessage('slack', message, context);
    } catch (error) {
      logger.error('Error handling Slack mention:', error);
      await this.sendErrorMessage(event.channel, event.ts);
    }
  }

  /**
   * Handle direct messages
   */
  async handleDirectMessage(event) {
    try {
      const message = event.text;

      logger.info(`Received Slack DM from user ${event.user}: ${message}`);

      const context = {
        platform: 'slack',
        channel: event.channel,
        user: event.user,
        threadTs: event.thread_ts || event.ts,
      };

      await messageRouter.routeMessage('slack', message, context);
    } catch (error) {
      logger.error('Error handling Slack DM:', error);
      await this.sendErrorMessage(event.channel);
    }
  }

  /**
   * Send a message to Slack
   */
  async sendMessage(response, context) {
    try {
      await this.webClient.chat.postMessage({
        channel: context.channel,
        text: response.text,
        thread_ts: context.threadTs,
      });

      logger.debug('Message sent to Slack');
    } catch (error) {
      logger.error('Error sending message to Slack:', error);
      throw error;
    }
  }

  /**
   * Send an error message
   */
  async sendErrorMessage(channel, threadTs = null) {
    try {
      await this.webClient.chat.postMessage({
        channel,
        text: 'Sorry, I encountered an error processing your message. Please try again.',
        thread_ts: threadTs,
      });
    } catch (error) {
      logger.error('Error sending error message to Slack:', error);
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured() {
    return config.slack.enabled;
  }

  /**
   * Broadcast a message to all channels (for agent notifications)
   */
  async broadcastMessage(message) {
    try {
      // For now, we'll send to a default channel or DM to specific users
      // This can be customized based on your needs
      logger.info('Slack broadcast not implemented - would send:', message);
      
      // In a real implementation, you might:
      // 1. Send to a specific channel configured for agent notifications
      // 2. Send DMs to specific users
      // 3. Use a broadcast channel pattern
      
      // Example: send to a configured channel
      // const channel = config.slack.notificationChannel;
      // if (channel) {
      //   await this.webClient.chat.postMessage({
      //     channel,
      //     text: message,
      //   });
      // }
    } catch (error) {
      logger.error('Error broadcasting message to Slack:', error);
    }
  }
}

export default SlackAdapter;
