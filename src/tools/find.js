/**
 * Axiom — Tool: find
 * Find files by name or glob pattern
 */

import { execSync } from 'child_process';
import path from 'path';

export const findTool = {
  name: 'find',
  description: 'Find files and directories matching a name or glob pattern. Returns paths relative to the search directory.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob or name pattern to search for (e.g., "*.js", "package.json", "src/**/*.ts")',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: current directory)',
      },
      type: {
        type: 'string',
        enum: ['file', 'directory', 'any'],
        description: 'Filter by type (default: any)',
      },
      max_depth: {
        type: 'integer',
        description: 'Maximum directory depth to search (default: 10)',
      },
    },
    required: ['pattern'],
  },
  requiresPermission: false,

  async execute(params, cwd) {
    const searchPath = path.resolve(cwd, params.path || '.');
    const maxDepth = params.max_depth || 10;

    let typeFlag = '';
    if (params.type === 'file') typeFlag = '-type f';
    else if (params.type === 'directory') typeFlag = '-type d';

    const cmd = `find "${searchPath}" -maxdepth ${maxDepth} ${typeFlag} -name "${params.pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -50`;

    try {
      const output = execSync(cmd, {
        cwd,
        encoding: 'utf-8',
        maxBuffer: 256 * 1024,
        timeout: 10000,
      });

      const results = output.trim().split('\n').filter(Boolean).map(p => path.relative(cwd, p));

      return {
        count: results.length,
        results,
        truncated: results.length >= 50,
      };
    } catch {
      return { count: 0, results: [] };
    }
  },
};
