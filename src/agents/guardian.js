/**
 * Axiom — Guardian Mode
 * Autonomous error detection and proactive correction
 */

import { spawn } from 'child_process';
import { theme, icons } from '../ui/theme.js';

export class Guardian {
  constructor(agentLoop) {
    this.agent = agentLoop;
    this.isWatching = false;
    this.process = null;
  }

  /**
   * Watch a command for errors
   */
  async watch(command, args = []) {
    console.log(theme.info(`\n  ${icons.search} Guardian is now watching: ${theme.command(command + ' ' + args.join(' '))}\n`));
    this.isWatching = true;

    return new Promise((resolve) => {
      this.process = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });

      let output = '';
      this.process.stdout.on('data', (data) => {
        process.stdout.write(data);
        output += data.toString();
      });

      this.process.stderr.on('data', (data) => {
        process.stderr.write(theme.error(data.toString()));
        output += data.toString();
      });

      this.process.on('close', async (code) => {
        this.isWatching = false;
        if (code !== 0) {
          console.log(theme.warningBold(`\n  ${icons.warning} Guardian detected a crash (Exit Code: ${code})\n`));
          await this.analyze(output);
        }
        resolve(code);
      });
    });
  }

  /**
   * Analyze the failure and propose a fix
   */
  async analyze(errorOutput) {
    console.log(theme.dim(`  ${icons.subagent} Analyzing crash logs and searching for the cause...`));
    
    const prompt = `GUARDIAN ALERT: The following command crashed.
CRASH LOGS:
${errorOutput.slice(-2000)}

Please analyze the logs, find the likely source of the error in the codebase, and propose a specific fix. 
Use your tools to verify the file content if needed.`;

    await this.agent.processMessage(prompt);
  }

  stop() {
    if (this.process) {
        this.process.kill();
        this.process = null;
    }
    this.isWatching = false;
  }
}
