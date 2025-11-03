import logger from './logger.js';
import messageBus from './messageBus.js';
import commandHandler from './commandHandler.js';

/**
 * MessageRouter handles routing messages between platforms and AI agents
 */
class MessageRouter {
  constructor() {
    this.platformAdapters = new Map();
    this.agentAdapters = new Map();
    this.defaultAgent = null;
  }

  /**
   * Register a platform adapter (Slack, Telegram, etc.)
   */
  registerPlatform(name, adapter) {
    this.platformAdapters.set(name, adapter);
    logger.info(`Platform adapter registered: ${name}`);
  }

  /**
   * Register an agent adapter (Claude, OpenRouter, etc.)
   */
  registerAgent(name, adapter) {
    this.agentAdapters.set(name, adapter);
    logger.info(`Agent adapter registered: ${name}`);
  }

  /**
   * Set the default agent to use
   */
  setDefaultAgent(agentName) {
    if (!this.agentAdapters.has(agentName)) {
      throw new Error(`Agent ${agentName} not registered`);
    }
    this.defaultAgent = agentName;
    logger.info(`Default agent set to: ${agentName}`);
  }

  /**
   * Route a message from a platform to an AI agent and back
   */
  async routeMessage(platformName, message, context = {}) {
    try {
      logger.debug(`Routing message from ${platformName}:`, message);

      // Publish to message bus (will run through middleware)
      await messageBus.publish('message:incoming', message, {
        ...context,
        platform: platformName,
      });

      // Check if this is a command
      if (context.isCommand && commandHandler.hasCommand(context.command)) {
        const response = await commandHandler.execute(context.command, context.args, context);
        
        // Send command response back to platform
        const platform = this.platformAdapters.get(platformName);
        if (platform && platform.sendMessage) {
          await platform.sendMessage(response, context);
        }

        return response;
      }

      // Get the agent to use (default or specified in context)
      const agentName = context.agent || this.defaultAgent;
      
      if (!agentName) {
        throw new Error('No agent specified and no default agent set');
      }

      const agent = this.agentAdapters.get(agentName);
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      // Send message to AI agent
      logger.info(`Sending message to ${agentName} agent`);
      const response = await agent.sendMessage(message, context);

      // Publish response to message bus
      await messageBus.publish('message:outgoing', response.text, {
        ...context,
        agent: agentName,
      });

      // Send response back to platform
      const platform = this.platformAdapters.get(platformName);
      if (platform && platform.sendMessage) {
        await platform.sendMessage(response, context);
      }

      return response;
    } catch (error) {
      logger.error(`Error routing message from ${platformName}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered platforms
   */
  getPlatforms() {
    return Array.from(this.platformAdapters.keys());
  }

  /**
   * Get all registered agents
   */
  getAgents() {
    return Array.from(this.agentAdapters.keys());
  }
}

export const messageRouter = new MessageRouter();
export default messageRouter;
