# Example Configurations

This directory contains example configurations for different use cases.

## Basic Setup Examples

### 1. Slack + Claude

The simplest setup - connect Slack to Claude AI.

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token

# Claude Configuration
CLAUDE_API_KEY=sk-ant-your-claude-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

DEFAULT_AGENT=claude
LOG_LEVEL=info
```

### 2. Telegram + OpenRouter

Use Telegram with any AI model via OpenRouter.

```env
PORT=3000

# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-your-openrouter-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

DEFAULT_AGENT=openrouter
LOG_LEVEL=info
```

### 3. Multi-Platform + Multi-Agent

Run both Slack and Telegram with multiple AI models.

```env
PORT=3000

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_APP_TOKEN=xapp-your-slack-app-token

# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Claude Configuration
CLAUDE_API_KEY=sk-ant-your-claude-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4-turbo

DEFAULT_AGENT=claude
LOG_LEVEL=info
```

## Usage Examples

### Example 1: Simple Q&A

**User (via Slack):**
```
@Botline what is the capital of France?
```

**Botline (Claude responds):**
```
The capital of France is Paris.
```

### Example 2: Code Generation

**User (via Telegram):**
```
Write a Python function to calculate fibonacci numbers
```

**Botline (via OpenRouter):**
```python
def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b
```

### Example 3: Direct Messages

Both Slack and Telegram support direct messages to the bot - no need to mention it.

**User (DM to Botline):**
```
Explain quantum computing in simple terms
```

**Botline:**
```
Quantum computing uses quantum mechanical phenomena like superposition 
and entanglement to process information. Unlike classical computers that 
use bits (0 or 1), quantum computers use qubits that can be in multiple 
states simultaneously...
```

## Advanced Configurations

### Production Deployment

For production, consider:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Use environment-specific secrets
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
CLAUDE_API_KEY=${CLAUDE_API_KEY}

# Consider using webhooks for Telegram in production
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram
```

### Development with Debug Logging

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# ... your tokens
```

## Integration Patterns

### 1. Personal AI Assistant
- Single Telegram bot
- Claude for general queries
- Used by individuals for daily tasks

### 2. Team Collaboration
- Slack workspace integration
- Multiple channels
- Claude for code review, documentation, brainstorming

### 3. Customer Support
- Telegram bot for customer queries
- OpenRouter with GPT-4 for better multilingual support
- Can be extended with custom context/knowledge base

### 4. Development Team
- Slack integration
- Both Claude and OpenRouter available
- Different models for different purposes:
  - Claude for code review
  - GPT-4 for documentation
