/**
 * Axiom — Tool: grep
 * Search file contents with regex or literal strings
 */

import { execSync } from 'child_process';
import path from 'path';

export const grepTool = {
  name: 'grep',
  description: 'Search for a pattern in files. Uses grep under the hood. Returns matching lines with file paths and line numbers.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The search pattern (regex supported)',
      },
      path: {
        type: 'string',
        description: 'Directory or file to search in (default: current directory)',
      },
      include: {
        type: 'string',
        description: 'Glob pattern for files to include (e.g., "*.js", "*.py")',
      },
      case_insensitive: {
        type: 'boolean',
        description: 'Case-insensitive search (default: false)',
      },
    },
    required: ['pattern'],
  },
  requiresPermission: false,

  async execute(params, cwd) {
    const searchPath = path.resolve(cwd, params.path || '.');
    const flags = ['-rnI', '--color=never'];

    if (params.case_insensitive) flags.push('-i');
    if (params.include) flags.push(`--include="${params.include}"`);

    const cmd = `grep ${flags.join(' ')} "${params.pattern.replace(/"/g, '\\"')}" "${searchPath}" 2>/dev/null | head -50`;

    try {
      const output = execSync(cmd, {
        cwd,
        encoding: 'utf-8',
        maxBuffer: 512 * 1024,
        timeout: 15000,
      });

      const lines = output.trim().split('\n').filter(Boolean);
      const results = lines.map(line => {
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          return {
            file: path.relative(cwd, match[1]),
            line: parseInt(match[2]),
            content: match[3].trim(),
          };
        }
        return { raw: line };
      });

      return {
        matches: results.length,
        results: results.slice(0, 50),
        truncated: lines.length > 50,
      };
    } catch (err) {
      if (err.status === 1) {
        return { matches: 0, results: [], message: 'No matches found' };
      }
      return { error: err.message };
    }
  },
};
