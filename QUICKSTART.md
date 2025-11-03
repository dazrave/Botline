# Quick Start Guide

This guide will help you get Botline up and running quickly.

## Prerequisites

- Node.js 18 or higher
- At least one of:
  - Slack workspace with admin access
  - Telegram account
- At least one of:
  - Claude API key (from Anthropic)
  - OpenRouter API key

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

### Option A: Interactive Setup (Recommended)

Run the interactive setup wizard:

```bash
npm run setup
```

This will guide you through all configuration options including:
- Server settings
- Security configuration
- Platform credentials (Slack/Telegram)
- AI agent API keys

### Option B: Manual Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. At minimum, you need:
- One platform (Slack OR Telegram)
- One AI agent (Claude OR OpenRouter)

### Minimal Slack + Claude Setup

```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_APP_TOKEN=xapp-your-token-here

# Claude
CLAUDE_API_KEY=sk-ant-your-key-here
DEFAULT_AGENT=claude
```

### Minimal Telegram + OpenRouter Setup

```env
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF-your-token-here

# OpenRouter
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
DEFAULT_AGENT=openrouter
```

## Step 3: Start Botline

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Step 4: Test Your Setup

### Test Slack
1. Invite your bot to a channel
2. Mention it: `@YourBot hello!`
3. Or send it a direct message

### Test Telegram
1. Find your bot on Telegram (search for the username you set with BotFather)
2. Start a chat: `/start`
3. Send any message: `hello!`

### Test Chat Commands
Try these commands in Slack or Telegram:
- `/help` - Show available commands
- `/status` - Show system status
- `/agents` - List registered CLI agents

## Step 5: (Optional) Set Up CLI Agent Communication

To enable bidirectional communication with CLI-based agents:

### 1. Start a CLI Bridge

```bash
cd bridges
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4040 \
node cli-bridge.js my-agent echo "Hello from CLI agent"
```

### 2. Register the Agent

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "callbackUrl": "http://127.0.0.1:4040/reply",
    "description": "My CLI agent"
  }'
```

### 3. Interact with the Agent

In Slack or Telegram:
```
/agents          # See registered agents
/status          # View agent status
```

The CLI agent can now send you messages, and you can reply back!

For more details, see the [CLI Agent Communication Guide](CLI_AGENTS.md).

## Verification

Check if Botline is running:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "platforms": ["slack"],  // or ["telegram"] or both
  "agents": ["claude"]     // or ["openrouter"] or both
}
```

Check detailed status:
```bash
curl http://localhost:3000/status
```

## Troubleshooting

### "No AI agents configured"
- Make sure you've set either `CLAUDE_API_KEY` or `OPENROUTER_API_KEY` in `.env`

### "No platform adapters configured"
- Make sure you've set Slack tokens (`SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`) or Telegram token (`TELEGRAM_BOT_TOKEN`) in `.env`

### Slack not responding
- Ensure Socket Mode is enabled in your Slack app settings
- Verify your app has the required OAuth scopes
- Check that the bot is invited to the channel where you're mentioning it

### Telegram not responding
- Verify your bot token is correct
- Make sure you've started a conversation with the bot (send `/start`)

### CLI Bridge Issues
- Ensure the bridge is running on the correct port
- Verify the agent is registered (`curl http://localhost:3000/agents`)
- Check bridge logs for errors
- Ensure firewall allows localhost connections

### Enable Debug Logging
Add to your `.env`:
```env
LOG_LEVEL=debug
```

## Next Steps

- Read the full [README.md](README.md) for detailed configuration options
- Learn about [CLI Agent Communication](CLI_AGENTS.md)
- Explore the [Architecture Documentation](ARCHITECTURE.md)
- Check out example configurations in [examples/](examples/)
- Explore different AI models via OpenRouter
- Customize the bot's behavior by modifying the adapters
