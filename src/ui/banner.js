import { execSync } from 'child_process';
import { theme, icons } from './theme.js';

function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim();
    const status = execSync('git status --short', { stdio: 'pipe' }).toString().trim();
    const statusIcon = status ? theme.warning('●') : theme.success('○');
    return `${theme.dim('Git:')}      ${theme.info(branch)} ${statusIcon}`;
  } catch {
    return null;
  }
}

export function printBanner(config) {
  const version = 'v1.0.0';
  const profile = config?.activeProfile || 'none';
  const model = config?.profiles?.[profile]?.model || 'not configured';
  const provider = config?.profiles?.[profile]?.provider || 'universal';
  const git = getGitInfo();

  const title = theme.brandBold(` ${icons.axiom} AXIOM `) + theme.dim(` ${version} `);
  const subtitle = theme.dim('Universal Agentic Coding Assistant');
  
  const details = 
    `${theme.dim('Profile:')}  ${theme.info(profile).padEnd(21)} ${theme.dim('Model:')} ${theme.info(model)}\n` +
    `${theme.dim('Provider:')} ${theme.info(provider).padEnd(21)} ${theme.dim('Cmds:')}  ${theme.brand('/help')}` +
    (git ? `\n${git}` : '');

  const bannerContent = `${title}\n${subtitle}\n\n${details}`;

  console.log(theme.panel(bannerContent));
}

export function printWelcome() {
  const msg = theme.brandBold(` ${icons.axiom} Welcome to AXIOM `) + `\n\n` + theme.dim(`Let's set up your first LLM provider.`);
  console.log(theme.panel(msg));
}
