import axios from 'axios';
import logger from '../../core/logger.js';
import config from '../../config/index.js';

/**
 * OpenRouter AI Agent Adapter
 * Handles communication with OpenRouter API (supports multiple AI models)
 */
class OpenRouterAdapter {
  constructor() {
    this.apiKey = config.agents.openrouter.apiKey;
    this.model = config.agents.openrouter.model;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Send a message to OpenRouter and get a response
   */
  async sendMessage(message, context = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      logger.debug('Sending message to OpenRouter:', { message, model: this.model });

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
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
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/dazrave/Botline',
            'X-Title': 'Botline',
          },
        }
      );

      const reply = response.data.choices[0].message.content;
      logger.debug('Received response from OpenRouter');

      return {
        text: reply,
        model: this.model,
        agent: 'openrouter',
      };
    } catch (error) {
      logger.error('Error communicating with OpenRouter:', error.response?.data || error.message);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

export default OpenRouterAdapter;
