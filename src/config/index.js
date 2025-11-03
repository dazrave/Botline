import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    enabled: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
  },
  agents: {
    default: process.env.DEFAULT_AGENT || 'claude',
    claude: {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      enabled: !!process.env.CLAUDE_API_KEY,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      enabled: !!process.env.OPENROUTER_API_KEY,
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
