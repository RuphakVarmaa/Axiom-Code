/**
 * Axiom — Tool: list_dir
 * List directory contents with metadata
 */

import fs from 'fs';
import path from 'path';

export const listDirTool = {
  name: 'list_dir',
  description: 'List the contents of a directory, showing files and subdirectories with their sizes and types.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list (default: current directory)',
      },
    },
    required: [],
  },
  requiresPermission: false,

  async execute(params, cwd) {
    const dirPath = path.resolve(cwd, params.path || '.');

    if (!fs.existsSync(dirPath)) {
      return { error: `Directory not found: ${dirPath}` };
    }

    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return { error: `Not a directory: ${dirPath}` };
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const results = entries
        .filter(e => !e.name.startsWith('.')) // Skip hidden by default
        .map(entry => {
          const fullPath = path.join(dirPath, entry.name);
          const info = { name: entry.name };

          if (entry.isDirectory()) {
            info.type = 'directory';
            try {
              info.children = fs.readdirSync(fullPath).length;
            } catch { info.children = 0; }
          } else if (entry.isFile()) {
            info.type = 'file';
            try {
              const s = fs.statSync(fullPath);
              info.size = formatSize(s.size);
            } catch { info.size = '?'; }
          } else {
            info.type = 'other';
          }
          return info;
        })
        .sort((a, b) => {
          // Directories first, then files
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });

      return {
        path: dirPath,
        count: results.length,
        entries: results,
      };
    } catch (err) {
      return { error: err.message };
    }
  },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
