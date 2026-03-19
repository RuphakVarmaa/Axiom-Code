/**
 * Axiom — Tool: execute
 * Run shell commands with timeout and output capture
 */

import { execSync, exec } from 'child_process';
import path from 'path';

export const executeTool = {
  name: 'execute',
  description: 'Execute a shell command and return its output. Commands run in the current working directory. For long-running commands, consider setting a timeout.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'integer',
        description: 'Timeout in seconds (default: 30, max: 120)',
      },
    },
    required: ['command'],
  },
  requiresPermission: true,

  async execute(params, cwd) {
    const timeout = Math.min(params.timeout || 30, 120) * 1000;

    try {
      const output = execSync(params.command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB output buffer
        encoding: 'utf-8',
        env: { ...process.env, PAGER: 'cat' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return {
        exitCode: 0,
        stdout: truncateOutput(output || ''),
        stderr: '',
      };
    } catch (err) {
      return {
        exitCode: err.status ?? 1,
        stdout: truncateOutput(err.stdout || ''),
        stderr: truncateOutput(err.stderr || err.message || ''),
        timedOut: err.killed || false,
      };
    }
  },
};

function truncateOutput(output, maxLen = 10000) {
  if (output.length <= maxLen) return output;
  const half = Math.floor(maxLen / 2);
  return output.slice(0, half) +
    `\n\n... [${output.length - maxLen} characters truncated] ...\n\n` +
    output.slice(-half);
}
