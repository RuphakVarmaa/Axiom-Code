/**
 * Axiom — Loading Spinner
 */

import ora from 'ora';
import { theme } from './theme.js';

export function createSpinner(text = 'Thinking') {
  return ora({
    text: theme.dim(text),
    color: 'magenta',
    spinner: 'dots',
  });
}

export function toolSpinner(toolName, params) {
  let label = toolName;
  if (toolName === 'read_file' && params?.path) label = `Reading ${params.path}`;
  else if (toolName === 'write_file' && params?.path) label = `Writing ${params.path}`;
  else if (toolName === 'edit_file' && params?.path) label = `Editing ${params.path}`;
  else if (toolName === 'execute' && params?.command) label = `Running: ${params.command.slice(0, 60)}`;
  else if (toolName === 'grep' && params?.pattern) label = `Searching for "${params.pattern}"`;
  else if (toolName === 'find' && params?.pattern) label = `Finding ${params.pattern}`;
  else if (toolName === 'list_dir' && params?.path) label = `Listing ${params.path}`;
  else if (toolName === 'web_fetch' && params?.url) label = `Fetching ${params.url}`;
  else if (toolName === 'task') label = `Spawning sub-agent`;

  return ora({
    text: theme.toolName(toolName) + theme.dim(` ${label}`),
    color: 'yellow',
    spinner: 'dots',
  });
}
