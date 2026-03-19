/**
 * Axiom — CLI Entry Point
 * Parses arguments, loads config, initializes provider, routes to REPL or one-shot
 */

import { Command } from 'commander';
import { loadConfig, getActiveProfile } from './config/config.js';
import { runSetupWizard } from './config/setup-wizard.js';
import { UniversalProvider } from './providers/universal.js';
import { AnthropicNativeProvider } from './providers/anthropic-native.js';
import { GeminiNativeProvider } from './providers/gemini-native.js';
import { Repl } from './repl.js';
import { AgentLoop } from './core/agent-loop.js';
import { ContextManager } from './core/context.js';
import { SessionManager } from './session/session.js';
import { theme, icons } from './ui/theme.js';

const VERSION = '1.0.0';

function createProvider(profile, config) {
  const opts = {
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    maxTokens: config.maxTokens || 8192,
    temperature: config.temperature || 0.7,
  };

  switch (profile.provider) {
    case 'anthropic-native':
      return new AnthropicNativeProvider(opts);
    case 'gemini-native':
      return new GeminiNativeProvider(opts);
    default:
      return new UniversalProvider(opts);
  }
}

export async function run(argv) {
  const program = new Command();

  program
    .name('axiom')
    .description('Universal agentic coding assistant for the terminal')
    .version(VERSION)
    .argument('[message...]', 'One-shot message (runs once and exits)')
    .option('-p, --profile <name>', 'Use a specific provider profile')
    .option('-m, --model <name>', 'Override the model')
    .option('--yolo', 'Auto-approve all tool permissions')
    .option('--resume <id>', 'Resume a saved session')
    .action(async (messageParts, opts) => {
      let config = loadConfig();

      // First-run setup
      if (config._isNew || Object.keys(config.profiles).length === 0) {
        config = await runSetupWizard(config);
      }

      // Profile override
      if (opts.profile) {
        if (!config.profiles[opts.profile]) {
          console.log(theme.error(`  ${icons.error} Profile "${opts.profile}" not found.`));
          console.log(theme.dim(`  Available: ${Object.keys(config.profiles).join(', ')}`));
          process.exit(1);
        }
        config.activeProfile = opts.profile;
      }

      // Yolo mode
      if (opts.yolo) {
        config.permissions.yoloMode = true;
      }

      const profile = getActiveProfile(config);
      if (!profile) {
        console.log(theme.error(`  ${icons.error} No active profile. Run: axiom config`));
        process.exit(1);
      }

      // Model override
      if (opts.model) {
        profile.model = opts.model;
      }

      const provider = createProvider(profile, config);

      // Resume session
      if (opts.resume) {
        const sessionManager = new SessionManager();
        const session = sessionManager.load(opts.resume);
        if (!session) {
          console.log(theme.error(`  ${icons.error} Session not found: ${opts.resume}`));
          process.exit(1);
        }
        const context = ContextManager.fromJSON(session, provider);
        const repl = new Repl(provider, config);
        repl.context = context;
        repl.agentLoop = new AgentLoop(provider, context, config);
        repl.sessionId = opts.resume;
        console.log(theme.success(`  ${icons.success} Resumed: ${session.title}\n`));
        return repl.start();
      }

      // Check for piped input
      let pipedInput = '';
      if (!process.stdin.isTTY) {
        pipedInput = await readStdin();
      }

      const message = messageParts?.join(' ') || '';

      // One-shot mode
      if (message || pipedInput) {
        const fullMessage = pipedInput
          ? `${message}\n\n---\n\n${pipedInput}`
          : message;

        const context = new ContextManager(process.cwd(), provider);
        const agentLoop = new AgentLoop(provider, context, config);
        await agentLoop.processMessage(fullMessage);
        process.exit(0);
      }

      // Interactive REPL
      const repl = new Repl(provider, config);
      return repl.start();
    });

  // Config subcommand
  program
    .command('config')
    .description('Reconfigure Axiom (run setup wizard)')
    .action(async () => {
      let config = loadConfig();
      config = await runSetupWizard(config);
    });

  // Sessions subcommand
  program
    .command('sessions')
    .description('List saved sessions')
    .action(() => {
      const sm = new SessionManager();
      sm.displayList();
    });

  await program.parseAsync(argv);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}
