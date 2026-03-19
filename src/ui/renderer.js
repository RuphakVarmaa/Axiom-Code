/**
 * Axiom — Markdown Terminal Renderer
 * Renders markdown to styled terminal output
 */

import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';
import { theme } from './theme.js';

const marked = new Marked(markedTerminal({
  code: chalk.hex('#38bdf8'),        // Cyan-400
  codespan: chalk.hex('#38bdf8'),
  blockquote: chalk.hex('#a78bfa').italic,
  heading: theme.brandBold,
  strong: chalk.white.bold,
  em: chalk.italic,
  del: chalk.strikethrough,
  link: theme.info.underline,
  listitem: theme.text,
  table: theme.text,
  paragraph: theme.text,
  hr: theme.dim,
  firstHeading: theme.brandBold,
  tab: 2,
}));

export function renderMarkdown(text) {
  if (!text) return '';
  try {
    // Add extra breathing room around paragraphs
    const rendered = marked.parse(text);
    return `\n${rendered}\n`;
  } catch {
    return text;
  }
}

/**
 * Render a tool result in a premium panel format
 */
export function renderToolResult(toolName, result, success = true) {
  const statusIcon = success ? theme.toolDone(icons.success) : theme.toolError(icons.error);
  const name = theme.toolName(toolName);
  
  let content = typeof result === 'string' 
    ? result 
    : JSON.stringify(result, null, 2);
    
  // Truncate very long tool results for the UI
  if (content.length > 500) {
    content = content.slice(0, 500) + theme.dim('\n... (truncated for preview)');
  }

  const output = `  ${statusIcon} ${name}\n\n${theme.dim(content)}`;
  return theme.panel(output);
}

const icons = {
  success: '✔',
  error: '✖'
};

