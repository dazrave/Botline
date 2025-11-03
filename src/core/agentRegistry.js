import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

/**
 * AgentRegistry - Manages CLI agents and their callback URLs
 * Stores agent metadata in a JSON file for persistence
 */
class AgentRegistry {
  constructor(registryPath = './data/agents.json') {
    this.registryPath = registryPath;
    this.agents = new Map();
    this.loaded = false;
  }

  /**
   * Initialize the registry (load from file)
   */
  async initialize() {
    try {
      await this.ensureDataDirectory();
      await this.load();
      this.loaded = true;
      logger.info(`Agent registry initialized with ${this.agents.size} agents`);
    } catch (error) {
      logger.error('Error initializing agent registry:', error);
      throw error;
    }
  }

  /**
   * Ensure data directory exists
   */
  async ensureDataDirectory() {
    const dir = path.dirname(this.registryPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Load agents from JSON file
   */
  async load() {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8');
      const agentsData = JSON.parse(data);
      
      this.agents.clear();
      for (const [name, config] of Object.entries(agentsData)) {
        this.agents.set(name, {
          ...config,
          lastSeen: config.lastSeen ? new Date(config.lastSeen) : null,
        });
      }
      
      logger.debug(`Loaded ${this.agents.size} agents from registry`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty registry
        logger.info('Agent registry file not found, starting with empty registry');
        await this.save();
      } else {
        logger.error('Error loading agent registry:', error);
        throw error;
      }
    }
  }

  /**
   * Save agents to JSON file
   */
  async save() {
    try {
      const agentsData = {};
      for (const [name, config] of this.agents.entries()) {
        agentsData[name] = {
          ...config,
          lastSeen: config.lastSeen?.toISOString() || null,
        };
      }
      
      await fs.writeFile(this.registryPath, JSON.stringify(agentsData, null, 2));
      logger.debug('Agent registry saved');
    } catch (error) {
      logger.error('Error saving agent registry:', error);
      throw error;
    }
  }

  /**
   * Register a new agent
   */
  async register(name, config) {
    const agentConfig = {
      callbackUrl: config.callbackUrl,
      description: config.description || '',
      secret: config.secret || null,
      allowedIPs: config.allowedIPs || [],
      createdAt: new Date(),
      lastSeen: new Date(),
      active: true,
    };

    this.agents.set(name, agentConfig);
    await this.save();
    
    logger.info(`Agent registered: ${name}`, { callbackUrl: config.callbackUrl });
    return agentConfig;
  }

  /**
   * Unregister an agent
   */
  async unregister(name) {
    if (!this.agents.has(name)) {
      throw new Error(`Agent ${name} not found`);
    }

    this.agents.delete(name);
    await this.save();
    
    logger.info(`Agent unregistered: ${name}`);
  }

  /**
   * Update agent's last seen timestamp
   */
  async updateLastSeen(name) {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }

    agent.lastSeen = new Date();
    await this.save();
  }

  /**
   * Get agent configuration
   */
  getAgent(name) {
    return this.agents.get(name);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.entries()).map(([name, config]) => ({
      name,
      ...config,
    }));
  }

  /**
   * Get active agents
   */
  getActiveAgents() {
    return this.getAllAgents().filter(agent => agent.active);
  }

  /**
   * Set agent active status
   */
  async setActive(name, active) {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }

    agent.active = active;
    await this.save();
    
    logger.info(`Agent ${name} set to ${active ? 'active' : 'inactive'}`);
  }

  /**
   * Check if agent exists
   */
  hasAgent(name) {
    return this.agents.has(name);
  }

  /**
   * Verify agent secret
   */
  verifySecret(name, secret) {
    const agent = this.agents.get(name);
    if (!agent) {
      return false;
    }

    // If no secret is configured, allow access
    if (!agent.secret) {
      return true;
    }

    return agent.secret === secret;
  }

  /**
   * Check if IP is allowed for agent
   */
  isIPAllowed(name, ip) {
    const agent = this.agents.get(name);
    if (!agent) {
      return false;
    }

    // If no IPs are configured, allow all
    if (!agent.allowedIPs || agent.allowedIPs.length === 0) {
      return true;
    }

    // Check if IP matches (support for localhost variations)
    const normalizedIP = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip;
    return agent.allowedIPs.includes(normalizedIP);
  }
}

export const agentRegistry = new AgentRegistry();
export default agentRegistry;
