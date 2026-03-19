/**
 * Axiom — Tool: read_file
 * Read file contents with optional line range
 */

import fs from 'fs';
import path from 'path';

export const readFileTool = {
  name: 'read_file',
  description: 'Read the contents of a file. Optionally specify a line range to read a portion of the file. Returns the file contents as a string.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file to read',
      },
      start_line: {
        type: 'integer',
        description: 'Optional start line (1-indexed, inclusive)',
      },
      end_line: {
        type: 'integer',
        description: 'Optional end line (1-indexed, inclusive)',
      },
    },
    required: ['path'],
  },
  requiresPermission: false,

  async execute(params, cwd) {
    const filePath = path.resolve(cwd, params.path);

    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}` };
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return { error: `Path is a directory, not a file: ${filePath}` };
    }

    // Size guard — don't read files > 1MB fully
    if (stat.size > 1024 * 1024 && !params.start_line) {
      return {
        error: `File is too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Specify start_line and end_line to read a portion.`,
        size: stat.size,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    if (params.start_line || params.end_line) {
      const start = Math.max(1, params.start_line || 1);
      const end = Math.min(lines.length, params.end_line || lines.length);
      const sliced = lines.slice(start - 1, end);

      return {
        content: sliced.map((line, i) => `${start + i}: ${line}`).join('\n'),
        totalLines: lines.length,
        range: `${start}-${end}`,
      };
    }

    return {
      content: lines.map((line, i) => `${i + 1}: ${line}`).join('\n'),
      totalLines: lines.length,
    };
  },
};
