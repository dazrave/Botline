# CLI Agent Bridges

This directory contains example bridge implementations for connecting CLI-based agents to Botline.

## Overview

CLI agents (like Claude CLI, Opencode, etc.) communicate through stdin/stdout. Bridges act as an adapter between these CLI tools and Botline's HTTP API.

```
Botline ↔ HTTP ↔ Bridge ↔ stdin/stdout ↔ CLI Agent
```

## How It Works

### Agent → You
1. CLI agent outputs to stdout
2. Bridge captures the output
3. Bridge sends to Botline's `/notify` endpoint
4. Botline forwards to Slack/Telegram
5. You receive the message

### You → Agent
1. You reply in Slack/Telegram
2. Botline sends to bridge's `/reply` endpoint
3. Bridge writes to CLI agent's stdin
4. Agent processes your input

## Using the CLI Bridge

### Basic Usage

```bash
node cli-bridge.js <agent-name> <command> [args...]
```

### Examples

**Claude CLI:**
```bash
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4040 \
node cli-bridge.js claude-cli claude --project MyProject
```

**Custom Script:**
```bash
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4041 \
node cli-bridge.js my-agent python my_agent.py
```

**With Secret:**
```bash
BOTLINE_URL=http://localhost:3000 \
BRIDGE_PORT=4042 \
AGENT_SECRET=my-secret-key \
node cli-bridge.js secure-agent ./my-cli-tool
```

### Environment Variables

- `BOTLINE_URL` - URL of your Botline server (default: `http://localhost:3000`)
- `BRIDGE_PORT` - Port for the bridge server (default: `4040`)
- `AGENT_SECRET` - Optional secret for authenticating with Botline

### Registering the Agent

After starting the bridge, register it with Botline:

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude-cli",
    "callbackUrl": "http://127.0.0.1:4040/reply",
    "description": "Claude CLI agent for code review",
    "secret": "optional-secret-key",
    "allowedIPs": ["127.0.0.1"]
  }'
```

## Features

### Auto-Restart
The bridge automatically restarts the CLI agent if it exits unexpectedly.

### Security
- Bridge binds to `127.0.0.1` by default (localhost only)
- Supports optional secret authentication
- Can be exposed externally via ngrok, Tailscale, or Cloudflare Tunnel

### Message Flow
- All stdout from the CLI agent is captured and sent to Botline
- All messages from Botline are written to the agent's stdin
- stderr is logged for debugging

## Example: Multi-Agent Setup

Run multiple bridges for different agents:

```bash
# Terminal 1 - Claude CLI
BRIDGE_PORT=4040 node cli-bridge.js claude-cli claude --project Lapser

# Terminal 2 - QA Agent
BRIDGE_PORT=4041 node cli-bridge.js qa-agent python qa_bot.py

# Terminal 3 - Code Review Agent
BRIDGE_PORT=4042 node cli-bridge.js code-review go run ./review-tool
```

## Creating Custom Bridges

You can create custom bridges for specific use cases. See `cli-bridge.js` as a template.

Key components:
1. Spawn the CLI process
2. Monitor stdout and send to `/notify`
3. Accept POST `/reply` and write to stdin
4. Handle process lifecycle (restart, shutdown)

## Deployment

### Local Development
Run the bridge on your local machine alongside Botline.

### Remote Agents
For remote agents, expose the bridge via:

**ngrok:**
```bash
ngrok http 4040
# Register with the ngrok URL
```

**Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:4040
```

**Tailscale:**
Use Tailscale to create a secure network between Botline and bridges.

### Docker

Run bridges in Docker containers:

```dockerfile
FROM node:18
WORKDIR /app
COPY cli-bridge.js .
RUN npm install express
CMD ["node", "cli-bridge.js", "my-agent", "my-command"]
```

## Troubleshooting

### Bridge can't connect to Botline
- Check `BOTLINE_URL` is correct
- Ensure Botline is running
- Check firewall settings

### Agent not receiving replies
- Verify agent is registered in Botline
- Check bridge logs for errors
- Ensure agent's stdin is writable

### Messages not appearing
- Check agent's stdout format
- Verify `/notify` endpoint is working
- Check Botline logs

## Security Best Practices

1. **Localhost Only**: Bind bridge to `127.0.0.1` when possible
2. **Use Secrets**: Set `AGENT_SECRET` for authentication
3. **IP Whitelisting**: Configure allowed IPs in agent registration
4. **Secure Tunnels**: Use Tailscale or Cloudflare Tunnel instead of exposing ports
5. **Monitor Logs**: Watch for unauthorized access attempts

## Example Workflow

1. Start Botline:
   ```bash
   npm start
   ```

2. Start a bridge:
   ```bash
   node bridges/cli-bridge.js claude-cli claude --project MyApp
   ```

3. Register the agent:
   ```bash
   curl -X POST http://localhost:3000/agents/register \
     -H "Content-Type: application/json" \
     -d '{"name":"claude-cli","callbackUrl":"http://127.0.0.1:4040/reply"}'
   ```

4. The CLI agent can now communicate with you via Slack/Telegram!

## Resources

- [Botline Documentation](../README.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Quick Start Guide](../QUICKSTART.md)
