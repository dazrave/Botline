# CLI Agent Communication Guide

This guide explains how to use Botline as a communication hub for CLI-based AI agents.

## Overview

Botline has been enhanced to support bidirectional communication with CLI-based agents like Claude CLI, Opencode, and custom automation tools. This transforms Botline from a simple message relay into a comprehensive agent communication system.

## Core Concept

```
You (Slack/Telegram) ↔ Botline ↔ CLI Agent Bridge ↔ CLI Agent Process
```

### Key Features

- **Agent Registry**: Track and manage CLI agents
- **Message Bus**: EventEmitter-based system for clean separation
- **Middleware**: Logging, filtering, and access control
- **Commands**: Built-in commands for agent management
- **Security**: IP whitelisting and shared secrets
- **Auto-Retry**: Reliable message delivery with exponential backoff
- **Message Buffer**: In-memory storage of recent messages

## Quick Start

### 1. Interactive Setup

Run the interactive setup wizard:

```bash
npm run setup
```

This will guide you through configuring:
- Server settings
- Security options
- Platform credentials (Slack/Telegram)
- AI agent API keys

### 2. Start Botline

```bash
npm start
```

### 3. Start a CLI Bridge

```bash
cd bridges
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4040 \
node cli-bridge.js my-agent echo "Hello from agent"
```

### 4. Register the Agent

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "callbackUrl": "http://127.0.0.1:4040/reply",
    "description": "My CLI agent",
    "secret": "optional-secret",
    "allowedIPs": ["127.0.0.1"]
  }'
```

## API Endpoints

### Agent Management

#### POST /agents/register
Register a new CLI agent.

**Request:**
```json
{
  "name": "claude-cli",
  "callbackUrl": "http://127.0.0.1:4040/reply",
  "description": "Claude CLI for code review",
  "secret": "my-secret-key",
  "allowedIPs": ["127.0.0.1", "::1"]
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Agent registered successfully",
  "agent": {
    "name": "claude-cli",
    "callbackUrl": "http://127.0.0.1:4040/reply",
    "active": true
  }
}
```

#### GET /agents
List all registered agents.

**Response:**
```json
{
  "agents": [
    {
      "name": "claude-cli",
      "active": true,
      "lastSeen": "2025-11-03T12:00:00.000Z",
      "description": "Claude CLI for code review"
    }
  ]
}
```

### Agent Communication

#### POST /notify
Agents send notifications/questions to users.

**Request:**
```json
{
  "from": "claude-cli",
  "message": "Need clarification: should I push to main or dev?"
}
```

**Headers:**
```
X-Agent-Secret: your-secret-key
```

**Response:**
```json
{
  "ok": true,
  "message": "Notification sent",
  "timestamp": "2025-11-03T12:00:00.000Z"
}
```

#### POST /reply
Send replies back to agents.

**Request:**
```json
{
  "to": "claude-cli",
  "reply": "Push to dev — main auto-pulls overnight.",
  "from": "User"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Reply sent to agent",
  "response": {}
}
```

### Monitoring

#### GET /health
Basic health check.

**Response:**
```json
{
  "status": "ok",
  "platforms": ["slack", "telegram"],
  "agents": ["claude", "openrouter"]
}
```

#### GET /status
Detailed system status.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "platforms": ["slack"],
  "aiAgents": ["claude"],
  "cliAgents": {
    "total": 2,
    "active": 2,
    "list": [
      {
        "name": "claude-cli",
        "active": true,
        "lastSeen": "2025-11-03T12:00:00.000Z"
      }
    ]
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

## Chat Commands

Use these commands in Slack or Telegram:

### /help
Show available commands.

```
/help
```

### /status
Show system status and uptime.

```
/status
```

**Output:**
```
**Botline Status**

**System:**
• Uptime: 2h 15m 30s
• Memory: 45.32 MB

**Agents:**
• Total: 3
• Active: 2
• Inactive: 1

**Active Agents:**
• claude-cli - Last seen: 2 minutes ago
• qa-agent - Last seen: 5 seconds ago
```

### /agents
List all registered CLI agents.

```
/agents
```

### /start
Start an agent task.

```
/start claude-cli "review recent commits"
```

### /buffer
Show recent messages from the buffer.

```
/buffer 10
```

## Security

### IP Whitelisting

Restrict which IPs can send notifications:

```bash
# In .env
ALLOWED_IPS=127.0.0.1,::1,192.168.1.100
```

Or per-agent:
```json
{
  "name": "my-agent",
  "allowedIPs": ["127.0.0.1"]
}
```

### Shared Secrets

Authenticate agent requests:

```bash
# In .env
SHARED_SECRET=my-global-secret
```

Or per-agent:
```json
{
  "name": "my-agent",
  "secret": "agent-specific-secret"
}
```

Send the secret in requests:
```bash
curl -X POST http://localhost:3000/notify \
  -H "X-Agent-Secret: agent-specific-secret" \
  -d '{"from":"my-agent","message":"Hello"}'
```

### User Restrictions

Limit which users can interact with Botline:

```bash
# In .env
ALLOWED_USERS=user1,user2,admin
```

## Message Bus & Middleware

Botline uses an EventEmitter-based message bus with middleware support.

### Built-in Middleware

1. **Validation** - Validates message format
2. **Logging** - Logs all messages
3. **Command Detection** - Detects `/` commands
4. **Access Control** - Verifies agent permissions
5. **Rate Limiting** - Prevents spam (30 messages/minute)

### Custom Middleware

Add custom middleware in `src/index.js`:

```javascript
import messageBus from './core/messageBus.js';

messageBus.use(async (message, context, next) => {
  // Your custom logic
  console.log('Processing message:', message);
  await next();
});
```

## CLI Bridges

### Creating a Bridge

Bridges connect CLI agents to Botline. See `bridges/cli-bridge.js` for a complete example.

Basic structure:
```javascript
import express from 'express';
import { spawn } from 'child_process';

const app = express();
const agent = spawn('my-cli-tool', ['--arg']);

// Monitor stdout
agent.stdout.on('data', async (data) => {
  const message = data.toString().trim();
  // Send to Botline /notify
});

// Accept replies
app.post('/reply', (req, res) => {
  const { reply } = req.body;
  agent.stdin.write(`${reply}\n`);
  res.json({ ok: true });
});

app.listen(4040);
```

### Running Multiple Bridges

```bash
# Terminal 1 - Claude CLI
BRIDGE_PORT=4040 node cli-bridge.js claude-cli claude --project MyApp

# Terminal 2 - QA Agent
BRIDGE_PORT=4041 node cli-bridge.js qa-agent python qa_bot.py

# Terminal 3 - Review Agent
BRIDGE_PORT=4042 node cli-bridge.js review go run ./review-tool
```

### Auto-Restart

Bridges automatically restart CLI agents if they exit:

```javascript
agent.on('exit', (code) => {
  if (shouldRestart) {
    setTimeout(startAgent, 5000);
  }
});
```

## Example Workflows

### Code Review with Claude CLI

1. Start the bridge:
```bash
BRIDGE_PORT=4040 node cli-bridge.js claude-cli claude --project MyApp
```

2. Register the agent:
```bash
curl -X POST http://localhost:3000/agents/register \
  -d '{"name":"claude-cli","callbackUrl":"http://127.0.0.1:4040/reply"}'
```

3. Claude encounters a question:
```
Claude: Should I use async/await or promises for this function?
```

4. Botline forwards to Slack/Telegram

5. You reply in chat:
```
Use async/await for better readability
```

6. Botline sends to bridge → bridge writes to Claude's stdin → Claude continues

### QA Automation

1. QA agent runs tests and encounters failure
2. Agent outputs to stdout: "Test suite failed on line 45"
3. Bridge sends to Botline `/notify`
4. You receive notification in Telegram
5. You reply: "Skip that test, it's a known issue"
6. Bridge forwards your reply to the agent
7. Agent continues with next test

## Deployment

### Local Development

```bash
npm start
```

### Production

```bash
NODE_ENV=production npm start
```

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t botline .
docker run -d -p 3000:3000 --env-file .env botline
```

### Exposing Bridges

For remote agents, expose bridges securely:

**ngrok:**
```bash
ngrok http 4040
```

**Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:4040
```

**Tailscale:**
```bash
# Create a Tailscale network and connect both Botline and bridges
```

## Troubleshooting

### Agent Registration Failed

**Problem:** Agent registration returns 400/500 error

**Solution:**
- Check all required fields are provided
- Verify callback URL is accessible
- Check Botline logs for details

### Messages Not Appearing

**Problem:** Agent sends notifications but they don't appear in chat

**Solution:**
- Verify agent is registered (`GET /agents`)
- Check agent's last seen timestamp
- Verify platform adapters are configured
- Check Botline logs

### Reply Not Reaching Agent

**Problem:** Your reply doesn't reach the CLI agent

**Solution:**
- Verify agent's callback URL is correct
- Check bridge is running and listening
- Verify agent's stdin is writable
- Check bridge logs

### IP Blocked

**Problem:** Agent notifications return 403 Forbidden

**Solution:**
- Check agent's IP is in allowedIPs list
- For localhost, allow both `127.0.0.1` and `::1`
- Check ALLOWED_IPS in .env

## Best Practices

1. **Use Secrets**: Always configure agent secrets in production
2. **Whitelist IPs**: Restrict agent communication to known IPs
3. **Monitor Health**: Regularly check `/status` endpoint
4. **Buffer Size**: Adjust message buffer size based on your needs
5. **Log Rotation**: Implement log rotation for production
6. **Restart Agents**: Configure auto-restart for critical agents
7. **Secure Tunnels**: Use Tailscale or Cloudflare Tunnel for remote agents

## Advanced Configuration

### Custom Message Buffer Size

Edit `src/core/messageBus.js`:
```javascript
this.maxBufferSize = 500; // Increase from default 100
```

### Custom Retry Logic

Edit `src/core/agentCommunicator.js`:
```javascript
this.maxRetries = 5; // Increase from default 2
this.retryDelay = 2000; // Increase from default 1000ms
```

### Custom Middleware

Add to `src/index.js`:
```javascript
import messageBus from './core/messageBus.js';

// Custom analytics middleware
messageBus.use(async (message, context, next) => {
  await analytics.track('message', { platform: context.platform });
  await next();
});
```

## Resources

- [Main README](README.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Quick Start Guide](QUICKSTART.md)
- [Bridge Examples](bridges/README.md)
- [Contributing Guide](CONTRIBUTING.md)
