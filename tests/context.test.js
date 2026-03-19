import test from 'node:test';
import assert from 'node:assert';
import { ContextManager } from '../src/core/context.js';
import path from 'path';

test('ContextManager - Basic Message Flow', () => {
  const ctx = new ContextManager(process.cwd());
  
  assert.strictEqual(ctx.getMessages().length, 0);
  
  ctx.addUserMessage('Hello Axiom');
  assert.strictEqual(ctx.getMessages().length, 1);
  assert.strictEqual(ctx.getMessages()[0].role, 'user');
  assert.strictEqual(ctx.getMessages()[0].content, 'Hello Axiom');
  
  ctx.addAssistantMessage('Hi there');
  assert.strictEqual(ctx.getMessages().length, 2);
  assert.strictEqual(ctx.getMessages()[1].role, 'assistant');
  
  ctx.addToolResult('call_123', 'Result data');
  assert.strictEqual(ctx.getMessages().length, 3);
  assert.strictEqual(ctx.getMessages()[2].role, 'tool');
  assert.strictEqual(ctx.getMessages()[2].tool_call_id, 'call_123');
  
  ctx.clear();
  assert.strictEqual(ctx.getMessages().length, 0);
});

test('ContextManager - System Prompt Construction', () => {
  const ctx = new ContextManager(process.cwd());
  const prompt = ctx.getSystemPrompt();
  
  assert.ok(prompt.includes('You are Axiom, a powerful agentic coding assistant'));
  assert.ok(prompt.includes(`CWD: ${process.cwd()}`));
});

test('ContextManager - Serialization', () => {
  const ctx = new ContextManager('/tmp/test');
  ctx.addUserMessage('test msg');
  
  const serialized = ctx.toJSON();
  assert.strictEqual(serialized.cwd, '/tmp/test');
  assert.strictEqual(serialized.messages.length, 1);
  
  const restored = ContextManager.fromJSON(serialized, null);
  assert.strictEqual(restored.cwd, '/tmp/test');
  assert.strictEqual(restored.getMessages().length, 1);
  assert.strictEqual(restored.getMessages()[0].content, 'test msg');
});
