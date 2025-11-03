import express from 'express';
import config from './config/index.js';
import logger from './core/logger.js';
import messageRouter from './core/router.js';

// Import adapters
import ClaudeAdapter from './adapters/agents/claude.js';
import OpenRouterAdapter from './adapters/agents/openrouter.js';
import SlackAdapter from './adapters/platforms/slack.js';
import TelegramAdapter from './adapters/platforms/telegram.js';

/**
 * Botline - Message relay between chat platforms and AI agents
 */
class Botline {
  constructor() {
    this.app = express();
    this.platformAdapters = {};
    this.agentAdapters = {};
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      logger.info('Initializing Botline...');

      // Setup Express middleware
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          platforms: messageRouter.getPlatforms(),
          agents: messageRouter.getAgents(),
        });
      });

      // Initialize AI agent adapters
      await this.initializeAgents();

      // Initialize platform adapters
      await this.initializePlatforms();

      // Start server
      await this.startServer();

      logger.info('Botline initialized successfully');
    } catch (error) {
      logger.error('Error initializing Botline:', error);
      throw error;
    }
  }

  /**
   * Initialize AI agent adapters
   */
  async initializeAgents() {
    logger.info('Initializing AI agent adapters...');

    // Claude
    if (config.agents.claude.enabled) {
      const claude = new ClaudeAdapter();
      if (claude.isConfigured()) {
        this.agentAdapters.claude = claude;
        messageRouter.registerAgent('claude', claude);
      }
    }

    // OpenRouter
    if (config.agents.openrouter.enabled) {
      const openrouter = new OpenRouterAdapter();
      if (openrouter.isConfigured()) {
        this.agentAdapters.openrouter = openrouter;
        messageRouter.registerAgent('openrouter', openrouter);
      }
    }

    // Set default agent
    if (messageRouter.getAgents().length > 0) {
      const defaultAgent = config.agents.default;
      if (messageRouter.getAgents().includes(defaultAgent)) {
        messageRouter.setDefaultAgent(defaultAgent);
      } else {
        messageRouter.setDefaultAgent(messageRouter.getAgents()[0]);
        logger.warn(`Default agent ${defaultAgent} not available, using ${messageRouter.getAgents()[0]}`);
      }
    } else {
      logger.warn('No AI agents configured. Please configure at least one agent.');
    }
  }

  /**
   * Initialize platform adapters
   */
  async initializePlatforms() {
    logger.info('Initializing platform adapters...');

    // Slack
    if (config.slack.enabled) {
      const slack = new SlackAdapter();
      if (slack.isConfigured()) {
        await slack.initialize();
        this.platformAdapters.slack = slack;
        messageRouter.registerPlatform('slack', slack);
      }
    }

    // Telegram
    if (config.telegram.enabled) {
      const telegram = new TelegramAdapter();
      if (telegram.isConfigured()) {
        await telegram.initialize();
        this.platformAdapters.telegram = telegram;
        messageRouter.registerPlatform('telegram', telegram);
      }
    }

    if (messageRouter.getPlatforms().length === 0) {
      logger.warn('No platform adapters configured. Please configure at least one platform (Slack or Telegram).');
    }
  }

  /**
   * Start the Express server
   */
  async startServer() {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.server.port, () => {
        logger.info(`Botline server listening on port ${config.server.port}`);
        resolve();
      });
    });
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown() {
    logger.info('Shutting down Botline...');

    // Stop Telegram polling if active
    if (this.platformAdapters.telegram) {
      await this.platformAdapters.telegram.stop();
    }

    // Close Express server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    logger.info('Botline shut down successfully');
  }
}

// Create and start the application
const botline = new Botline();

// Handle shutdown signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await botline.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await botline.shutdown();
  process.exit(0);
});

// Start the application
botline.initialize().catch((error) => {
  logger.error('Failed to start Botline:', error);
  process.exit(1);
});

export default Botline;
