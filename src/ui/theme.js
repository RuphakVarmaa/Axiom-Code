/**
 * Axiom — Theme & Color Palette
 * Ultraprofessional Light Aesthetic (Claude-inspired)
 */

import chalk from 'chalk';
import boxen from 'boxen';

// Professional Light Palette
const palette = {
  primary: '#cc5c33',    // Professional orange-clay
  secondary: '#2563eb',  // Deep blue
  surface: '#ffffff',    // Plain white
  bg: '#f9fafb',         // Gray 50
  border: '#e5e7eb',     // Gray 200
  text: '#1f2937',       // Gray 800
  dim: '#6b7280',        // Gray 500
  success: '#059669',    // Emerald 600
  warning: '#d97706',    // Amber 600
  error: '#dc2626',      // Red 600
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
  code: chalk.hex(palette.secondary).bold,          
  filePath: chalk.hex(palette.primary).underline,
  command: chalk.hex('#be185d'), // Pink 700      

  // Tool status
  toolName: chalk.hex('#6d28d9').bold, // Violet 700
  toolRunning: chalk.hex(palette.warning),
  toolDone: chalk.hex(palette.success),
  toolError: chalk.hex(palette.error),

  // Decorators
  border: chalk.hex(palette.border),
  separator: chalk.hex(palette.border),
  badge: (text) => chalk.bgHex(palette.border).hex(palette.text)(` ${text} `),
  
  // Boxen wrappers
  panel: (content, title = '') => boxen(content, {
    title: title ? chalk.hex(palette.dim)(title) : undefined,
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: '#d1d5db', // Gray 300
    backgroundColor: '#ffffff',
  }),
  
  compactPanel: (content) => boxen(content, {
    padding: { left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  })
};

export const icons = {
  axiom: '▲',
  prompt: '❯',
  thinking: '⟡',
  success: '✓',
  error: '✗',
  warning: '!',
  file: '□',
  folder: '▣',
  command: '❯_',
  search: '⌕',
  web: '☁',
  task: '○',
  subagent: '↳',
  lock: '◷',
  key: '⚿',
  arrow: '→',
  bullet: '•',
  spinner: ['-', '\\', '|', '/'], 
};
