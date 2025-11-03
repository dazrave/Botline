import axios from 'axios';
import logger from '../../core/logger.js';
import config from '../../config/index.js';
import creditTimerKeeper, { KEEPALIVE_MESSAGE } from '../../core/scheduler.js';

/**
 * Claude AI Agent Adapter
 * Handles communication with Anthropic's Claude API
 */
class ClaudeAdapter {
  constructor() {
    this.apiKey = config.agents.claude.apiKey;
    this.model = config.agents.claude.model;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.apiVersion = '2023-06-01';
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(message, context = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Claude API key not configured');
      }

      // Check if this is a keepalive message
      const isKeepalive = message === KEEPALIVE_MESSAGE;

      if (!isKeepalive) {
        // Pause timer keeper when real message is sent
        creditTimerKeeper.pauseAfterRealMessage();
      }

      logger.debug('Sending message to Claude:', { message, model: this.model, isKeepalive });

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          max_tokens: context.maxTokens || 4096,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': this.apiVersion,
          },
        }
      );

      const reply = response.data.content[0].text;
      logger.debug('Received response from Claude');

      return {
        text: reply,
        model: this.model,
        agent: 'claude',
      };
    } catch (error) {
      logger.error('Error communicating with Claude:', error.response?.data || error.message);
      throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

export default ClaudeAdapter;
