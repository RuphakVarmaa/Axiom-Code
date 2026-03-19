import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Axiom Database Manager - Local Persistent Persistence
 * (Billion-Dollar Multi-Tenant Architecture by Ruphak Varmaa)
 */

class DbManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.axiom');
        this.dbPath = path.join(this.configDir, 'axiom.db');

        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath);
        this.init();
    }

    init() {
        const schema = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT,
            expires_at DATETIME,
            last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            session_id TEXT,
            query TEXT,
            response TEXT,
            model TEXT,
            tokens_used INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            payload TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `;

        this.db.exec(schema, (err) => {
            if (err) console.error('[DB] Initialization error:', err);
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async logChat(userId, sessionId, query, response, model, tokensUsed) {
        return this.run(
            'INSERT INTO chats (user_id, session_id, query, response, model, tokens_used) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, sessionId, query, response, model, tokensUsed]
        );
    }
}

export default new DbManager();
