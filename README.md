# Botline 🤖

Botline is your direct hotline to chaos, charm, and cleverness. It connects Slack or Telegram straight to your favourite AI agents so you can summon code, answers, or existential dread without ever leaving chat. Think of it as customer service for your digital overlords.

## Features

- 🔌 **Multi-Platform Support**: Connect via Slack (Socket Mode) or Telegram (Bot API)
- 🤖 **Multiple AI Agents**: Support for Claude (Anthropic) and OpenRouter (multiple models)
- 🛠️ **CLI Agent Communication**: Bidirectional communication with CLI-based agents (Claude CLI, Opencode, etc.)
- 🔄 **Real-time Message Relay**: Seamless bidirectional communication between chat platforms and AI
- 🏗️ **Modular Architecture**: Easy to extend with new platforms or AI agents
- 📝 **Comprehensive Logging**: Built-in logging system for debugging and monitoring
- 🔒 **Security**: IP whitelisting, shared secrets, and access control
- 💬 **Chat Commands**: Built-in commands for agent management (/help, /status, /agents, /start)
- 📊 **Status Monitoring**: Real-time status endpoints with agent information
- 🔁 **Auto-Retry**: Reliable message delivery with exponential backoff
- 🚀 **Easy Setup**: Interactive setup wizard via `npm run setup`

## Architecture

Botline uses a modular adapter pattern with an event-driven message bus:

```
Chat Platform (Slack/Telegram) → Platform Adapter → Message Bus → Router → AI Agent
                                         ↓                               ↓
CLI Agent Bridge ← ← ← ← ← ← ← ← ← Agent Registry ← ← ← ← ← ← ← Response
```

### Components

- **Platform Adapters**: Handle communication with chat platforms (Slack, Telegram)
- **Agent Adapters**: Handle communication with AI services (Claude, OpenRouter)
- **Message Bus**: EventEmitter-based system with middleware support
- **Agent Registry**: Manages CLI agents and their callback URLs
- **Message Router**: Routes messages between platforms and agents
- **Command Handler**: Processes chat commands (/help, /status, etc.)
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
npm run setup
```

Or manually:
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

### CLI Agent Communication

Botline can also communicate with CLI-based agents like Claude CLI, Opencode, and custom automation tools.

#### Quick Start with CLI Agents

1. **Start a CLI Bridge:**
```bash
cd bridges
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4040 \
node cli-bridge.js my-agent echo "Hello"
```

2. **Register the Agent:**
```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "callbackUrl": "http://127.0.0.1:4040/reply",
    "description": "My CLI agent"
  }'
```

3. **Use Chat Commands:**
```
/agents - List all registered agents
/status - Show system status
/start my-agent "do something" - Start an agent task
/help - Show all commands
```

For detailed information, see [CLI Agent Communication Guide](CLI_AGENTS.md).

## API Endpoints

### Monitoring

- `GET /health`: Health check endpoint that returns the status and configured platforms/agents
- `GET /status`: Detailed status including uptime, agent information, and message buffer stats

Example `/health` response:
```json
{
  "status": "ok",
  "platforms": ["slack", "telegram"],
  "agents": ["claude", "openrouter"]
}
```

Example `/status` response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "platforms": ["slack"],
  "aiAgents": ["claude"],
  "cliAgents": {
    "total": 2,
    "active": 2,
    "list": [...]
  },
  "messageBuffer": {
    "size": 15,
    "maxSize": 100
  },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 64
  }
}
```

### Agent Management

- `POST /agents/register`: Register a new CLI agent
- `GET /agents`: List all registered agents
- `POST /notify`: Agents send notifications to users
- `POST /reply`: Send replies to agents

See [CLI Agent Communication Guide](CLI_AGENTS.md) for complete API documentation.

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
│   │   ├── router.js        # Message routing
│   │   ├── messageBus.js    # EventEmitter-based message bus
│   │   ├── agentRegistry.js # CLI agent registry
│   │   ├── agentCommunicator.js # Agent communication with retry logic
│   │   ├── commandHandler.js # Chat command processor
│   │   └── middleware.js    # Middleware functions
│   └── index.js             # Main application
├── bridges/
│   ├── cli-bridge.js        # CLI agent bridge example
│   └── README.md            # Bridge documentation
├── scripts/
│   └── setup.js             # Interactive setup wizard
├── .env.example             # Example environment variables
├── .gitignore
├── package.json
├── README.md                # This file
├── CLI_AGENTS.md            # CLI agent communication guide
├── ARCHITECTURE.md          # Architecture documentation
└── QUICKSTART.md            # Quick start guide
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
