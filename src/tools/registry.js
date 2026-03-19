/**
 * Axiom — Tool Registry
 * Central registry that collects all tools and provides them to the agent loop
 */

import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { editFileTool } from './edit-file.js';
import { executeTool } from './execute.js';
import { grepTool } from './grep.js';
import { findTool } from './find.js';
import { listDirTool } from './list-dir.js';
import { webFetchTool } from './web-fetch.js';
import { writeTodosTool } from './write-todos.js';
import { gitStatusTool, gitDiffTool, gitAddTool, gitCommitTool } from './git.js';
import { browserOpenTool, browserInspectTool, browserActTool } from './browser.js';
import { indexRepoTool } from './index-repo.js';
import { semanticSearchTool } from './semantic-search.js';

const builtinTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  executeTool,
  grepTool,
  findTool,
  listDirTool,
  webFetchTool,
  writeTodosTool,
  gitStatusTool,
  gitDiffTool,
  gitAddTool,
  gitCommitTool,
  browserOpenTool,
  browserInspectTool,
  browserActTool,
  indexRepoTool,
  semanticSearchTool,
];

/**
 * Tool registry with plugin support
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    // Register builtin tools
    for (const tool of builtinTools) {
      this.register(tool);
    }
  }

  register(tool) {
    if (!tool.name || !tool.execute) {
      throw new Error(`Invalid tool: must have name and execute function`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name) {
    this.tools.delete(name);
  }

  get(name) {
    return this.tools.get(name);
  }

  /**
   * Get all tools as an array (for passing to LLM)
   */
  getAll() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool schemas only (for LLM tool definitions)
   */
  getSchemas() {
    return this.getAll().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  /**
   * Execute a tool by name
   */
  async execute(name, params, cwd, provider) {
    const tool = this.tools.get(name);
    if (!tool) {
      return { error: `Unknown tool: ${name}. Available: ${Array.from(this.tools.keys()).join(', ')}` };
    }

    try {
      return await tool.execute(params, cwd, provider);
    } catch (err) {
      return { error: `Tool "${name}" failed: ${err.message}` };
    }
  }

  /**
   * Check if a tool requires permission
   */
  requiresPermission(name) {
    const tool = this.tools.get(name);
    return tool?.requiresPermission ?? false;
  }

  /**
   * List all registered tool names
   */
  list() {
    return Array.from(this.tools.keys());
  }

  /**
   * Register a plugin tool from a file path
   */
  async loadPlugin(filePath) {
    try {
      const mod = await import(filePath);
      const tool = mod.default || mod.tool || Object.values(mod).find(v => v?.name && v?.execute);
      if (tool) {
        this.register(tool);
        return tool.name;
      }
      throw new Error('No valid tool export found');
    } catch (err) {
      throw new Error(`Failed to load plugin ${filePath}: ${err.message}`);
    }
  }
}
