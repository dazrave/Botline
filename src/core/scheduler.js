import logger from './logger.js';
import config from '../config/index.js';

// Keepalive message sent to Claude to maintain credit replenishment cycle
export const KEEPALIVE_MESSAGE = 'hello world (keepalive)';

/**
 * CreditTimerKeeper - Maintains Claude's credit replenishment cycle
 * by sending periodic heartbeat messages
 */
class CreditTimerKeeper {
  constructor() {
    this.enabled = config.creditKeeper.enabled;
    this.interval = config.creditKeeper.interval * 60 * 1000; // Convert minutes to ms
    this.cooldown = config.creditKeeper.cooldown * 60 * 1000; // Convert minutes to ms
    this.timer = null;
    this.nextHeartbeat = null;
    this.isPaused = false;
    this.pauseTimer = null;
    this.sendMessageCallback = null;
  }

  /**
   * Start the credit keeper timer
   */
  start(sendMessageCallback) {
    if (!sendMessageCallback) {
      throw new Error('sendMessageCallback is required');
    }

    this.sendMessageCallback = sendMessageCallback;

    if (!this.enabled) {
      logger.info('Credit Timer Keeper is disabled in config');
      return;
    }

    if (this.timer) {
      logger.warn('Credit Timer Keeper is already running');
      return;
    }

    logger.info(`Credit Timer Keeper starting: interval=${config.creditKeeper.interval}min, cooldown=${config.creditKeeper.cooldown}min`);
    
    this.scheduleNextHeartbeat();
  }

  /**
   * Stop the credit keeper timer
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.nextHeartbeat = null;
      logger.info('Credit Timer Keeper stopped');
    }

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    this.isPaused = false;
  }

  /**
   * Enable the credit keeper
   */
  enable() {
    if (this.enabled) {
      logger.info('Credit Timer Keeper is already enabled');
      return;
    }

    this.enabled = true;
    logger.info('Credit Timer Keeper enabled');

    if (this.sendMessageCallback) {
      this.scheduleNextHeartbeat();
    }
  }

  /**
   * Disable the credit keeper
   */
  disable() {
    if (!this.enabled) {
      logger.info('Credit Timer Keeper is already disabled');
      return;
    }

    this.enabled = false;
    this.stop();
    logger.info('Credit Timer Keeper disabled');
  }

  /**
   * Pause the timer after a real message is sent
   */
  pauseAfterRealMessage() {
    if (!this.enabled || this.isPaused) {
      return;
    }

    logger.info(`Credit Timer Keeper pausing for ${config.creditKeeper.cooldown} minutes after real message`);
    
    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Clear existing pause timer
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    this.isPaused = true;
    this.nextHeartbeat = new Date(Date.now() + this.cooldown);

    // Schedule resume after cooldown
    this.pauseTimer = setTimeout(() => {
      logger.info('Credit Timer Keeper resuming after cooldown');
      this.isPaused = false;
      this.pauseTimer = null;
      this.scheduleNextHeartbeat();
    }, this.cooldown);
  }

  /**
   * Schedule the next heartbeat
   */
  scheduleNextHeartbeat() {
    if (!this.enabled || this.isPaused) {
      return;
    }

    // Clear existing timer if any
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.nextHeartbeat = new Date(Date.now() + this.interval);
    
    this.timer = setTimeout(async () => {
      try {
        await this.sendHeartbeat();
      } finally {
        // Always schedule next heartbeat, even if current one failed
        this.scheduleNextHeartbeat();
      }
    }, this.interval);

    logger.debug(`Next heartbeat scheduled for: ${this.nextHeartbeat.toISOString()}`);
  }

  /**
   * Send a heartbeat message to Claude
   */
  async sendHeartbeat() {
    if (!this.enabled || this.isPaused) {
      return;
    }

    const startTime = Date.now();
    
    try {
      logger.info('Credit Timer Keeper: Sending heartbeat to Claude');
      
      await this.sendMessageCallback(KEEPALIVE_MESSAGE);
      
      const responseTime = Date.now() - startTime;
      logger.info(`Credit Timer Keeper: Heartbeat successful (${responseTime}ms)`);
    } catch (error) {
      logger.error('Credit Timer Keeper: Heartbeat failed:', error.message);
    }
  }

  /**
   * Get the status of the credit keeper
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: !!this.timer || this.isPaused,
      paused: this.isPaused,
      nextHeartbeat: this.nextHeartbeat,
      interval: config.creditKeeper.interval,
      cooldown: config.creditKeeper.cooldown,
    };
  }
}

export const creditTimerKeeper = new CreditTimerKeeper();
export default creditTimerKeeper;
