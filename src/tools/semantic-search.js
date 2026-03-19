/**
 * Axiom — Tool: semantic_search
 * Find code based on meaning using vector embeddings
 */

import { VectorStore } from '../search/vector-store.js';
import { theme, icons } from '../ui/theme.js';

export const semanticSearchTool = {
  name: 'semantic_search',
  description: 'Search the current workspace for code based on natural language meaning (requires index_repo first)',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language search query (e.g., "where is the user login handled?")' },
      limit: { type: 'number', description: 'Number of results to return', default: 5 },
    },
    required: ['query'],
  },
  async execute(params, cwd, provider) {
    const store = new VectorStore(cwd);
    if (!store.index.documents || store.index.documents.length === 0) {
      return { error: 'Workspace index is empty. Please run index_repo first.' };
    }

    console.log(theme.dim(`\n  ${icons.search} Searching for: "${params.query}"...`));
    
    // Generate embedding for query
    const emb = await provider.embed(params.query);
    if (!emb) return { error: 'Failed to generate embedding for search query.' };

    const results = store.search(emb, params.limit || 5);
    
    return {
      query: params.query,
      results: results.map(r => ({
        path: r.metadata.path,
        score: r.score.toFixed(4),
        preview: r.text.slice(0, 500) + '...',
      })),
    };
  },
};
