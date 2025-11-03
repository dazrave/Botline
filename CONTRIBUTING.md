# Contributing to Botline

Thank you for your interest in contributing to Botline! This guide will help you get started with extending and improving the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your test credentials
4. Run in development mode: `npm run dev`

## Project Architecture

Botline follows a modular adapter pattern:

```
src/
├── adapters/
│   ├── agents/          # AI service adapters
│   │   ├── claude.js
│   │   └── openrouter.js
│   └── platforms/       # Chat platform adapters
│       ├── slack.js
│       └── telegram.js
├── config/              # Configuration management
│   └── index.js
├── core/                # Core functionality
│   ├── logger.js        # Logging utility
│   └── router.js        # Message routing
└── index.js             # Main application
```

## Adding a New Platform Adapter

Platform adapters handle communication with chat platforms (Slack, Telegram, Discord, etc.).

### 1. Create the Adapter

Create `src/adapters/platforms/yourplatform.js`:

```javascript
import logger from '../../core/logger.js';
import config from '../../config/index.js';
import messageRouter from '../../core/router.js';

class YourPlatformAdapter {
  constructor() {
    // Initialize any necessary properties
  }

  async initialize() {
    // Set up connection to the platform
    // Return true if successful, false otherwise
  }

  async sendMessage(response, context) {
    // Send a message back to the platform
    // response = { text: string, model: string, agent: string }
    // context = { platform, channel, user, ... }
  }

  isConfigured() {
    // Return true if the adapter has all required configuration
    return !!config.yourplatform.apiKey;
  }
}

export default YourPlatformAdapter;
```

### 2. Add Configuration

Update `src/config/index.js`:

```javascript
yourplatform: {
  apiKey: process.env.YOURPLATFORM_API_KEY,
  enabled: !!process.env.YOURPLATFORM_API_KEY,
},
```

### 3. Register the Adapter

Update `src/index.js`:

```javascript
import YourPlatformAdapter from './adapters/platforms/yourplatform.js';

// In initializePlatforms()
if (config.yourplatform.enabled) {
  const yourplatform = new YourPlatformAdapter();
  if (yourplatform.isConfigured()) {
    await yourplatform.initialize();
    this.platformAdapters.yourplatform = yourplatform;
    messageRouter.registerPlatform('yourplatform', yourplatform);
  }
}
```

### 4. Update Environment Example

Add to `.env.example`:

```env
# YourPlatform Configuration
YOURPLATFORM_API_KEY=your-api-key
```

## Adding a New AI Agent Adapter

Agent adapters handle communication with AI services.

### 1. Create the Adapter

Create `src/adapters/agents/youragent.js`:

```javascript
import axios from 'axios';
import logger from '../../core/logger.js';
import config from '../../config/index.js';

class YourAgentAdapter {
  constructor() {
    this.apiKey = config.agents.youragent.apiKey;
    this.model = config.agents.youragent.model;
    this.apiUrl = 'https://api.youragent.com/v1/chat';
  }

  async sendMessage(message, context = {}) {
    try {
      // Send message to AI service
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          message: message,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      // Return standardized response
      return {
        text: response.data.reply,
        model: this.model,
        agent: 'youragent',
      };
    } catch (error) {
      logger.error('Error communicating with YourAgent:', error);
      throw error;
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

export default YourAgentAdapter;
```

### 2. Add Configuration

Update `src/config/index.js`:

```javascript
agents: {
  // ... existing agents
  youragent: {
    apiKey: process.env.YOURAGENT_API_KEY,
    model: process.env.YOURAGENT_MODEL || 'default-model',
    enabled: !!process.env.YOURAGENT_API_KEY,
  },
},
```

### 3. Register the Adapter

Update `src/index.js`:

```javascript
import YourAgentAdapter from './adapters/agents/youragent.js';

// In initializeAgents()
if (config.agents.youragent.enabled) {
  const youragent = new YourAgentAdapter();
  if (youragent.isConfigured()) {
    this.agentAdapters.youragent = youragent;
    messageRouter.registerAgent('youragent', youragent);
  }
}
```

### 4. Update Environment Example

Add to `.env.example`:

```env
# YourAgent Configuration
YOURAGENT_API_KEY=your-api-key
YOURAGENT_MODEL=your-model-name
```

## Coding Standards

- Use ES6+ features (modules, async/await, etc.)
- Follow the existing code style
- Add JSDoc comments for all public methods
- Use meaningful variable and function names
- Handle errors gracefully with try/catch blocks
- Log important events using the logger utility

## Testing Your Changes

1. Start Botline in development mode: `npm run dev`
2. Test with actual API credentials
3. Verify error handling by testing with invalid inputs
4. Check logs for any warnings or errors

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit with a clear message: `git commit -m "Add YourPlatform adapter"`
5. Push to your fork: `git push origin feature/your-feature`
6. Create a Pull Request

## Pull Request Guidelines

- Describe what your PR does and why
- Include examples of how to use new features
- Update documentation (README.md, QUICKSTART.md) if needed
- Ensure all existing functionality still works
- Keep changes focused and minimal

## Ideas for Contributions

### Platform Adapters
- Discord
- Microsoft Teams
- WhatsApp
- Matrix
- IRC

### AI Agent Adapters
- OpenAI (GPT-4, GPT-3.5)
- Google PaLM/Gemini
- Cohere
- Hugging Face models
- Local models (Ollama, llama.cpp)

### Features
- Conversation history/context
- Multi-turn conversations
- Streaming responses
- Rate limiting
- User authentication
- Custom prompt templates
- Image/file handling
- Database persistence

## Questions?

Feel free to open an issue for questions or discussions about contributing!
