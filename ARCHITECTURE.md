# Botline Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            BOTLINE                                   │
│                     (Node.js + Express)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Message Router                           │    │
│  │  - Routes messages between platforms and agents             │    │
│  │  - Manages default agent selection                          │    │
│  │  - Handles context propagation                              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                         ▲              ▲                              │
│                         │              │                              │
│         Platform Side   │              │   Agent Side                 │
│                         │              │                              │
│  ┌──────────────────────┴──┐    ┌────┴────────────────────┐         │
│  │  Platform Adapters      │    │  Agent Adapters          │         │
│  ├─────────────────────────┤    ├──────────────────────────┤         │
│  │                         │    │                          │         │
│  │  • Slack Adapter        │    │  • Claude Adapter        │         │
│  │    - Socket Mode        │    │    - Anthropic API       │         │
│  │    - WebSocket          │    │    - Claude 3.5 Sonnet   │         │
│  │    - Event handling     │    │                          │         │
│  │                         │    │  • OpenRouter Adapter    │         │
│  │  • Telegram Adapter     │    │    - OpenRouter API      │         │
│  │    - Bot API            │    │    - Multi-model support │         │
│  │    - Polling/Webhook    │    │    - GPT-4, Claude, etc  │         │
│  │    - Message handling   │    │                          │         │
│  └─────────────────────────┘    └──────────────────────────┘         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Core Components                          │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  • Configuration Manager (dotenv-based)                     │    │
│  │  • Logger (structured logging with levels)                  │    │
│  │  • Express Server (HTTP + WebSocket support)                │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

        ▲                                          ▲
        │                                          │
        │                                          │
        │                                          │
┌───────┴────────┐                         ┌──────┴──────┐
│     Slack      │                         │   Claude    │
│  (WebSocket)   │                         │ (REST API)  │
└────────────────┘                         └─────────────┘
        ▲                                          ▲
        │                                          │
┌───────┴────────┐                         ┌──────┴──────┐
│   Telegram     │                         │ OpenRouter  │
│ (Bot API/Poll) │                         │ (REST API)  │
└────────────────┘                         └─────────────┘
```

## Message Flow

### Incoming Message (User → AI)

```
1. User sends message
   ↓
2. Platform receives message (Slack/Telegram)
   ↓
3. Platform Adapter processes event
   ↓
4. Message Router receives message + context
   ↓
5. Router selects appropriate AI agent
   ↓
6. Agent Adapter sends to AI service
   ↓
7. AI service processes and responds
```

### Outgoing Message (AI → User)

```
8. Agent Adapter receives AI response
   ↓
9. Returns formatted response to Router
   ↓
10. Router forwards to Platform Adapter
   ↓
11. Platform Adapter sends to chat platform
   ↓
12. User receives AI response
```

## Component Details

### Platform Adapters
**Responsibilities:**
- Listen for incoming messages
- Parse platform-specific message formats
- Send responses back to users
- Handle platform-specific features (threads, mentions, etc.)

**Slack Adapter:**
- Uses Socket Mode for real-time communication
- Handles @mentions and direct messages
- Supports threaded conversations
- WebSocket connection for events

**Telegram Adapter:**
- Uses polling mode by default (webhook optional)
- Handles all text messages
- Supports markdown formatting
- Reply-to-message support

### Agent Adapters
**Responsibilities:**
- Send messages to AI services
- Handle API authentication
- Parse AI responses
- Error handling and retries

**Claude Adapter:**
- Anthropic API integration
- Supports Claude 3.5 Sonnet and other models
- Streaming support (future enhancement)

**OpenRouter Adapter:**
- Multi-model support (GPT-4, Claude, PaLM, etc.)
- Unified API interface
- Model selection via configuration

### Core Components

**Message Router:**
- Central hub for all message flow
- Maintains adapter registries
- Handles default agent selection
- Context propagation

**Configuration Manager:**
- Environment-based configuration
- Validates required settings
- Enables/disables adapters based on config

**Logger:**
- Structured logging
- Configurable log levels (error/warn/info/debug)
- Timestamp prefixing
- Production-ready output

## Data Flow Example

```javascript
// User sends: "@Botline what is 2+2?"

// 1. Slack receives event
{
  type: 'app_mention',
  text: '<@U123> what is 2+2?',
  channel: 'C456',
  user: 'U789'
}

// 2. Slack Adapter processes
message = "what is 2+2?"
context = {
  platform: 'slack',
  channel: 'C456',
  user: 'U789',
  threadTs: '1234.5678'
}

// 3. Router sends to Claude
await claudeAdapter.sendMessage(message, context)

// 4. Claude responds
{
  text: "2 + 2 = 4",
  model: "claude-3-5-sonnet-20241022",
  agent: "claude"
}

// 5. Slack Adapter sends back
await slackClient.chat.postMessage({
  channel: 'C456',
  text: "2 + 2 = 4",
  thread_ts: '1234.5678'
})

// User receives: "2 + 2 = 4"
```

## Extensibility

### Adding New Platform
1. Create adapter in `src/adapters/platforms/`
2. Implement `initialize()`, `sendMessage()`, `isConfigured()`
3. Register in `src/index.js`
4. Add config in `src/config/index.js`

### Adding New Agent
1. Create adapter in `src/adapters/agents/`
2. Implement `sendMessage()`, `isConfigured()`
3. Register in `src/index.js`
4. Add config in `src/config/index.js`

## Configuration Flow

```
.env file
   ↓
dotenv loads
   ↓
config/index.js exports config object
   ↓
Adapters read from config
   ↓
Adapters register if enabled
   ↓
Application starts
```

## Error Handling

```
Error occurs
   ↓
Adapter catches error
   ↓
Logs error details
   ↓
Sends friendly error message to user
   ↓
Application continues running
```

## Health Check

```
GET /health
   ↓
Returns:
{
  "status": "ok",
  "platforms": ["slack", "telegram"],
  "agents": ["claude", "openrouter"]
}
```
