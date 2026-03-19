/**
 * Axiom — Tool: index_repo
 * Chunks and vectorizes the current workspace for semantic search
 */

import fs from 'fs';
import path from 'path';
import { VectorStore } from '../search/vector-store.js';
import { theme, icons } from '../ui/theme.js';

export const indexRepoTool = {
  name: 'index_repo',
  description: 'Scan and vectorize the current workspace for semantic code search',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory to index (defaults to current)' },
      force: { type: 'boolean', description: 'Force re-indexing' },
    },
  },
  requiresPermission: true,
  async execute(params, cwd, provider) {
    const root = params.path || cwd;
    const store = new VectorStore(root);
    
    if (store.index.documents.length > 0 && !params.force) {
      return { message: `Already indexed ${store.index.documents.length} chunks. Use force: true to re-index.` };
    }

    console.log(theme.dim(`\n  ${icons.subagent} Indexing codebase at ${root}...`));
    store.clear();

    const files = walk(root).filter(f => !f.includes('node_modules') && !f.includes('.git'));
    let count = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const chunks = chunkText(content, 1000);
        
        for (let i = 0; i < chunks.length; i++) {
          const emb = await provider.embed(chunks[i]);
          if (emb) {
            store.addDocument(`${file}#${i}`, chunks[i], { path: file, chunk: i }, emb);
            count++;
          }
        }
      } catch {
        // Skip binary or unreadable files
      }
    }

    store.save();
    return { success: true, message: `Indexed ${files.length} files into ${count} semantic chunks.` };
  },
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
