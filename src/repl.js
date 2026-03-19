/**
 * Axiom — Interactive REPL
 * The main interactive loop with slash commands, streaming, and session management
 */

import readline from 'readline';
import { AgentLoop } from './core/agent-loop.js';
import { ContextManager } from './core/context.js';
import { SessionManager } from './session/session.js';
import { MCPManager } from './mcp/manager.js';
import { Guardian } from './agents/guardian.js';
import { loadConfig, switchProfile, listProfiles, saveConfig, isWorkspaceTrusted, trustWorkspace } from './config/config.js';
import { quickAddProfile } from './config/setup-wizard.js';
import { setYoloMode, resetSessionPermissions } from './permissions/permission.js';
import { resetTodos } from './tools/write-todos.js';
import { theme, icons } from './ui/theme.js';
import { printBanner } from './ui/banner.js';

export class Repl {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.cwd = process.cwd();
    this.context = new ContextManager(this.cwd, provider);
    this.agentLoop = new AgentLoop(provider, this.context, config);
    this.mcpManager = new MCPManager(this.agentLoop.tools);
    this.guardian = new Guardian(this.agentLoop);
    this.sessionManager = new SessionManager();
    this.sessionId = null;
    this.rl = null;
    this.isProcessing = false;
    
    // Heartbeat to keep Node's event loop alive
    this._heartbeat = setInterval(() => {}, 2147483647);
  }

  async start() {
    printBanner(this.config);

    // Workspace Trust Check
    if (!isWorkspaceTrusted(this.cwd)) {
      const trustMsg = 
        `${theme.warningBold('Trust this workspace?')}\n\n` +
        `${theme.dim('You are running Axiom in:')}\n${theme.info(this.cwd)}\n\n` +
        `Allowing trust enables tools like ${theme.command('execute')} and ${theme.command('write_file')}.\n` +
        `Only trust folders you know are safe.`;
      
      console.log(theme.panel(trustMsg));
      
      const tempRl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(resolve => {
        tempRl.question(`  ${theme.prompt('Trust this folder? (y/n): ')}`, resolve);
      });
      tempRl.close();

      if (answer.toLowerCase() === 'y') {
        trustWorkspace(this.cwd);
        console.log(theme.success(`\n  ${icons.success} Workspace trusted.\n`));
      } else {
        console.log(theme.error(`\n  ${icons.error} Workspace not trusted. Exiting for safety.\n`));
        this._onExit();
        return;
      }
    }

    // Initialize MCP servers
    await this.mcpManager.init(this.config.mcpServers || {});

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.rl.on('close', () => {
      if (!this.isProcessing) this._onExit();
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      if (this.isProcessing) {
        this.agentLoop.cancel();
        this.isProcessing = false;
        console.log(theme.dim('\n  Cancelled.'));
        // We MUST prompt again immediately if canceled
        this._prompt();
      } else {
        this._onExit();
      }
    });

    this.rl.on('line', async (input) => {
      if (this.isProcessing) return;

      const trimmed = input.trim();
      if (!trimmed) {
        this._prompt();
        return;
      }

      this.rl.pause();
      this.isProcessing = true;

      try {
        // Magic resume string check (e.g., 2432423444-axiom-resume)
        if (trimmed.includes('-axiom-resume')) {
          const id = trimmed.match(/[a-z0-9]{10,}/)?.[0] || trimmed.split('-')[0].replace(/[^a-z0-9]/g, '');
          await this._handleResume(id);
          return;
        }

        // Slash commands
        if (trimmed.startsWith('/')) {
          await this._handleCommand(trimmed);
        } else {
          // Regular message — send to agent loop
          await this.agentLoop.processMessage(trimmed);
          // Auto-save session
          this._autoSave();
        }
      } catch (err) {
        console.error('\nREPL Error:', err);
      } finally {
        this.isProcessing = false;
        this.rl.resume();
        this._prompt();
      }
    });

    // Start
    this._prompt();
  }

  _prompt() {
    const profile = this.config.activeProfile || '?';
    const promptStr = `${theme.dim(profile)} ${theme.prompt(`${icons.prompt} `)}`;
    this.rl.setPrompt(promptStr);
    this.rl.prompt();
  }

  async _handleResume(id) {
    const sessions = this.sessionManager.list();
    const targetId = id || (sessions.find(s => s.cwd === this.cwd) || sessions[0])?.id;

    if (!targetId) {
      console.log(theme.dim('  No sessions to resume.'));
      return;
    }

    const fullSession = this.sessionManager.load(targetId);
    if (fullSession) {
      this.context.messages = [
        { role: 'user', content: '[Historical context resumed]' },
        { role: 'assistant', content: 'Ready to continue.' },
        ...fullSession.messages
      ];
      this.sessionId = targetId;
      console.log(theme.compactPanel(
        theme.info(`Resumed context: ${theme.assistantText(fullSession.title || targetId)}`) + 
        theme.dim(` (${fullSession.messages?.length || 0} events)`)
      ));
      
      if (this.context.messages.length > 20) {
        await this.context.compact();
      }
    } else {
      console.log(theme.error(`  ${icons.error} Session not found: ${targetId}`));
    }
  }

  async _handlePR() {
    const tools = this.agentLoop.tools;
    const status = await tools.execute('git_status', {}, this.cwd);
    
    if (status.error) {
      console.log(theme.error(`  ${icons.error} PR generation failed: Not a git repository or git not installed.`));
      return;
    }

    const diff = await tools.execute('git_diff', { staged: true }, this.cwd);
    
    if (diff.error || !diff.diff || diff.diff === 'No differences found.') {
      console.log(theme.warning(`  ${icons.warning} No staged changes found. Stage your changes with ${theme.command('git add')} first.`));
      return;
    }

    console.log(theme.dim(`\n  ${icons.subagent} Generating Pull Request description...`));
    
    const prPrompt = `Based on the conversation history and the following staged git diff, generate a professional, high-quality Pull Request description in Markdown format.
Include sections for:
- Summary of changes
- Rationale
- Testing performed

DIFF:
${diff.diff}`;

    await this.agentLoop.processMessage(prPrompt);
  }

  async _handleMCP(arg) {
    if (!arg || arg === 'list') {
      const servers = this.mcpManager.listServers();
      if (servers.length === 0) {
        console.log(theme.dim('  No MCP servers configured. Add one with /mcp add.'));
      } else {
        console.log(theme.brandBold(`\n  ${icons.subagent} MCP Servers:\n`));
        for (const s of servers) {
          console.log(`  ${theme.success('◉')} ${theme.info(s)}`);
        }
        console.log();
      }
    } else if (arg === 'add') {
      // For now, prompt for details (minimal version)
      console.log(theme.info('\n  Adding new MCP server:'));
      // In a real elite app, we would use inquirer here. 
      // I'll add a simplified implementation.
      console.log(theme.dim('  Currently, please add MCP servers to ~/.axiom/config.json manually.'));
    }
  }

  async _handleWatch(arg) {
    if (!arg) {
      console.log(theme.dim('  Usage: /watch <command> [args...]'));
      return;
    }
    const [cmd, ...args] = arg.split(/\s+/);
    await this.guardian.watch(cmd, args);
  }

  async _handleCommand(input) {
    const [cmd, ...args] = input.slice(1).split(/\s+/);
    const arg = args.join(' ');

    switch (cmd) {
      case 'help':
      case 'h':
        this._showHelp();
        break;

      case 'clear':
        this.context.clear();
        resetTodos();
        resetSessionPermissions();
        this.sessionId = null;
        console.log(theme.success(`  ${icons.success} Conversation cleared.`));
        break;

      case 'compact':
        const compacted = await this.context.compact();
        console.log(compacted
          ? theme.success(`  ${icons.success} Conversation compacted.`)
          : theme.dim('  Nothing to compact.')
        );
        break;

      case 'profile':
        if (!arg) {
          this._showProfiles();
        } else {
          try {
            this.config = switchProfile(this.config, arg);
            this.provider = this._createProvider(this.config);
            this.agentLoop = new AgentLoop(this.provider, this.context, this.config);
            console.log(theme.success(`  ${icons.success} Switched to profile: ${theme.brand(arg)}`));
          } catch (err) {
            console.log(theme.error(`  ${icons.error} ${err.message}`));
          }
        }
        break;

      case 'model':
        if (!arg) {
          const profile = this.config.profiles[this.config.activeProfile];
          console.log(theme.info(`  Current model: ${profile?.model || 'none'}`));
        } else {
          const profile = this.config.profiles[this.config.activeProfile];
          if (profile) {
            profile.model = arg;
            this.provider.model = arg;
            saveConfig(this.config);
            console.log(theme.success(`  ${icons.success} Model changed to: ${theme.brand(arg)}`));
          }
        }
        break;

      case 'resume':
        this._handleResume(arg);
        break;

      case 'session':
      case 'sessions':
        if (arg === 'list' || !arg) {
          this.sessionManager.displayList();
        } else if (arg.startsWith('load ')) {
          this._handleResume(arg.split(' ')[1]);
        } else if (arg === 'save') {
          const id = this.sessionManager.save(this.context, {
            id: this.sessionId,
            profile: this.config.activeProfile,
            model: this.config.profiles[this.config.activeProfile]?.model,
          });
          this.sessionId = id;
          console.log(theme.success(`  ${icons.success} Session saved: ${id}`));
        }
        break;

      case 'pr':
        await this._handlePR();
        break;

      case 'mcp':
        await this._handleMCP(arg);
        break;

      case 'watch':
        await this._handleWatch(arg);
        break;

      case 'add':
        this.config = await quickAddProfile(this.config);
        break;

      case 'yolo':
        const isYolo = !this.config.permissions.yoloMode;
        setYoloMode(this.config, isYolo);
        console.log(isYolo
          ? theme.warning(`  ${icons.warning} YOLO mode ON — all permissions auto-approved`)
          : theme.success(`  ${icons.success} YOLO mode OFF — permissions will be asked`)
        );
        break;

      case 'usage':
        this._showUsage();
        break;

      case 'exit':
      case 'quit':
      case 'q':
        this._onExit();
        break;

      default:
        console.log(theme.dim(`  Unknown command: /${cmd}. Type /help for commands.`));
    }
  }

  _showHelp() {
    console.log(`
${theme.brandBold('  Commands:')}

  ${theme.brand('/help')}              Show this help
  ${theme.brand('/clear')}             Clear conversation history
  ${theme.brand('/compact')}           Summarize & compress history
  ${theme.brand('/profile [name]')}    Switch provider profile
  ${theme.brand('/model [name]')}      Change model
  ${theme.brand('/add')}               Add a new provider profile
  ${theme.brand('/session')}           List saved sessions
  ${theme.brand('/session save')}      Save current session
  ${theme.brand('/session load <id>')} Resume a saved session
  ${theme.brand('/pr')}                Generate AI-powered Pull Request description
  ${theme.brand('/mcp')}               Manage external tool servers
  ${theme.brand('/watch <cmd>')}       Watch command and auto-fix crashes
  ${theme.brand('/yolo')}              Toggle auto-approve all permissions
  ${theme.brand('/usage')}             Show token usage stats
  ${theme.brand('/exit')}              Exit Axiom
`);
  }

  _showProfiles() {
    const profiles = listProfiles(this.config);
    console.log(theme.brandBold(`\n  ${icons.key} Profiles:\n`));
    for (const p of profiles) {
      const active = p.active ? theme.success(' ◉') : '  ';
      console.log(`  ${active} ${theme.info(p.name.padEnd(15))} ${theme.dim(p.model)} ${theme.dim(`(${p.provider})`)}`);
    }
    console.log();
  }

  _showUsage() {
    const u = this.provider.usage;
    console.log(`
${theme.brandBold('  Token Usage:')}

  ${theme.dim('Prompt:')}     ${theme.info(u.promptTokens.toLocaleString())}
  ${theme.dim('Completion:')} ${theme.info(u.completionTokens.toLocaleString())}
  ${theme.dim('Total:')}      ${theme.info((u.promptTokens + u.completionTokens).toLocaleString())}
`);
  }

  _autoSave() {
    try {
      const id = this.sessionManager.save(this.context, {
        id: this.sessionId,
        profile: this.config.activeProfile,
        model: this.config.profiles[this.config.activeProfile]?.model,
      });
      this.sessionId = id;
    } catch {
      // Silent fail on auto-save
    }
  }

  _createProvider(config) {
    const profile = config.profiles[config.activeProfile];
    if (!profile) return this.provider;

    // Dynamic import would be ideal but we keep it simple
    if (profile.provider === 'anthropic-native') {
      // Will be handled by CLI entry
    }
    // Return existing provider — switching is handled at CLI level
    return this.provider;
  }

  async _onExit() {
    clearInterval(this._heartbeat);
    // Auto-save before exit
    if (this.context.messages.length > 0) {
      this._autoSave();
    }
    // Shutdown MCP servers
    if (this.mcpManager) {
        await this.mcpManager.shutdown();
    }
    console.log(theme.dim(`\n  ${icons.axiom} Session saved. Goodbye.\n`));
    process.exit(0);
  }
}
