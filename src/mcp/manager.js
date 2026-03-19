/**
 * Axiom — MCP Manager
 * Manages multiple MCP server connections and syncs their tools
 */

import { MCPClient } from './client.js';
import { theme, icons } from '../ui/theme.js';

export class MCPManager {
  constructor(toolRegistry) {
    this.registry = toolRegistry;
    this.clients = new Map(); // Name -> MCPClient
  }

  /**
   * Initialize MCP servers from config
   */
  async init(mcpConfig = {}) {
    for (const [name, config] of Object.entries(mcpConfig)) {
      try {
        const client = new MCPClient(name, config.command, config.args, config.env);
        await client.connect();
        this.clients.set(name, client);
        
        // Sync tools
        await this.syncTools(name);
      } catch (err) {
        console.log(theme.error(`  ${icons.error} Failed to connect to MCP server "${name}": ${err.message}`));
      }
    }
  }

  /**
   * Register tools from an MCP server into the Axiom registry
   */
  async syncTools(serverName) {
    const client = this.clients.get(serverName);
    if (!client) return;

    try {
      const tools = await client.listTools();
      for (const mcpTool of tools) {
        const tool = {
          name: `${serverName}_${mcpTool.name}`, // Namespaced
          description: `[MCP:${serverName}] ${mcpTool.description}`,
          parameters: mcpTool.inputSchema,
          requiresPermission: true,
          execute: async (params) => {
            const res = await client.callTool(mcpTool.name, params);
            if (res.isError) {
              return { error: res.content?.[0]?.text || 'MCP tool failed' };
            }
            return { result: res.content?.[0]?.text || res };
          },
        };
        this.registry.register(tool);
      }
      return tools.length;
    } catch (err) {
      console.log(theme.error(`  ${icons.error} Failed to sync tools from MCP "${serverName}": ${err.message}`));
    }
  }

  /**
   * Add a new MCP server and sync its tools
   */
  async addServer(name, command, args = [], env = {}) {
    if (this.clients.has(name)) {
      throw new Error(`MCP server "${name}" already exists`);
    }

    const client = new MCPClient(name, command, args, env);
    await client.connect();
    this.clients.set(name, client);
    const count = await this.syncTools(name);
    return count;
  }

  listServers() {
    return Array.from(this.clients.keys());
  }

  async shutdown() {
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
  }
}
