import { PROVIDER_PRESETS } from './config.js';

/**
 * Axiom Smart Key Detector
 * Automatically identifies LLM providers based on API key patterns
 * (Frictionless Onboarding by Ruphak Varmaa)
 */

export function detectProviderFromKey(apiKey) {
    if (!apiKey) return null;

    // Sanitize input (strip non-ASCII/hidden characters)
    apiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

    // 1. OpenRouter (Elite Priority)
    if (apiKey.startsWith('sk-or-')) {
        return {
            key: 'openrouter',
            ...PROVIDER_PRESETS.openrouter
        };
    }

    // 2. Anthropic (Claude)
    if (apiKey.startsWith('sk-ant-')) {
        return {
            key: 'anthropic',
            ...PROVIDER_PRESETS.anthropic
        };
    }

    // 3. Google Gemini
    if (apiKey.startsWith('AIza')) {
        return {
            key: 'gemini',
            ...PROVIDER_PRESETS.gemini
        };
    }

    // 4. OpenAI (Standard prefixes)
    if (apiKey.startsWith('sk-') && !apiKey.includes('ant-') && !apiKey.includes('or-')) {
        // This could be OpenAI, DeepSeek, or Mistral. 
        // We favor OpenAI as the default for this prefix, but will suggest others if it fails.
        return {
            key: 'openai',
            ...PROVIDER_PRESETS.openai
        };
    }

    return null;
}
