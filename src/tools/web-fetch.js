/**
 * Axiom — Tool: web_fetch
 * Fetch and extract text content from a URL
 */

export const webFetchTool = {
  name: 'web_fetch',
  description: 'Fetch content from a URL and return it as text. Strips HTML tags for web pages. Useful for reading documentation, APIs, or web pages.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch content from',
      },
    },
    required: ['url'],
  },
  requiresPermission: false,

  async execute(params) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(params.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Axiom-CLI/1.0',
          'Accept': 'text/html,application/json,text/plain,*/*',
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return { error: `HTTP ${res.status} ${res.statusText}` };
      }

      const contentType = res.headers.get('content-type') || '';
      let text = await res.text();

      // Strip HTML if it's a web page
      if (contentType.includes('html')) {
        text = stripHtml(text);
      }

      // Truncate to avoid blowing up context
      if (text.length > 15000) {
        text = text.slice(0, 15000) + '\n\n... [content truncated at 15000 chars]';
      }

      return {
        url: params.url,
        contentType,
        length: text.length,
        content: text,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { error: 'Request timed out (15s)' };
      }
      return { error: err.message };
    }
  },
};

function stripHtml(html) {
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
