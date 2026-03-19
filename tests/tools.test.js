import test from 'node:test';
import assert from 'node:assert';
import { ToolRegistry } from '../src/tools/registry.js';

test('ToolRegistry - Lifecycle', async () => {
  const registry = new ToolRegistry();
  
  // Verify builtin tools are loaded
  const tools = registry.getAll();
  assert.ok(tools.length >= 9); // We have at least 9 built-in tools
  
  const schemas = registry.getSchemas();
  assert.strictEqual(tools.length, schemas.length);
  
  // Verify specific tools exist
  assert.ok(registry.get('read_file'));
  assert.ok(registry.get('execute'));
  
  // Test execute valid tool
  const result = await registry.execute('write_todos', { action: 'get' }, process.cwd());
  assert.ok(result.todos);
  
  // Test execute invalid tool
  const invalidResult = await registry.execute('fake_tool_xyz', {}, process.cwd());
  assert.ok(invalidResult.error);
  assert.ok(invalidResult.error.includes('Unknown tool: fake_tool_xyz'));
});

test('ToolRegistry - Custom Registration', () => {
  const registry = new ToolRegistry();
  
  const myTool = {
    name: 'my_tool',
    description: 'test',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({ success: true })
  };
  
  registry.register(myTool);
  assert.ok(registry.get('my_tool'));
  
  registry.unregister('my_tool');
  assert.strictEqual(registry.get('my_tool'), undefined);
});
