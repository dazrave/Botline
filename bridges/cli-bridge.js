#!/usr/bin/env node

/**
 * Local Bridge for CLI Agents
 * 
 * This bridge connects CLI-based agents (like Claude CLI, Opencode, etc.)
 * to Botline by:
 * 1. Running the CLI agent process
 * 2. Monitoring its stdout for messages
 * 3. Sending those messages to Botline via /notify
 * 4. Accepting /reply calls from Botline and writing to agent's stdin
 * 
 * Usage:
 *   node cli-bridge.js <agent-name> <command> [args...]
 * 
 * Example:
 *   node cli-bridge.js claude-cli claude --project MyProject
 */

import express from 'express';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// Configuration
const BOTLINE_URL = process.env.BOTLINE_URL || 'http://localhost:3000';
const BRIDGE_PORT = process.env.BRIDGE_PORT || 4040;
const AGENT_SECRET = process.env.AGENT_SECRET || null;

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node cli-bridge.js <agent-name> <command> [args...]');
  console.error('Example: node cli-bridge.js claude-cli claude --project MyProject');
  process.exit(1);
}

const agentName = args[0];
const command = args[1];
const commandArgs = args.slice(2);

console.log(`🌉 Starting CLI Bridge for ${agentName}`);
console.log(`Command: ${command} ${commandArgs.join(' ')}`);
console.log(`Botline URL: ${BOTLINE_URL}`);
console.log(`Bridge Port: ${BRIDGE_PORT}\n`);

// Create Express app for receiving replies
const app = express();
app.use(express.json());

// Spawn the CLI agent process
let agent = null;
let shouldRestart = true;

function startAgent() {
  console.log(`🚀 Starting agent: ${command} ${commandArgs.join(' ')}`);
  
  agent = spawn(command, commandArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Monitor stdout for messages
  agent.stdout.on('data', async (data) => {
    const message = data.toString().trim();
    
    if (message.length > 0) {
      console.log(`📤 Agent output: ${message}`);
      
      try {
        // Send to Botline
        const response = await fetch(`${BOTLINE_URL}/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(AGENT_SECRET ? { 'X-Agent-Secret': AGENT_SECRET } : {}),
          },
          body: JSON.stringify({
            from: agentName,
            message: message,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`❌ Failed to send to Botline: ${error}`);
        } else {
          console.log(`✅ Message sent to Botline`);
        }
      } catch (error) {
        console.error(`❌ Error sending to Botline:`, error.message);
      }
    }
  });

  // Monitor stderr
  agent.stderr.on('data', (data) => {
    console.error(`⚠️  Agent error: ${data.toString()}`);
  });

  // Handle agent exit
  agent.on('exit', (code) => {
    console.log(`🛑 Agent exited with code ${code}`);
    
    if (shouldRestart) {
      console.log('🔄 Restarting agent in 5 seconds...');
      setTimeout(startAgent, 5000);
    }
  });

  // Handle agent errors
  agent.on('error', (error) => {
    console.error(`❌ Agent error:`, error);
  });
}

// Endpoint to receive replies from Botline
app.post('/reply', (req, res) => {
  const { reply, from } = req.body;

  if (!reply) {
    return res.status(400).json({ error: 'Missing reply' });
  }

  console.log(`📥 Received reply from ${from || 'User'}: ${reply}`);

  // Write to agent's stdin
  if (agent && agent.stdin.writable) {
    agent.stdin.write(`${reply}\n`);
    console.log(`✅ Reply sent to agent`);
    res.json({ ok: true, message: 'Reply sent to agent' });
  } else {
    console.error(`❌ Agent stdin not writable`);
    res.status(500).json({ error: 'Agent not ready' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    agent: agentName,
    running: agent !== null && !agent.killed,
  });
});

// Start Express server
app.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`🌉 Bridge server listening on http://127.0.0.1:${BRIDGE_PORT}`);
  console.log(`📝 Register this agent in Botline with:`);
  console.log(`   POST ${BOTLINE_URL}/agents/register`);
  console.log(`   {`);
  console.log(`     "name": "${agentName}",`);
  console.log(`     "callbackUrl": "http://127.0.0.1:${BRIDGE_PORT}/reply",`);
  console.log(`     "description": "CLI agent bridge"`);
  console.log(`   }\n`);
  
  // Start the agent
  startAgent();
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bridge...');
  shouldRestart = false;
  
  if (agent) {
    agent.kill();
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bridge...');
  shouldRestart = false;
  
  if (agent) {
    agent.kill();
  }
  
  process.exit(0);
});
