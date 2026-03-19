/**
 * Axiom — Session Manager
 * Save, load, and resume conversation sessions
 */

import fs from 'fs';
import path from 'path';
import { SESSIONS_DIR, ensureAxiomDir } from '../config/config.js';
import { ContextManager } from '../core/context.js';
import { theme, icons } from '../ui/theme.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class SessionManager {
  constructor() {
    ensureAxiomDir();
  }

  /**
   * Save a session
   */
  save(context, metadata = {}) {
    const id = metadata.id || generateId();
    const session = {
      id,
      ...context.toJSON(),
      profile: metadata.profile || null,
      model: metadata.model || null,
      title: metadata.title || this._generateTitle(context),
      savedAt: new Date().toISOString(),
    };

    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
    return id;
  }

  /**
   * Load a session by ID
   */
  load(id) {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * List all saved sessions
   */
  list() {
    if (!fs.existsSync(SESSIONS_DIR)) return [];

    return fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8');
          const session = JSON.parse(raw);
          return {
            id: session.id,
            title: session.title,
            profile: session.profile,
            model: session.model,
            savedAt: session.savedAt,
            messageCount: session.messages?.length || 0,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  /**
   * Delete a session
   */
  delete(id) {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Generate a title from the first user message
   */
  _generateTitle(context) {
    const firstUser = context.messages.find(m => m.role === 'user');
    if (firstUser) {
      return firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '...' : '');
    }
    return 'Untitled session';
  }

  /**
   * Display session list
   */
  displayList() {
    const sessions = this.list();

    if (sessions.length === 0) {
      console.log(theme.dim('  No saved sessions.'));
      return;
    }

    console.log(theme.brandBold(`\n  ${icons.task} Saved Sessions\n`));

    for (const s of sessions.slice(0, 20)) {
      const date = new Date(s.savedAt).toLocaleDateString();
      const time = new Date(s.savedAt).toLocaleTimeString();
      const magic = `${s.id}-axiom-resume`;

      console.log(
        `  ${theme.info(s.id.padEnd(14))} ${theme.assistantText(s.title)}`
      );
      console.log(
        `  ${theme.dim(''.padEnd(14))} ${theme.dim(`${date} ${time} • ${s.messageCount} msgs • ${s.profile || '?'}/${s.model || '?'}`)}`
      );
      console.log(
        `  ${theme.dim(''.padEnd(14))} ${theme.brand(icons.key + ' ' + magic)}`
      );
      console.log();
    }
  }
}
