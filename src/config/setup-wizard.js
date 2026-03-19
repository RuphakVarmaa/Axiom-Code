/**
 * Axiom — First-Run Setup Wizard
 * Interactive provider configuration on first launch
 */

import inquirer from 'inquirer';
import { PROVIDER_PRESETS, addProfile, saveConfig } from './config.js';
import { detectProviderFromKey } from './detector.js';
import { theme, icons } from '../ui/theme.js';
import { printWelcome } from '../ui/banner.js';

export async function runSetupWizard(config) {
  printWelcome();

  const presetChoices = [
    { name: theme.brandBold('✨ Smart Setup (Just Paste API Key)'), value: 'smart' },
    ...Object.entries(PROVIDER_PRESETS).map(([key, preset]) => ({
      name: `${preset.label}${preset.noApiKey ? ' (no API key needed)' : ''}`,
      value: key,
    }))
  ];

  let { providerKey } = await inquirer.prompt([{
    type: 'list',
    name: 'providerKey',
    message: theme.brand('How would you like to configure Axiom?'),
    choices: presetChoices,
  }]);

  let apiKey = '';
  let preset = null;

  if (providerKey === 'smart') {
      const { inputKey } = await inquirer.prompt([{
          type: 'password',
          name: 'inputKey',
          message: theme.brand('Paste your API Key:'),
          mask: '*',
          validate: (v) => v.length > 5 ? true : 'API key seems too short',
      }]);
      
      const detected = detectProviderFromKey(inputKey);
      if (detected) {
          console.log(theme.success(`  ${icons.success} Detected: ${theme.brandBold(detected.label)}`));
          providerKey = detected.key;
          preset = detected;
          apiKey = inputKey;
      } else {
          console.log(theme.warning(`  ${icons.warning} Could not auto-detect. Falling back to manual selection.`));
          const fallback = await inquirer.prompt([{
              type: 'list',
              name: 'providerKey',
              message: theme.brand('Select provider manually:'),
              choices: presetChoices.filter(c => c.value !== 'smart'),
          }]);
          providerKey = fallback.providerKey;
          preset = PROVIDER_PRESETS[providerKey];
          apiKey = inputKey;
      }
  } else {
      preset = PROVIDER_PRESETS[providerKey];
  }
  const profile = {
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
  };

  // Custom endpoint
  if (providerKey === 'custom') {
    const { baseUrl } = await inquirer.prompt([{
      type: 'input',
      name: 'baseUrl',
      message: theme.brand('Enter your API base URL (e.g. https://api.example.com/v1):'),
      validate: (v) => v.startsWith('http') ? true : 'Must start with http:// or https://',
    }]);
    profile.baseUrl = baseUrl;

    const { model } = await inquirer.prompt([{
      type: 'input',
      name: 'model',
      message: theme.brand('Enter the model name:'),
      validate: (v) => v.length > 0 ? true : 'Model name is required',
    }]);
    profile.model = model;
  }

  // API key (if not already collected via Smart Setup and not a local provider)
  if (!apiKey && !preset.noApiKey) {
    const { inputKey } = await inquirer.prompt([{
      type: 'password',
      name: 'inputKey',
      message: theme.brand(`Enter your ${preset.label} API key:`),
      mask: '*',
      validate: (v) => v.length > 5 ? true : 'API key seems too short',
    }]);
    apiKey = inputKey;
  }
  
  profile.apiKey = apiKey;

  // Model override
  if (providerKey !== 'custom') {
    const { customModel } = await inquirer.prompt([{
      type: 'input',
      name: 'customModel',
      message: theme.brand(`Model (press Enter for ${preset.defaultModel}):`),
      default: preset.defaultModel,
    }]);
    profile.model = customModel;
  }

  // Profile name
  const { profileName } = await inquirer.prompt([{
    type: 'input',
    name: 'profileName',
    message: theme.brand('Name this profile:'),
    default: providerKey,
    validate: (v) => /^[a-zA-Z0-9_-]+$/.test(v) ? true : 'Alphanumeric, hyphens, underscores only',
  }]);

  config = addProfile(config, profileName, profile);

  // Ask to add another
  const { addAnother } = await inquirer.prompt([{
    type: 'confirm',
    name: 'addAnother',
    message: theme.dim('Add another provider profile?'),
    default: false,
  }]);

  if (addAnother) {
    return runSetupWizard(config);
  }

  console.log();
  console.log(theme.success(`  ${icons.success} Setup complete! Active profile: ${theme.brand(config.activeProfile)}`));
  console.log();

  return config;
}

/**
 * Quick add — add a profile without full wizard
 */
export async function quickAddProfile(config) {
  const presetChoices = Object.entries(PROVIDER_PRESETS).map(([key, preset]) => ({
    name: preset.label,
    value: key,
  }));

  const { providerKey } = await inquirer.prompt([{
    type: 'list',
    name: 'providerKey',
    message: theme.brand('Provider:'),
    choices: presetChoices,
  }]);

  const preset = PROVIDER_PRESETS[providerKey];
  const profile = {
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
  };

  if (!preset.noApiKey) {
    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: theme.brand('API key:'),
      mask: '*',
    }]);
    profile.apiKey = apiKey;
  }

  const { profileName } = await inquirer.prompt([{
    type: 'input',
    name: 'profileName',
    message: theme.brand('Profile name:'),
    default: providerKey,
  }]);

  config = addProfile(config, profileName, profile);
  console.log(theme.success(`  ${icons.success} Profile "${profileName}" added.`));

  return config;
}
