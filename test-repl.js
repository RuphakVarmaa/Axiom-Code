import { Repl } from './src/repl.js';

// Mock Provider for testing
class MockProvider {
  constructor() {
    this.usage = { promptTokens: 0, completionTokens: 0 };
  }
  async *streamChat(messages) {
    yield { type: 'text', content: 'Mock response from LLM.\n' };
    yield { type: 'done' };
  }
}

const config = {
  activeProfile: 'claude',
  profiles: { claude: { provider: 'custom', model: 'mock' } },
  permissions: { yoloMode: true },
};

const repl = new Repl(new MockProvider(), config);
console.log('Starting REPL...');
repl.start();
