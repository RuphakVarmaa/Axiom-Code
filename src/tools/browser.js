/**
 * Axiom — Tool: browser
 * High-fidelity browser automation using Playwright
 */

import { chromium } from 'playwright';
import { theme, icons } from '../ui/theme.js';

let browser = null;
let context = null;
let page = null;

/**
 * Ensure the browser is running and a page is open
 */
async function ensurePage() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
  }
  if (!page) {
    page = await context.newPage();
  }
  return page;
}

export const browserOpenTool = {
  name: 'browser_open',
  description: 'Open a URL in the browser and wait for it to load',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to navigate to' },
      waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'], default: 'load' },
    },
    required: ['url'],
  },
  requiresPermission: true,
  async execute(params) {
    const p = await ensurePage();
    await p.goto(params.url, { waitUntil: params.waitUntil || 'load', timeout: 30000 });
    return {
      url: p.url(),
      title: await p.title(),
      status: 'Loaded',
    };
  },
};

export const browserInspectTool = {
  name: 'browser_inspect',
  description: 'Inspect the current page State: URL, title, and a simplified representation of the interactive elements',
  parameters: { type: 'object', properties: {} },
  async execute() {
    if (!page) return { error: 'No page open. Use browser_open first.' };

    const title = await page.title();
    const url = page.url();

    // Simplified DOM extraction script
    const elements = await page.evaluate(() => {
      const selectors = 'button, a, input, [role="button"], [onclick]';
      return Array.from(document.querySelectorAll(selectors))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
        })
        .map((el, i) => ({
          index: i,
          tag: el.tagName.toLowerCase(),
          text: el.innerText?.trim() || el.getAttribute('aria-label') || el.value || '',
          type: el.type || '',
          role: el.getAttribute('role') || '',
        }))
        .slice(0, 50); // Cap at 50 elements for token efficiency
    });

    const bodyText = await page.evaluate(() => document.body.innerText.split('\n').filter(l => l.trim()).slice(0, 100).join('\n'));

    return {
      url,
      title,
      interactiveElements: elements,
      contentPreview: bodyText.slice(0, 2000),
    };
  },
};

export const browserActTool = {
  name: 'browser_act',
  description: 'Perform an action on the page: click, type, or scroll',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['click', 'type', 'scroll', 'press'], description: 'The action to perform' },
      selector: { type: 'string', description: 'CSS selector or text to target' },
      text: { type: 'string', description: 'Text to type/press' },
    },
    required: ['action'],
  },
  requiresPermission: true,
  async execute(params) {
    if (!page) return { error: 'No page open.' };

    try {
      if (params.action === 'click') {
        await page.click(params.selector, { timeout: 10000 });
      } else if (params.action === 'type') {
        await page.fill(params.selector, params.text, { timeout: 10000 });
      } else if (params.action === 'scroll') {
        await page.evaluate(() => window.scrollBy(0, 500));
      } else if (params.action === 'press') {
        await page.keyboard.press(params.text);
      }
      
      return { success: true, url: page.url() };
    } catch (err) {
      return { error: `Action "${params.action}" failed: ${err.message}` };
    }
  },
};

/**
 * Cleanup function to close the browser
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }
}
