/**
 * Axiom — Theme & Color Palette
 * Premium dark cyberpunk aesthetic
 */

import chalk from 'chalk';
import boxen from 'boxen';

// Claude/Anthropic inspired premium dark palette
const palette = {
  primary: '#d97757',    // Claude-like clay/rust orange for brand
  secondary: '#38bdf8',  // Sky 400 - brighter blue for better visibility
  surface: '#18181b',    // Gray 900
  surfaceHighlight: '#27272a',
  text: '#e4e4e7',       // Gray 200
  dim: '#a1a1aa',        // Zinc 400 - brighter gray for better visibility
  success: '#10b981',    // Emerald 500
  warning: '#f59e0b',    // Amber 500
  error: '#ef4444',      // Red 500
  codeBg: '#1e1e1e',
  codePink: '#ec4899',
};

export const theme = {
  // Brand
  brand: chalk.hex(palette.primary),
  brandBold: chalk.hex(palette.primary).bold,
  tagline: chalk.hex(palette.dim).italic,

  // Semantics
  success: chalk.hex(palette.success),
  error: chalk.hex(palette.error),
  warning: chalk.hex(palette.warning),
  warningBold: chalk.hex(palette.warning).bold,
  info: chalk.hex(palette.secondary),
  dim: chalk.hex(palette.dim),
  text: chalk.hex(palette.text),

  // UI elements
  prompt: chalk.hex(palette.primary).bold,
  userInput: chalk.hex(palette.text),
  assistantText: chalk.hex(palette.text),
  code: chalk.hex('#38bdf8'),          
  filePath: chalk.hex(palette.warning).underline,
  command: chalk.hex(palette.codePink),       

  // Tool status
  toolName: chalk.hex('#a78bfa').bold,
  toolRunning: chalk.hex(palette.warning),
  toolDone: chalk.hex(palette.success),
  toolError: chalk.hex(palette.error),

  // Decorators
  border: chalk.hex(palette.dim),
  separator: chalk.hex(palette.surfaceHighlight),
  badge: (text) => chalk.bgHex(palette.surfaceHighlight).hex(palette.text)(` ${text} `),
  
  // Boxen wrappers
  panel: (content, title = '') => boxen(content, {
    title: title ? chalk.hex(palette.dim)(title) : undefined,
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: '#3f3f46', // zinc-700
  }),
  
  compactPanel: (content) => boxen(content, {
    padding: { left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: '#3f3f46',
  })
};

export const icons = {
  axiom: '▲',
  prompt: '❯',
  thinking: '⟡',
  success: '✔',
  error: '✖',
  warning: '⚠',
  file: '📄',
  folder: '📁',
  command: '❯_',
  search: '🔍',
  web: '🌐',
  task: '◻',
  subagent: '↱',
  lock: '🔒',
  key: '🔑',
  arrow: '→',
  bullet: '•',
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};
