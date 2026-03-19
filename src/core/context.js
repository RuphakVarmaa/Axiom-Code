/**
 * Axiom — Context Manager
 * Manages conversation history, system prompt, auto-summarization, and AXIOM.md project context
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_MESSAGES_BEFORE_COMPACT = 40;

export class ContextManager {
  constructor(cwd, provider = null) {
    this.cwd = cwd;
    this.provider = provider;
    this.messages = [];
    this.systemPrompt = '';
    this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    const parts = [];

    // Core identity
    parts.push(`You are Axiom, a powerful agentic coding assistant running in the user's terminal.
You have access to tools for reading/writing files, executing commands, searching code, fetching web content, planning tasks, and spawning sub-agents.

CRITICAL RULES:
1. Use tools proactively — don't ask the user to do things you can do with tools.
2. Read files before editing them to understand context.
3. For complex tasks, use write_todos first to plan, then execute step by step.
4. When writing code, write complete, production-quality code. Never use placeholders.
5. After making changes, verify them by reading the result or running tests.
6. Be concise in responses. Show your work through tool use, not verbose explanations.
7. If a task requires multiple steps, use the task tool to spawn sub-agents for parallel work.`);

    // Environment info
    parts.push(`\nEnvironment:
- OS: ${os.platform()} ${os.arch()} ${os.release()}
- Shell: ${process.env.SHELL || 'unknown'}
- Node: ${process.version}
- CWD: ${this.cwd}
- User: ${os.userInfo().username}
- Time: ${new Date().toISOString()}`);

    // Load AXIOM.md project context
    const axiomMd = this._findAxiomMd();
    if (axiomMd) {
      parts.push(`\nProject context from AXIOM.md:\n${axiomMd}`);
    }

    this.systemPrompt = parts.join('\n');
  }

  _findAxiomMd() {
    let dir = this.cwd;
    const root = path.parse(dir).root;

    while (dir !== root) {
      const axiomPath = path.join(dir, 'AXIOM.md');
      if (fs.existsSync(axiomPath)) {
        try {
          const content = fs.readFileSync(axiomPath, 'utf-8');
          return content.slice(0, 5000); // Cap at 5k chars
        } catch { return null; }
      }
      dir = path.dirname(dir);
    }
    return null;
  }

  addUserMessage(content) {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content, toolCalls = null) {
    const msg = { role: 'assistant', content: content || '' };
    if (toolCalls && toolCalls.length > 0) {
      msg.tool_calls = toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
        },
      }));
    }
    this.messages.push(msg);
  }

  addToolResult(toolCallId, result) {
    this.messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    });
  }

  getMessages() {
    return this.messages;
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  /**
   * Clear conversation history
   */
  clear() {
    this.messages = [];
  }

  /**
   * Auto-compact: summarize old messages when history gets too long.
   * Keeps the last N messages and replaces older ones with a summary.
   */
  async compact() {
    if (!this.provider || this.messages.length < MAX_MESSAGES_BEFORE_COMPACT) {
      return false;
    }

    const keepCount = 10;
    const oldMessages = this.messages.slice(0, -keepCount);
    const recentMessages = this.messages.slice(-keepCount);

    // Ask the LLM to summarize
    try {
      const summaryResult = await this.provider.chat([
        {
          role: 'user',
          content: `Summarize the following conversation concisely, preserving all important context, decisions made, files modified, and current task state:\n\n${oldMessages.map(m => `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 500) : JSON.stringify(m.content).slice(0, 500)}`).join('\n')}`,
        },
      ], [], 'You are a conversation summarizer. Be concise but preserve all key details.');

      this.messages = [
        { role: 'user', content: `[Previous conversation summary]: ${summaryResult.content}` },
        { role: 'assistant', content: 'Understood. I have the context from our previous conversation. Let\'s continue.' },
        ...recentMessages,
      ];

      return true;
    } catch {
      // If summarization fails, just trim
      this.messages = recentMessages;
      return true;
    }
  }

  shouldCompact() {
    return this.messages.length >= MAX_MESSAGES_BEFORE_COMPACT;
  }

  /**
   * Export for session saving
   */
  toJSON() {
    return {
      cwd: this.cwd,
      messages: this.messages,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import from saved session
   */
  static fromJSON(data, provider) {
    const ctx = new ContextManager(data.cwd, provider);
    ctx.messages = data.messages || [];
    return ctx;
  }
}
