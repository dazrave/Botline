import { EventEmitter } from 'events';
import logger from './logger.js';

/**
 * MessageBus - EventEmitter-based system for clean adapter separation
 * Provides a central event system for message flow and middleware hooks
 */
class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.middleware = [];
    this.messageBuffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Add middleware function for processing messages
   * Middleware signature: async (message, context, next) => void
   */
  use(middlewareFn) {
    this.middleware.push(middlewareFn);
    logger.debug(`Middleware registered: ${middlewareFn.name || 'anonymous'}`);
  }

  /**
   * Execute middleware chain
   */
  async executeMiddleware(message, context) {
    let index = 0;

    const next = async () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        await middleware(message, context, next);
      }
    };

    await next();
  }

  /**
   * Publish a message through the bus
   */
  async publish(event, message, context = {}) {
    try {
      // Add to buffer
      const messagePreview = typeof message === 'string' ? message : JSON.stringify(message);
      this.addToBuffer({ event, message: messagePreview, context, timestamp: new Date() });

      // Execute middleware
      await this.executeMiddleware(message, context);

      // Emit event
      this.emit(event, message, context);

      logger.debug(`Message published: ${event}`, { 
        message: messagePreview.substring(0, 50) 
      });
    } catch (error) {
      logger.error(`Error publishing message to event ${event}:`, error);
      this.emit('error', error, { event, message, context });
      throw error;
    }
  }

  /**
   * Add message to in-memory buffer
   */
  addToBuffer(entry) {
    this.messageBuffer.push(entry);
    
    // Keep buffer size limited
    if (this.messageBuffer.length > this.maxBufferSize) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Get recent messages from buffer
   */
  getRecentMessages(count = 10) {
    return this.messageBuffer.slice(-count);
  }

  /**
   * Clear message buffer
   */
  clearBuffer() {
    this.messageBuffer = [];
    logger.debug('Message buffer cleared');
  }

  /**
   * Get buffer statistics
   */
  getBufferStats() {
    return {
      size: this.messageBuffer.length,
      maxSize: this.maxBufferSize,
      oldest: this.messageBuffer[0]?.timestamp,
      newest: this.messageBuffer[this.messageBuffer.length - 1]?.timestamp,
    };
  }
}

export const messageBus = new MessageBus();
export default messageBus;
