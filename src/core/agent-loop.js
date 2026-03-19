/**
 * Axiom — Agentic Loop
 * The core engine: think → act → observe
 * 
 * This is the heart of Axiom. It sends messages to the LLM, executes tool calls,
 * and loops until the LLM gives a final text response.
 */

import { ToolRegistry } from '../tools/registry.js';
import { SubAgent, taskTool } from '../agents/sub-agent.js';
import { checkPermission } from '../permissions/permission.js';
import { createSpinner, toolSpinner } from '../ui/spinner.js';
import { renderMarkdown, renderToolResult } from '../ui/renderer.js';
import { theme, icons } from '../ui/theme.js';

export class AgentLoop {
  constructor(provider, context, config) {
    this.provider = provider;
    this.context = context;
    this.config = config;
    this.tools = new ToolRegistry();
    this.cwd = context.cwd;
    this.maxIterations = config?.maxIterations || 25;
    this.isRunning = false;

    // Register the task tool with provider context
    this._registerTaskTool();
  }

  _registerTaskTool() {
    const self = this;
    this.tools.register({
      ...taskTool,
      async execute(params) {
        const subAgent = new SubAgent(self.provider, self.cwd, self.config);
        const result = await subAgent.run(params.description);
        return { result };
      },
    });
  }

  /**
   * Process a user message through the agentic loop
   */
  async processMessage(userMessage) {
    this.isRunning = true;
    this.context.addUserMessage(userMessage);

    let iterations = 0;

    try {
      while (iterations < this.maxIterations) {
        iterations++;

        // Auto-compact if conversation is getting long
        if (this.context.shouldCompact()) {
          const spinner = createSpinner('Compacting conversation...');
          spinner.start();
          await this.context.compact();
          spinner.succeed(theme.dim('Conversation compacted'));
        }

        // Call LLM with streaming
        const { text, toolCalls } = await this._streamLLMResponse();

        // If no tool calls, we're done
        if (!toolCalls || toolCalls.length === 0) {
          this.context.addAssistantMessage(text);
          break;
        }

        // Add assistant message with tool calls
        this.context.addAssistantMessage(text, toolCalls);

        // Execute tool calls (parallel when safe)
        const results = await this._executeToolCalls(toolCalls);

        // Add tool results to context
        for (const { toolCallId, result } of results) {
          this.context.addToolResult(toolCallId, result);
        }
      }

      if (iterations >= this.maxIterations) {
        console.log(theme.warning(`\n  ${icons.warning} Reached maximum iterations (${this.maxIterations}). Stopping.`));
      }

    } catch (err) {
      this._handleError(err);
    } finally {
      this.isRunning = false;
    }

    return { iterations };
  }

  /**
   * Stream LLM response with live text output and tool call accumulation
   */
  async _streamLLMResponse() {
    const spinner = createSpinner('Thinking');
    spinner.start();

    let text = '';
    const toolCalls = [];
    let spinnerStopped = false;

    try {
      const stream = this.provider.streamChat(
        this.context.getMessages(),
        this.tools.getSchemas(),
        this.context.getSystemPrompt()
      );

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'text':
            if (!spinnerStopped) {
              spinner.stop();
              spinnerStopped = true;
              process.stdout.write('\n');
            }
            process.stdout.write(chunk.content);
            text += chunk.content;
            break;

          case 'tool_call':
            if (!spinnerStopped) {
              spinner.stop();
              spinnerStopped = true;
            }
            toolCalls.push(chunk);
            break;

          case 'usage':
            // Silent — tracked in provider
            break;

          case 'done':
            break;
        }
      }

      if (!spinnerStopped) {
        spinner.stop();
      }

      // Render text as markdown if it contains formatting
      if (text && !toolCalls.length) {
        // Clear screen line
        process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
        console.log(renderMarkdown(text));
      } else if (text) {
        process.stdout.write('\n');
      }

    } catch (err) {
      spinner.fail(theme.error('Failed'));
      throw err;
    }

    return { text, toolCalls };
  }

  /**
   * Execute tool calls with permission checks
   * Safe read-only tools run in parallel; write tools run serially
   */
  async _executeToolCalls(toolCalls) {
    const readTools = ['read_file', 'grep', 'find', 'list_dir', 'web_fetch', 'write_todos', 'index_repo', 'semantic_search'];
    const results = [];

    // Separate into parallel-safe and serial
    const parallelCalls = toolCalls.filter(tc => readTools.includes(tc.name));
    const serialCalls = toolCalls.filter(tc => !readTools.includes(tc.name));

    // Run read-only tools in parallel
    if (parallelCalls.length > 0) {
      const parallelPromises = parallelCalls.map(async (tc) => {
        const spinner = toolSpinner(tc.name, tc.arguments);
        spinner.start();

        const result = await this.tools.execute(tc.name, tc.arguments, this.cwd, this.provider);
        const success = !result?.error;

        if (success) {
          spinner.succeed(theme.dim(`${tc.name}`));
        } else {
          spinner.fail(theme.error(`${tc.name}: ${result.error}`));
        }

        console.log(renderToolResult(tc.name, result, success));
        return { toolCallId: tc.id, result };
      });

      results.push(...await Promise.all(parallelPromises));
    }

    // Run write/dangerous tools serially with permission checks
    for (const tc of serialCalls) {
      // Permission check
      const permitted = await checkPermission(tc.name, tc.arguments, this.config);

      if (!permitted) {
        results.push({
          toolCallId: tc.id,
          result: { error: 'Permission denied by user' },
        });
        console.log(theme.warning(`  ${icons.lock} ${tc.name} — skipped (permission denied)`));
        continue;
      }

      const spinner = toolSpinner(tc.name, tc.arguments);
      spinner.start();

      const result = await this.tools.execute(tc.name, tc.arguments, this.cwd, this.provider);
      const success = !result?.error;

      if (success) {
        spinner.succeed(theme.dim(`${tc.name}`));
      } else {
        spinner.fail(theme.error(`${tc.name}: ${result.error}`));
      }

      console.log(renderToolResult(tc.name, result, success));
      results.push({ toolCallId: tc.id, result });
    }

    return results;
  }

  _handleError(err) {
    console.log();

    if (err.isRateLimited) {
      console.log(theme.warning(`  ${icons.warning} Rate limited. Wait a moment and try again.`));
    } else if (err.isAuth) {
      console.log(theme.error(`  ${icons.error} Authentication failed. Check your API key with: axiom config`));
    } else {
      console.log(theme.error(`  ${icons.error} Error: ${err.message}`));
    }
  }

  /**
   * Cancel the current operation
   */
  cancel() {
    this.isRunning = false;
  }
}
