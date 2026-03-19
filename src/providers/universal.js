/**
 * Axiom — Universal LLM Provider
 * 
 * A single client that works with ANY OpenAI-compatible endpoint.
 * No heavy SDKs — raw fetch with SSE streaming.
 * Handles: OpenAI, DeepSeek, Groq, Mistral, Ollama, LM Studio, and any custom endpoint.
 */

export class UniversalProvider {
  constructor({ baseUrl, apiKey, model, maxTokens = 8192, temperature = 0.7 }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  get name() { return 'universal'; }

  /**
   * Format tools into OpenAI function-calling schema
   */
  formatTools(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Build headers for the request
   */
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  /**
   * Streaming chat completion via SSE
   * Yields chunks: { type: 'text' | 'tool_call' | 'usage' | 'done', ... }
   */
  async *streamChat(messages, tools = [], systemPrompt = null) {
    const body = {
      model: this.model,
      messages: this._buildMessages(messages, systemPrompt),
      stream: true,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    if (tools.length > 0) {
      body.tools = this.formatTools(tools);
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new ProviderError(
        `${res.status} ${res.statusText}: ${errorBody}`,
        res.status,
        errorBody
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls = {};

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
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              // Emit accumulated tool calls
              const accumulated = Object.values(toolCalls);
              if (accumulated.length > 0) {
                for (const tc of accumulated) {
                  yield {
                    type: 'tool_call',
                    id: tc.id,
                    name: tc.name,
                    arguments: this._parseArgs(tc.arguments),
                  };
                }
              }
              yield { type: 'done' };
              isDone = true;
            }
            if (isDone) break;
            continue;
          }

          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const choice = data.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;

            // Text content
            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }

            // Tool calls (accumulated across chunks)
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) {
                  toolCalls[idx] = { id: tc.id || '', name: '', arguments: '' };
                }
                if (tc.id) toolCalls[idx].id = tc.id;
                if (tc.function?.name) toolCalls[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
              }
            }

            // Usage stats
            if (data.usage) {
              this.usage.promptTokens += data.usage.prompt_tokens || 0;
              this.usage.completionTokens += data.usage.completion_tokens || 0;
              this.usage.totalTokens += data.usage.total_tokens || 0;
              yield { type: 'usage', usage: data.usage };
            }
          } catch {
            // Skip malformed SSE lines
          }
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

  /**
   * Non-streaming chat (for sub-agents and simple calls)
   */
  async chat(messages, tools = [], systemPrompt = null) {
    const body = {
      model: this.model,
      messages: this._buildMessages(messages, systemPrompt),
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    if (tools.length > 0) {
      body.tools = this.formatTools(tools);
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new ProviderError(
        `${res.status} ${res.statusText}: ${errorBody}`,
        res.status,
        errorBody
      );
    }

    const data = await res.json();

    if (data.usage) {
      this.usage.promptTokens += data.usage.prompt_tokens || 0;
      this.usage.completionTokens += data.usage.completion_tokens || 0;
      this.usage.totalTokens += data.usage.total_tokens || 0;
    }

    const choice = data.choices?.[0];
    if (!choice) throw new ProviderError('No choices in response');

    const result = {
      content: choice.message?.content || '',
      toolCalls: [],
    };

    if (choice.message?.tool_calls) {
      result.toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: this._parseArgs(tc.function.arguments),
      }));
    }

    return result;
  }

  /**
   * Build the messages array with optional system prompt
   */
  _buildMessages(messages, systemPrompt) {
    const result = [];
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }
    result.push(...messages);
    return result;
  }

  /**
   * Safely parse JSON arguments from tool calls
   */
  _parseArgs(argsStr) {
    if (!argsStr || typeof argsStr !== 'string') return {};
    try {
      return JSON.parse(argsStr);
    } catch {
      return { _raw: argsStr };
    }
  }

  /**
   * Generate vector embeddings for text
   */
  async embed(text) {
    if (!this.apiKey) return null;
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.data?.[0]?.embedding || null;
    } catch {
      return null;
    }
  }

  /**
   * Reset usage counters
   */
  resetUsage() {
    this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}

/**
 * Custom error class for provider errors
 */
export class ProviderError extends Error {
  constructor(message, statusCode = null, responseBody = null) {
    super(message);
    this.name = 'ProviderError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  get isRateLimited() {
    return this.statusCode === 429;
  }

  get isAuth() {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}
