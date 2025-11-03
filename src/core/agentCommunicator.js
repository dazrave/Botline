import axios from 'axios';
import logger from './logger.js';

/**
 * AgentCommunicator - Handles communication with CLI agents
 * Includes retry logic for reliability
 */
class AgentCommunicator {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 2;
    this.retryDelay = options.retryDelay || 1000; // ms
    this.timeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Send a message to an agent with retry logic
   */
  async sendToAgent(agentUrl, message, options = {}) {
    const retries = options.retries || this.maxRetries;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retry attempt ${attempt} for ${agentUrl}`);
          await this.delay(this.retryDelay * attempt);
        }

        const response = await axios.post(
          agentUrl,
          message,
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Botline/1.0',
              ...(options.headers || {}),
            },
          }
        );

        logger.info(`Message delivered to agent: ${agentUrl}`);
        return response.data;
      } catch (error) {
        logger.warn(`Failed to send to ${agentUrl} (attempt ${attempt + 1}/${retries + 1}):`, error.message);
        
        if (attempt === retries) {
          // Last attempt failed
          logger.error(`All retry attempts failed for ${agentUrl}`);
          throw new Error(`Failed to communicate with agent after ${retries + 1} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Send reply to agent
   */
  async sendReply(agentUrl, reply, context = {}) {
    const payload = {
      from: context.username || context.user || 'User',
      reply: reply,
      timestamp: new Date().toISOString(),
    };

    // Add secret header if available
    const headers = {};
    if (context.secret) {
      headers['X-Agent-Secret'] = context.secret;
    }

    return await this.sendToAgent(agentUrl, payload, { headers });
  }

  /**
   * Notify user via agent
   */
  async notifyUser(agentUrl, notification, context = {}) {
    const payload = {
      from: context.from || 'Botline',
      message: notification,
      timestamp: new Date().toISOString(),
    };

    return await this.sendToAgent(agentUrl, payload);
  }

  /**
   * Delay helper for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send with exponential backoff
   */
  async sendWithBackoff(agentUrl, message, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffDelay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.info(`Exponential backoff retry ${attempt} for ${agentUrl}, waiting ${backoffDelay}ms`);
          await this.delay(backoffDelay);
        }

        const response = await axios.post(
          agentUrl,
          message,
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Botline/1.0',
              ...(options.headers || {}),
            },
          }
        );

        logger.info(`Message delivered to agent with backoff: ${agentUrl}`);
        return response.data;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries + 1} attempts with exponential backoff: ${error.message}`);
        }
      }
    }
  }
}

export const agentCommunicator = new AgentCommunicator();
export default agentCommunicator;
