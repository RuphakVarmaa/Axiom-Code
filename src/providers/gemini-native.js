/**
 * Axiom — Native Gemini Provider
 * 
 * Uses Google's Gemini API with OpenAI compatibility layer.
 * Falls back to universal provider for most operations.
 */

import { UniversalProvider } from './universal.js';

export class GeminiNativeProvider extends UniversalProvider {
  constructor(opts) {
    // Gemini's OpenAI-compatible endpoint
    const baseUrl = opts.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
    super({ ...opts, baseUrl });
  }

  get name() { return 'gemini-native'; }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}
