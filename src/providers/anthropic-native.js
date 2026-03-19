/**
 * Axiom — Native Anthropic Provider
 *
 * Uses Anthropic's native /messages API for better tool calling and streaming.
 * Falls back to universal provider if not configured.
 */

export class AnthropicNativeProvider {
  constructor({ baseUrl, apiKey, model, maxTokens = 8192, temperature = 0.7 }) {
    this.baseUrl = (baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  get name() { return 'anthropic-native'; }

  formatTools(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async *streamChat(messages, tools = [], systemPrompt = null) {
    const { system, msgs } = this._convertMessages(messages, systemPrompt);

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: msgs,
      stream: true,
    };

    if (system) body.system = system;
    if (tools.length > 0) body.tools = this.formatTools(tools);

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errorBody}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls = {};
    let currentToolIdx = -1;
    let isDone = false;

    try {
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            switch (data.type) {
              case 'content_block_start':
                if (data.content_block?.type === 'tool_use') {
                  currentToolIdx++;
                  toolCalls[currentToolIdx] = {
                    id: data.content_block.id,
                    name: data.content_block.name,
                    arguments: '',
                  };
                }
                break;

              case 'content_block_delta':
                if (data.delta?.type === 'text_delta') {
                  yield { type: 'text', content: data.delta.text };
                } else if (data.delta?.type === 'input_json_delta') {
                  if (toolCalls[currentToolIdx]) {
                    toolCalls[currentToolIdx].arguments += data.delta.partial_json;
                  }
                }
                break;

              case 'content_block_stop':
                if (toolCalls[currentToolIdx] && toolCalls[currentToolIdx].arguments) {
                  const tc = toolCalls[currentToolIdx];
                  yield {
                    type: 'tool_call',
                    id: tc.id,
                    name: tc.name,
                    arguments: this._parseArgs(tc.arguments),
                  };
                }
                break;

              case 'message_delta':
                if (data.usage) {
                  this.usage.completionTokens += data.usage.output_tokens || 0;
                  yield { type: 'usage', usage: data.usage };
                }
                break;

              case 'message_start':
                if (data.message?.usage) {
                  this.usage.promptTokens += data.message.usage.input_tokens || 0;
                }
                break;

              case 'message_stop':
                yield { type: 'done' };
                isDone = true;
                break;
            }
          } catch {
            // Skip malformed SSE
          }
          if (isDone) break;
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch (err) {
        // Safe to ignore cancel errors
      }
    }
  }

  async chat(messages, tools = [], systemPrompt = null) {
    const { system, msgs } = this._convertMessages(messages, systemPrompt);

    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: msgs,
    };

    if (system) body.system = system;
    if (tools.length > 0) body.tools = this.formatTools(tools);

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errorBody}`);
    }

    const data = await res.json();

    if (data.usage) {
      this.usage.promptTokens += data.usage.input_tokens || 0;
      this.usage.completionTokens += data.usage.output_tokens || 0;
      this.usage.totalTokens = this.usage.promptTokens + this.usage.completionTokens;
    }

    const result = { content: '', toolCalls: [] };

    for (const block of data.content || []) {
      if (block.type === 'text') {
        result.content += block.text;
      } else if (block.type === 'tool_use') {
        result.toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return result;
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   */
  _convertMessages(messages, systemPrompt) {
    let system = systemPrompt || '';
    const msgs = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n\n' : '') + msg.content;
      } else if (msg.role === 'tool') {
        // Anthropic expects tool_result blocks inside user messages
        msgs.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          }],
        });
      } else if (msg.role === 'assistant' && msg.tool_calls) {
        // Convert assistant tool_calls to Anthropic content blocks
        const content = [];
        if (msg.content) content.push({ type: 'text', text: msg.content });
        for (const tc of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function?.name || tc.name,
            input: tc.function?.arguments
              ? (typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments)
              : (tc.arguments || {}),
          });
        }
        msgs.push({ role: 'assistant', content });
      } else {
        msgs.push({ role: msg.role, content: msg.content });
      }
    }

    return { system: system || undefined, msgs };
  }

  _parseArgs(argsStr) {
    if (!argsStr) return {};
    try {
      return JSON.parse(argsStr);
    } catch {
      return { _raw: argsStr };
    }
  }

  resetUsage() {
    this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}
