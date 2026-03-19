/**
 * Axiom — Tool: write_todos
 * Task planning tool — creates and tracks a checklist (inspired by deepagents)
 */

import { theme, icons } from '../ui/theme.js';

// In-memory todo state for the current session
let currentTodos = [];

export const writeTodosTool = {
  name: 'write_todos',
  description: 'Create or update a task checklist for planning and tracking progress. Use this to break complex tasks into steps before executing them. Each todo has an id, title, and status (pending, in_progress, done).',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'get'],
        description: '"create" to set a new list, "update" to change a todo status, "get" to retrieve current list',
      },
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
          },
        },
        description: 'For "create": the full list. For "update": only the todos to change.',
      },
    },
    required: ['action'],
  },
  requiresPermission: false,

  async execute(params) {
    switch (params.action) {
      case 'create':
        currentTodos = (params.todos || []).map((t, i) => ({
          id: t.id || `step_${i + 1}`,
          title: t.title,
          status: t.status || 'pending',
        }));
        displayTodos();
        return { todos: currentTodos };

      case 'update':
        for (const update of (params.todos || [])) {
          const existing = currentTodos.find(t => t.id === update.id);
          if (existing && update.status) {
            existing.status = update.status;
          }
        }
        displayTodos();
        return { todos: currentTodos };

      case 'get':
        return { todos: currentTodos };

      default:
        return { error: `Unknown action: ${params.action}` };
    }
  },
};

function displayTodos() {
  if (currentTodos.length === 0) return;

  console.log();
  console.log(theme.brandBold(`  ${icons.task} Task Plan`));

  for (const todo of currentTodos) {
    let icon, style;
    switch (todo.status) {
      case 'done':
        icon = theme.success(icons.success);
        style = theme.dim;
        break;
      case 'in_progress':
        icon = theme.warning('◉');
        style = theme.assistantText;
        break;
      default:
        icon = theme.dim('○');
        style = theme.dim;
    }
    console.log(`  ${icon} ${style(todo.title)}`);
  }
  console.log();
}

export function getTodos() {
  return currentTodos;
}

export function resetTodos() {
  currentTodos = [];
}
