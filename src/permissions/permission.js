/**
 * Axiom — Permission System
 * Prompts user before dangerous operations
 */

import inquirer from 'inquirer';
import { theme, icons } from '../ui/theme.js';

let sessionPermissions = {};

/**
 * Check if an action is permitted, prompting if needed
 */
export async function checkPermission(toolName, params, config) {
  // Yolo mode — auto-approve everything
  if (config?.permissions?.yoloMode) return true;

  // Read operations — auto-approve by default
  const readTools = ['read_file', 'grep', 'find', 'list_dir', 'web_fetch', 'write_todos'];
  if (readTools.includes(toolName) && config?.permissions?.autoApproveReads !== false) {
    return true;
  }

  // Write operations
  if ((toolName === 'write_file' || toolName === 'edit_file') && config?.permissions?.autoApproveWrites) {
    return true;
  }

  // Shell commands
  if (toolName === 'execute' && config?.permissions?.autoApproveCommands) {
    return true;
  }

  // Check session-level permissions
  if (sessionPermissions[toolName]) return true;

  // Prompt user
  return promptPermission(toolName, params);
}

async function promptPermission(toolName, params) {
  console.log();

  let description = '';
  switch (toolName) {
    case 'write_file':
      description = `${icons.file} Write file: ${theme.filePath(params.path)}`;
      break;
    case 'edit_file':
      description = `${icons.file} Edit file: ${theme.filePath(params.path)}`;
      break;
    case 'execute':
      description = `${icons.command} Run command: ${theme.command(params.command)}`;
      break;
    case 'task':
      description = `${icons.subagent} Spawn sub-agent: ${theme.dim(params.description?.slice(0, 80) || 'sub-task')}`;
      break;
    default:
      description = `${icons.lock} ${toolName}: ${JSON.stringify(params).slice(0, 100)}`;
  }

  console.log(theme.warning(`  ${icons.warning} Permission required`));
  console.log(`  ${description}`);

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: theme.brand('Allow?'),
    choices: [
      { name: 'Yes (this once)', value: 'yes' },
      { name: 'Always (for this session)', value: 'always' },
      { name: 'No (skip)', value: 'no' },
    ],
  }]);

  if (action === 'always') {
    sessionPermissions[toolName] = true;
    return true;
  }

  return action === 'yes';
}

/**
 * Reset session permissions (on new session)
 */
export function resetSessionPermissions() {
  sessionPermissions = {};
}

/**
 * Grant session-wide permission for a tool
 */
export function grantSession(toolName) {
  sessionPermissions[toolName] = true;
}

/**
 * Enable/disable yolo mode at runtime
 */
export function setYoloMode(config, enabled) {
  config.permissions.yoloMode = enabled;
  return config;
}
