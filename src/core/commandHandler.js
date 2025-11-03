import logger from './logger.js';
import agentRegistry from './agentRegistry.js';
import messageBus from './messageBus.js';
import creditTimerKeeper from './scheduler.js';

/**
 * CommandHandler - Handles chat commands like /start, /status, /help
 */
class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.registerDefaultCommands();
  }

  /**
   * Register default commands
   */
  registerDefaultCommands() {
    this.register('help', this.helpCommand.bind(this));
    this.register('status', this.statusCommand.bind(this));
    this.register('start', this.startCommand.bind(this));
    this.register('agents', this.agentsCommand.bind(this));
    this.register('buffer', this.bufferCommand.bind(this));
    this.register('timer', this.timerCommand.bind(this));
  }

  /**
   * Register a command handler
   */
  register(name, handler) {
    this.commands.set(name, handler);
    logger.debug(`Command registered: /${name}`);
  }

  /**
   * Execute a command
   */
  async execute(command, args, context) {
    const handler = this.commands.get(command);
    
    if (!handler) {
      return {
        text: `Unknown command: /${command}\n\nUse /help to see available commands.`,
      };
    }

    try {
      return await handler(args, context);
    } catch (error) {
      logger.error(`Error executing command /${command}:`, error);
      return {
        text: `Error executing command: ${error.message}`,
      };
    }
  }

  /**
   * Check if a command exists
   */
  hasCommand(command) {
    return this.commands.has(command);
  }

  /**
   * /help command - show available commands
   */
  async helpCommand(args, context) {
    const helpText = `**Botline Commands**

**Available Commands:**
• \`/help\` - Show this help message
• \`/status\` - Show system status and uptime
• \`/agents\` - List registered CLI agents
• \`/start <agent> <task>\` - Start an agent job
• \`/buffer\` - Show recent messages
• \`/timer <on|off|status>\` - Control Credit Timer Keeper

**Direct Messages:**
Any message that doesn't start with \`/\` will be forwarded to the default AI agent.

**Examples:**
\`/status\` - Check system status
\`/agents\` - See all registered agents
\`/start claude-cli "review recent commits"\` - Start a task
\`/timer status\` - Check Credit Timer Keeper status
\`What is the weather?\` - Ask the AI directly`;

    return { text: helpText };
  }

  /**
   * /status command - show system status
   */
  async statusCommand(args, context) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const agents = agentRegistry.getAllAgents();
    const activeAgents = agents.filter(a => a.active);
    const bufferStats = messageBus.getBufferStats();

    const statusText = `**Botline Status**

**System:**
• Uptime: ${hours}h ${minutes}m ${seconds}s
• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB

**Agents:**
• Total: ${agents.length}
• Active: ${activeAgents.length}
• Inactive: ${agents.length - activeAgents.length}

**Message Buffer:**
• Messages: ${bufferStats.size}/${bufferStats.maxSize}
${bufferStats.oldest ? `• Oldest: ${new Date(bufferStats.oldest).toLocaleString()}` : ''}
${bufferStats.newest ? `• Newest: ${new Date(bufferStats.newest).toLocaleString()}` : ''}

**Active Agents:**
${activeAgents.length > 0 ? activeAgents.map(a => `• ${a.name} - Last seen: ${a.lastSeen ? new Date(a.lastSeen).toLocaleString() : 'Never'}`).join('\n') : '• None'}`;

    return { text: statusText };
  }

  /**
   * /agents command - list registered agents
   */
  async agentsCommand(args, context) {
    const agents = agentRegistry.getAllAgents();

    if (agents.length === 0) {
      return { text: '**No agents registered**\n\nAgents can register via the /notify endpoint.' };
    }

    const agentsText = `**Registered Agents** (${agents.length})

${agents.map(a => {
  const status = a.active ? '🟢 Active' : '🔴 Inactive';
  const lastSeen = a.lastSeen ? new Date(a.lastSeen).toLocaleString() : 'Never';
  return `**${a.name}** - ${status}
  • Last seen: ${lastSeen}
  • Callback: ${a.callbackUrl}
  ${a.description ? `• Description: ${a.description}` : ''}`;
}).join('\n\n')}`;

    return { text: agentsText };
  }

  /**
   * /start command - start an agent job
   */
  async startCommand(args, context) {
    if (args.length < 2) {
      return { 
        text: '**Usage:** `/start <agent> <task>`\n\nExample: `/start claude-cli "review recent commits"`' 
      };
    }

    const agentName = args[0];
    const task = args.slice(1).join(' ');

    const agent = agentRegistry.getAgent(agentName);
    if (!agent) {
      return { 
        text: `**Agent not found:** ${agentName}\n\nUse \`/agents\` to see available agents.` 
      };
    }

    if (!agent.active) {
      return { 
        text: `**Agent inactive:** ${agentName}\n\nThis agent is currently not active.` 
      };
    }

    // Emit event to start agent task
    messageBus.emit('agent:start', {
      agent: agentName,
      task,
      context,
    });

    return { 
      text: `**Starting task for ${agentName}**\n\nTask: ${task}\n\nThe agent will respond when ready.` 
    };
  }

  /**
   * /buffer command - show recent messages
   */
  async bufferCommand(args, context) {
    const count = args[0] ? parseInt(args[0], 10) : 5;
    const messages = messageBus.getRecentMessages(count);

    if (messages.length === 0) {
      return { text: '**Message buffer is empty**' };
    }

    const bufferText = `**Recent Messages** (${messages.length})

${messages.map((m, i) => {
  const time = new Date(m.timestamp).toLocaleTimeString();
  const preview = m.message.substring(0, 50) + (m.message.length > 50 ? '...' : '');
  return `${i + 1}. [${time}] ${m.event}: ${preview}`;
}).join('\n')}`;

    return { text: bufferText };
  }

  /**
   * /timer command - control Credit Timer Keeper
   */
  async timerCommand(args, context) {
    if (args.length === 0) {
      return { 
        text: '**Usage:** `/timer <on|off|status>`\n\n**Examples:**\n• `/timer on` - Enable Credit Timer Keeper\n• `/timer off` - Disable Credit Timer Keeper\n• `/timer status` - Show timer status' 
      };
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'on':
      case 'enable':
        creditTimerKeeper.enable();
        return { 
          text: '**Credit Timer Keeper Enabled**\n\nHourly heartbeat messages will be sent to Claude to maintain credit replenishment cycle.' 
        };

      case 'off':
      case 'disable':
        creditTimerKeeper.disable();
        return { 
          text: '**Credit Timer Keeper Disabled**\n\nHeartbeat messages have been stopped.' 
        };

      case 'status':
        const status = creditTimerKeeper.getStatus();
        const nextHeartbeatText = status.nextHeartbeat 
          ? new Date(status.nextHeartbeat).toLocaleString() 
          : 'Not scheduled';

        const statusText = `**Credit Timer Keeper Status**

• **Enabled:** ${status.enabled ? '✅ Yes' : '❌ No'}
• **Running:** ${status.running ? '✅ Yes' : '❌ No'}
• **Paused:** ${status.paused ? '⏸️ Yes (after real message)' : '▶️ No'}
• **Next Heartbeat:** ${nextHeartbeatText}
• **Interval:** ${status.interval} minutes
• **Cooldown:** ${status.cooldown} minutes

The Credit Timer Keeper sends periodic "hello world (keepalive)" messages to Claude to maintain the credit replenishment cycle. It automatically pauses when you send a real message.`;

        return { text: statusText };

      default:
        return { 
          text: `**Unknown action:** ${action}\n\nUse \`/timer on\`, \`/timer off\`, or \`/timer status\`` 
        };
    }
  }
}

export const commandHandler = new CommandHandler();
export default commandHandler;
