/**
 * Axiom — Tool: edit_file
 * Surgical find-and-replace edits in existing files
 */

import fs from 'fs';
import path from 'path';

export const editFileTool = {
  name: 'edit_file',
  description: 'Make surgical edits to an existing file using find-and-replace. Specify the exact old_text to find and the new_text to replace it with. For multiple non-contiguous edits, call this tool multiple times.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to edit',
      },
      old_text: {
        type: 'string',
        description: 'The exact text to find in the file (must match exactly, including whitespace)',
      },
      new_text: {
        type: 'string',
        description: 'The replacement text',
      },
    },
    required: ['path', 'old_text', 'new_text'],
  },
  requiresPermission: true,

  async execute(params, cwd) {
    const filePath = path.resolve(cwd, params.path);

    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes(params.old_text)) {
      // Fuzzy hint — find close matches
      const lines = content.split('\n');
      const searchTrimmed = params.old_text.trim();
      const candidates = lines
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter(l => l.line.includes(searchTrimmed.split('\n')[0].trim()))
        .slice(0, 3);

      return {
        error: 'old_text not found in file. Make sure it matches exactly (including whitespace).',
        hint: candidates.length > 0
          ? `Similar lines found at: ${candidates.map(c => `L${c.num}: "${c.line.slice(0, 80)}"`).join(', ')}`
          : 'No similar text found. Try reading the file first.',
      };
    }

    const occurrences = content.split(params.old_text).length - 1;
    const newContent = content.replace(params.old_text, params.new_text);

    fs.writeFileSync(filePath, newContent, 'utf-8');

    return {
      path: filePath,
      replacements: 1,
      totalOccurrences: occurrences,
      note: occurrences > 1 ? `Only first occurrence replaced (${occurrences} total found)` : undefined,
    };
  },
};
