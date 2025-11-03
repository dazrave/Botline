import express from 'express';
import config from './config/index.js';
import logger from './core/logger.js';
import messageRouter from './core/router.js';
import messageBus from './core/messageBus.js';
import agentRegistry from './core/agentRegistry.js';
import agentCommunicator from './core/agentCommunicator.js';
import middleware from './core/middleware.js';

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

      // Initialize agent registry
      await agentRegistry.initialize();

      // Setup message bus middleware
      this.setupMiddleware();

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

      // Status endpoint with detailed information
      this.app.get('/status', (req, res) => {
        const uptime = process.uptime();
        const agents = agentRegistry.getAllAgents();
        const bufferStats = messageBus.getBufferStats();

        res.json({
          status: 'ok',
          uptime: Math.floor(uptime),
          platforms: messageRouter.getPlatforms(),
          aiAgents: messageRouter.getAgents(),
          cliAgents: {
            total: agents.length,
            active: agents.filter(a => a.active).length,
            list: agents.map(a => ({
              name: a.name,
              active: a.active,
              lastSeen: a.lastSeen,
            })),
          },
          messageBuffer: bufferStats,
          memory: {
            heapUsed: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
          },
        });
      });

      // Agent communication endpoints
      this.setupAgentEndpoints();

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
   * Setup message bus middleware
   */
  setupMiddleware() {
    messageBus.use(middleware.validationMiddleware);
    messageBus.use(middleware.loggingMiddleware);
    messageBus.use(middleware.commandDetectionMiddleware);
    messageBus.use(middleware.accessControlMiddleware);
    messageBus.use(middleware.rateLimitMiddleware);
    
    logger.info('Message bus middleware configured');
  }

  /**
   * Setup agent communication endpoints
   */
  setupAgentEndpoints() {
    // POST /notify - Agents send notifications/messages to users
    this.app.post('/notify', async (req, res) => {
      try {
        const { from, message } = req.body;
        const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

        if (!from || !message) {
          return res.status(400).json({ 
            error: 'Missing required fields: from, message' 
          });
        }

        // Verify agent
        const agent = agentRegistry.getAgent(from);
        if (!agent) {
          logger.warn(`Notify from unregistered agent: ${from}`);
          return res.status(403).json({ 
            error: 'Agent not registered. Please register first.' 
          });
        }

        // Verify IP
        if (!agentRegistry.isIPAllowed(from, ip)) {
          logger.warn(`IP not allowed for agent ${from}: ${ip}`);
          return res.status(403).json({ 
            error: 'IP address not allowed' 
          });
        }

        // Verify secret if provided
        const secret = req.headers['x-agent-secret'];
        if (agent.secret && secret !== agent.secret) {
          logger.warn(`Invalid secret for agent ${from}`);
          return res.status(403).json({ 
            error: 'Invalid agent secret' 
          });
        }

        // Update last seen
        await agentRegistry.updateLastSeen(from);

        // Publish to message bus
        await messageBus.publish('agent:notify', message, {
          from,
          type: 'agent',
          ip,
          timestamp: new Date(),
        });

        // Forward message to all active platforms
        const platforms = messageRouter.getPlatforms();
        const formattedMessage = `🧠 **${from}**: ${message}`;
        
        for (const platformName of platforms) {
          const platform = messageRouter.platformAdapters.get(platformName);
          if (platform && platform.broadcastMessage) {
            await platform.broadcastMessage(formattedMessage);
          }
        }

        logger.info(`Notification from agent ${from} forwarded to platforms`);

        res.json({ 
          ok: true, 
          message: 'Notification sent',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error handling /notify:', error);
        res.status(500).json({ 
          error: error.message 
        });
      }
    });

    // POST /reply - Botline sends replies to agents
    this.app.post('/reply', async (req, res) => {
      try {
        const { to, reply, from } = req.body;

        if (!to || !reply) {
          return res.status(400).json({ 
            error: 'Missing required fields: to, reply' 
          });
        }

        const agent = agentRegistry.getAgent(to);
        if (!agent) {
          return res.status(404).json({ 
            error: `Agent ${to} not found` 
          });
        }

        if (!agent.active) {
          return res.status(400).json({ 
            error: `Agent ${to} is not active` 
          });
        }

        // Send reply to agent
        const response = await agentCommunicator.sendReply(
          agent.callbackUrl,
          reply,
          {
            from: from || 'User',
            secret: agent.secret,
          }
        );

        logger.info(`Reply sent to agent ${to}`);

        res.json({ 
          ok: true,
          message: 'Reply sent to agent',
          response,
        });
      } catch (error) {
        logger.error('Error handling /reply:', error);
        res.status(500).json({ 
          error: error.message 
        });
      }
    });

    // POST /agents/register - Register a new agent
    this.app.post('/agents/register', async (req, res) => {
      try {
        const { name, callbackUrl, description, secret, allowedIPs } = req.body;

        if (!name || !callbackUrl) {
          return res.status(400).json({ 
            error: 'Missing required fields: name, callbackUrl' 
          });
        }

        const agentConfig = await agentRegistry.register(name, {
          callbackUrl,
          description,
          secret,
          allowedIPs: allowedIPs || [],
        });

        logger.info(`New agent registered: ${name}`);

        res.json({ 
          ok: true,
          message: 'Agent registered successfully',
          agent: {
            name,
            callbackUrl: agentConfig.callbackUrl,
            active: agentConfig.active,
          },
        });
      } catch (error) {
        logger.error('Error registering agent:', error);
        res.status(500).json({ 
          error: error.message 
        });
      }
    });

    // GET /agents - List all agents
    this.app.get('/agents', (req, res) => {
      const agents = agentRegistry.getAllAgents();
      res.json({ 
        agents: agents.map(a => ({
          name: a.name,
          active: a.active,
          lastSeen: a.lastSeen,
          description: a.description,
        })),
      });
    });

    logger.info('Agent communication endpoints configured');
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
