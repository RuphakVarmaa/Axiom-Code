/**
 * Axiom — Configuration System
 * Manages ~/.axiom/config.json with provider profiles
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const AXIOM_DIR = path.join(os.homedir(), '.axiom');
const CONFIG_PATH = path.join(AXIOM_DIR, 'config.json');
const SESSIONS_DIR = path.join(AXIOM_DIR, 'sessions');

const DEFAULT_CONFIG = {
  activeProfile: null,
  profiles: {},
  permissions: {
    autoApproveReads: true,
    autoApproveWrites: false,
    autoApproveCommands: false,
    yoloMode: false,
  },
  trustedWorkspaces: [],
  maxIterations: 25,
  maxTokens: 8192,
  temperature: 0.7,
  mcpServers: {},
};

/**
 * Known provider presets — baseUrl templates for common providers.
 * Users only need to supply their API key; we fill in the rest.
 */
export const PROVIDER_PRESETS = {
  openai: {
    provider: 'universal',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    label: 'OpenAI',
  },
  anthropic: {
    provider: 'anthropic-native',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20240620',
    label: 'Anthropic (Claude)',
  },
  openrouter: {
    provider: 'universal',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'auto',
    label: 'OpenRouter',
  },
  gemini: {
    provider: 'gemini-native',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-pro',
    label: 'Google Gemini',
  },
  deepseek: {
    provider: 'universal',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    label: 'DeepSeek',
  },
  groq: {
    provider: 'universal',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    label: 'Groq',
  },
  mistral: {
    provider: 'universal',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    label: 'Mistral AI',
  },
  ollama: {
    provider: 'universal',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:8b',
    label: 'Ollama (Local)',
    noApiKey: true,
  },
  lmstudio: {
    provider: 'universal',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    label: 'LM Studio (Local)',
    noApiKey: true,
  },
  custom: {
    provider: 'universal',
    baseUrl: '',
    defaultModel: '',
    label: 'Custom OpenAI-compatible endpoint',
  },
};

export function ensureAxiomDir() {
  if (!fs.existsSync(AXIOM_DIR)) {
    fs.mkdirSync(AXIOM_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

export function loadConfig() {
  ensureAxiomDir();

  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, _isNew: true };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...config, _isNew: false };
  } catch {
    return { ...DEFAULT_CONFIG, _isNew: true };
  }
}

export function saveConfig(config) {
  ensureAxiomDir();
  const { _isNew, ...clean } = config;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(clean, null, 2), 'utf-8');
}

export function getActiveProfile(config) {
  if (!config.activeProfile || !config.profiles[config.activeProfile]) {
    return null;
  }
  return config.profiles[config.activeProfile];
}

export function addProfile(config, name, profileData) {
  config.profiles[name] = profileData;
  if (!config.activeProfile) {
    config.activeProfile = name;
  }
  saveConfig(config);
  return config;
}

export function switchProfile(config, name) {
  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" does not exist. Available: ${Object.keys(config.profiles).join(', ')}`);
  }
  config.activeProfile = name;
  saveConfig(config);
  return config;
}

export function listProfiles(config) {
  return Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    ...profile,
    active: name === config.activeProfile,
  }));
}

export { AXIOM_DIR, CONFIG_PATH, SESSIONS_DIR };

/**
 * Check if current workspace is trusted
 */
export function isWorkspaceTrusted(cwd) {
  const config = loadConfig();
  return config.trustedWorkspaces?.includes(cwd) || false;
}

/**
 * Trust the current workspace
 */
export function trustWorkspace(cwd) {
  const config = loadConfig();
  if (!config.trustedWorkspaces) config.trustedWorkspaces = [];
  if (!config.trustedWorkspaces.includes(cwd)) {
    config.trustedWorkspaces.push(cwd);
    saveConfig(config);
  }
}

