/**
 * Axiom — Tool: git
 * Advanced Git integration for version control
 */

import { execSync } from 'child_process';
import { theme, icons } from '../ui/theme.js';

/**
 * Run a git command and return the output
 */
function runGit(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf-8' }).trim();
  } catch (err) {
    return { error: err.stderr || err.message };
  }
}

export const gitStatusTool = {
  name: 'git_status',
  description: 'Show the status of the current git repository (staged, unstaged, branch)',
  parameters: { type: 'object', properties: {} },
  async execute(params, cwd) {
    const status = runGit('status --short', cwd);
    const branch = runGit('branch --show-current', cwd);
    
    if (status.error) return status;
    
    return {
      branch,
      status: status || 'Clean',
      summary: `On branch ${branch}${status ? '\n' + status : '\nWorking tree clean'}`
    };
  },
};

export const gitDiffTool = {
  name: 'git_diff',
  description: 'Show the diff of staged or unstaged changes',
  parameters: {
    type: 'object',
    properties: {
      staged: { type: 'boolean', description: 'Show staged changes instead of unstaged' },
      path: { type: 'string', description: 'Optional path to show diff for' },
    },
  },
  async execute(params, cwd) {
    const args = `diff ${params.staged ? '--staged' : ''} ${params.path || ''}`;
    const diff = runGit(args, cwd);
    
    if (diff.error) return diff;
    
    return {
      diff: diff || 'No differences found.',
    };
  },
};

export const gitAddTool = {
  name: 'git_add',
  description: 'Stage files for commit',
  parameters: {
    type: 'object',
    properties: {
      files: { type: 'array', items: { type: 'string' }, description: 'Files to stage (use ["."] for all)' },
    },
    required: ['files'],
  },
  requiresPermission: true,
  async execute(params, cwd) {
    const res = runGit(`add ${params.files.join(' ')}`, cwd);
    if (res.error) return res;
    return { success: true, message: `Staged: ${params.files.join(', ')}` };
  },
};

export const gitCommitTool = {
  name: 'git_commit',
  description: 'Commit staged changes with a message',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Commit message' },
    },
    required: ['message'],
  },
  requiresPermission: true,
  async execute(params, cwd) {
    const res = runGit(`commit -m "${params.message}"`, cwd);
    if (res.error) return res;
    return { success: true, message: res };
  },
};
