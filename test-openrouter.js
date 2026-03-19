import { UniversalProvider } from './src/providers/universal.js';

const provider = new UniversalProvider({
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  model: 'openrouter/auto',
  maxTokens: 50,
});

async function run() {
  console.log('Sending first message...');
  let stream = provider.streamChat([{ role: 'user', content: 'hello' }]);
  for await (const chunk of stream) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
  }
  console.log('\nFirst message done.');

  console.log('\nSending second message...');
  let stream2 = provider.streamChat([
    { role: 'user', content: 'hi' },
    { 
      role: 'assistant', 
      content: '', 
      tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'list_dir', arguments: '{"path":"/tmp"}' } }]
    },
    { role: 'tool', tool_call_id: 'call_123', content: 'Files: a, b, c' },
    { role: 'assistant', content: 'I have checked the files.' },
    { role: 'user', content: 'what can u do' }
  ], [
    { name: 'list_dir', description: 'Lists a directory', parameters: { type: 'object', properties: {} } }
  ]);
  
  // Adding timeout to see if it stalls
  const timeout = setTimeout(() => {
    console.error('\n[TEST] SECOND MESSAGE STALLED! fetch never returned data');
    process.exit(1);
  }, 10000);

  for await (const chunk of stream2) {
    if (chunk.type === 'text') process.stdout.write(chunk.content);
  }
  clearTimeout(timeout);
  console.log('\nSecond message done.');
}

run().catch(console.error);
