/**
 * Axiom — Sub-Agent System
 * Spawns isolated agent instances for delegated sub-tasks
 */

import { ContextManager } from '../core/context.js';
import { ToolRegistry } from '../tools/registry.js';
import { theme, icons } from '../ui/theme.js';

export class SubAgent {
  constructor(provider, cwd, config) {
    this.provider = provider;
    this.cwd = cwd;
    this.config = config;
    this.maxIterations = 15; // Sub-agents get fewer iterations
  }

  /**
   * Run a sub-agent with its own isolated context
   */
  async run(taskDescription) {
    console.log(theme.dim(`\n  ${icons.subagent} Sub-agent spawned: ${taskDescription.slice(0, 80)}`));

    const context = new ContextManager(this.cwd, this.provider);
    const tools = new ToolRegistry();

    // Remove the 'task' tool from sub-agents to prevent infinite recursion
    tools.unregister('task');

    context.addUserMessage(taskDescription);

    let iterations = 0;
    let finalResponse = '';

    while (iterations < this.maxIterations) {
      iterations++;

      try {
        const result = await this.provider.chat(
          context.getMessages(),
          tools.getSchemas(),
          context.getSystemPrompt() + '\n\nYou are a sub-agent working on a specific task. Complete it efficiently and report back with a clear summary of what you did.'
        );

        // If no tool calls, we're done
        if (!result.toolCalls || result.toolCalls.length === 0) {
          finalResponse = result.content;
          break;
        }

        // Process tool calls
        context.addAssistantMessage(result.content, result.toolCalls);

        for (const tc of result.toolCalls) {
          console.log(theme.dim(`    ${icons.arrow} ${tc.name}`));
          const toolResult = await tools.execute(tc.name, tc.arguments, this.cwd);
          context.addToolResult(tc.id, toolResult);
        }

      } catch (err) {
        finalResponse = `Sub-agent error: ${err.message}`;
        break;
      }
    }

    if (iterations >= this.maxIterations) {
      finalResponse += '\n[Sub-agent reached iteration limit]';
    }

    console.log(theme.dim(`  ${icons.success} Sub-agent completed (${iterations} iterations)\n`));

    return finalResponse;
  }
}

/**
 * Task tool definition — the LLM calls this to spawn sub-agents
 */
export const taskTool = {
  name: 'task',
  description: 'Spawn a sub-agent to work on a specific sub-task in isolation. The sub-agent has its own context window and access to the same tools (except spawning further sub-agents). Use this for parallel or complex sub-tasks that benefit from focused attention.',
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Detailed description of the sub-task for the sub-agent to complete',
      },
    },
    required: ['description'],
  },
  requiresPermission: true,

  // execute is set dynamically in agent-loop.js since it needs provider reference
  async execute() {
    return { error: 'Task tool must be initialized with provider context' };
  },
};
