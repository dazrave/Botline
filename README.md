# Botline 🤖

Botline is your direct hotline to chaos, charm, and cleverness. It connects Slack or Telegram straight to your favourite AI agents so you can summon code, answers, or existential dread without ever leaving chat. Think of it as customer service for your digital overlords.

## Features

- 🔌 **Multi-Platform Support**: Connect via Slack (Socket Mode) or Telegram (Bot API)
- 🤖 **Multiple AI Agents**: Support for Claude (Anthropic) and OpenRouter (multiple models)
- 🔄 **Real-time Message Relay**: Seamless bidirectional communication between chat platforms and AI
- 🏗️ **Modular Architecture**: Easy to extend with new platforms or AI agents
- 📝 **Comprehensive Logging**: Built-in logging system for debugging and monitoring
- 🚀 **Easy Setup**: Simple configuration via environment variables

## Architecture

Botline uses a modular adapter pattern:

```
Chat Platform (Slack/Telegram) → Platform Adapter → Message Router → Agent Adapter → AI Service (Claude/OpenRouter)
                                                                                            ↓
                                  Response ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### Components

- **Platform Adapters**: Handle communication with chat platforms (Slack, Telegram)
- **Agent Adapters**: Handle communication with AI services (Claude, OpenRouter)
- **Message Router**: Routes messages between platforms and agents
- **Configuration Manager**: Centralized configuration from environment variables
- **Logger**: Structured logging with configurable levels

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for your chosen platforms and AI services

### Setup

1. Clone the repository:
```bash
git clone https://github.com/dazrave/Botline.git
cd Botline
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys and configuration.

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

#### Server Configuration
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)

#### Slack Configuration
- `SLACK_BOT_TOKEN`: Your Slack bot token (xoxb-...)
- `SLACK_APP_TOKEN`: Your Slack app token (xapp-...)
- `SLACK_SIGNING_SECRET`: Your Slack signing secret

#### Telegram Configuration
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

#### AI Agent Configuration
- `DEFAULT_AGENT`: Default AI agent to use (claude/openrouter)
- `CLAUDE_API_KEY`: Your Anthropic Claude API key
- `CLAUDE_MODEL`: Claude model to use (default: claude-3-5-sonnet-20241022)
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `OPENROUTER_MODEL`: Model to use via OpenRouter

### Setting up Slack

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Socket Mode and get an App Token
3. Add Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `im:history`
   - `im:read`
4. Install the app to your workspace
5. Copy the Bot Token and App Token to your `.env` file

### Setting up Telegram

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to your `.env` file

### Setting up AI Agents

#### Claude (Anthropic)
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to your `.env` file

#### OpenRouter
1. Get an API key from [openrouter.ai](https://openrouter.ai)
2. Add it to your `.env` file
3. Choose any supported model (e.g., `anthropic/claude-3.5-sonnet`, `openai/gpt-4`, etc.)

## Usage

### Start the server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Interact with Botline

#### Via Slack
- Mention the bot in any channel: `@Botline what is the weather?`
- Send a direct message to the bot

#### Via Telegram
- Send any message to your bot

The bot will forward your message to the configured AI agent and relay the response back to you.

## API Endpoints

- `GET /health`: Health check endpoint that returns the status and configured platforms/agents

Example response:
```json
{
  "status": "ok",
  "platforms": ["slack", "telegram"],
  "agents": ["claude", "openrouter"]
}
```

## Project Structure

```
Botline/
├── src/
│   ├── adapters/
│   │   ├── agents/          # AI agent adapters
│   │   │   ├── claude.js
│   │   │   └── openrouter.js
│   │   └── platforms/       # Chat platform adapters
│   │       ├── slack.js
│   │       └── telegram.js
│   ├── config/
│   │   └── index.js         # Configuration management
│   ├── core/
│   │   ├── logger.js        # Logging utility
│   │   └── router.js        # Message routing
│   └── index.js             # Main application
├── .env.example             # Example environment variables
├── .gitignore
├── package.json
└── README.md
```

## Extending Botline

### Adding a New Platform Adapter

Create a new file in `src/adapters/platforms/`:

```javascript
class MyPlatformAdapter {
  async initialize() {
    // Setup platform connection
  }

  async sendMessage(response, context) {
    // Send message to platform
  }

  isConfigured() {
    // Check if configured
  }
}
```

Register it in `src/index.js`:
```javascript
import MyPlatformAdapter from './adapters/platforms/myplatform.js';

// In initializePlatforms()
const myplatform = new MyPlatformAdapter();
await myplatform.initialize();
messageRouter.registerPlatform('myplatform', myplatform);
```

### Adding a New AI Agent Adapter

Create a new file in `src/adapters/agents/`:

```javascript
class MyAgentAdapter {
  async sendMessage(message, context) {
    // Send to AI service and return response
    return {
      text: reply,
      model: this.model,
      agent: 'myagent',
    };
  }

  isConfigured() {
    // Check if configured
  }
}
```

Register it in `src/index.js`:
```javascript
import MyAgentAdapter from './adapters/agents/myagent.js';

// In initializeAgents()
const myagent = new MyAgentAdapter();
messageRouter.registerAgent('myagent', myagent);
```

## Troubleshooting

### Common Issues

1. **"No AI agents configured"**: Ensure you've set at least one AI agent API key in `.env`
2. **"No platform adapters configured"**: Ensure you've configured at least Slack or Telegram credentials
3. **Slack connection issues**: Verify Socket Mode is enabled and you have the correct tokens
4. **Telegram polling errors**: Check your bot token is valid

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file to see detailed logs.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
