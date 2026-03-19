/**
 * Axiom — Tool: write_file
 * Create or overwrite files with content
 */

import fs from 'fs';
import path from 'path';

export const writeFileTool = {
  name: 'write_file',
  description: 'Create a new file or overwrite an existing file with the given content. Parent directories are created automatically.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path for the file to write',
      },
      content: {
        type: 'string',
        description: 'The full content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
  requiresPermission: true,

  async execute(params, cwd) {
    const filePath = path.resolve(cwd, params.path);
    const dir = path.dirname(filePath);
    const existed = fs.existsSync(filePath);

    // Create parent dirs
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, params.content, 'utf-8');

    const stat = fs.statSync(filePath);
    return {
      path: filePath,
      action: existed ? 'overwritten' : 'created',
      size: stat.size,
      lines: params.content.split('\n').length,
    };
  },
};
