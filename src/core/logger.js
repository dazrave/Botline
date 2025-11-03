import config from '../config/index.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
  }

  log(level, message, ...args) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      console.log(prefix, message, ...args);
    }
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
}

export const logger = new Logger();
export default logger;
