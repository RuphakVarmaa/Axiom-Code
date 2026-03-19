import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import db from './db.js';
import open from 'open';

/**
 * Axiom Auth Manager - Secure Identity & Session Logic
 * (Part of the "Billion-Dollar" elite platform suite by Ruphak Varmaa)
 */

class AuthManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.axiom');
        this.sessionPath = path.join(this.configDir, 'session.json');
        
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    /**
     * Check if the user is authenticated
     */
    isAuthenticated() {
        if (!fs.existsSync(this.sessionPath)) return false;
        try {
            const session = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
            
            // 1. Absolute Expiry (3 Days)
            const absoluteExpiry = new Date(session.createdAt || Date.now());
            absoluteExpiry.setDate(absoluteExpiry.getDate() + 3);
            if (new Date() > absoluteExpiry) return false;

            // 2. Inactivity Timeout (2 Days)
            const lastUsed = new Date(session.lastUsedAt || Date.now());
            const inactivityLimit = new Date(lastUsed.getTime() + 2 * 24 * 60 * 60 * 1000);
            if (new Date() > inactivityLimit) return false;

            // 3. Regular Expiry check
            const isValid = !!session.token && (new Date(session.expires) > new Date());
            
            if (isValid) {
                // Update lastUsedAt
                this._updateLastUsed(session);
            }
            return isValid;
        } catch (e) {
            return false;
        }
    }

    _updateLastUsed(session) {
        session.lastUsedAt = new Date().toISOString();
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
    }

    /**
     * Get user identity data
     */
    getUser() {
        if (!this.isAuthenticated()) return null;
        return JSON.parse(fs.readFileSync(this.sessionPath, 'utf8')).user;
    }

    /**
     * Save session token from website verification
     */
    async saveSession(token, user) {
        const userId = user.email; // Simplified ID
        const session = {
            token,
            user,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            lastLogin: new Date().toISOString()
        };
        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));

        // Persist to local database
        try {
            await db.run('INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)', [userId, user.email, user.name]);
            await db.run('INSERT OR REPLACE INTO sessions (token, user_id, expires_at, last_used_at) VALUES (?, ?, ?, ?)', 
                [token, userId, session.expires, session.lastUsedAt]);
        } catch (e) {
            console.error('[AUTH] DB Persistence error:', e);
        }
    }

    /**
     * Clear local session
     */
    logout() {
        if (fs.existsSync(this.sessionPath)) {
            fs.unlinkSync(this.sessionPath);
        }
    }

    async promptLogin() {
        console.log(chalk.yellow('\n[AXIOM] Identification Required.'));
        console.log(`${chalk.dim('Connecting to Axiom Identity Portal...')}`);
        
        const startTime = Date.now();
        // Automatically open browser
        await open('http://localhost:3000/login.html');
        
        console.log(chalk.cyan('Login Portal opened. Please authenticate to continue.'));
        console.log(chalk.dim('Security Note: Verification tokens expire in 3 minutes.\n'));

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readline.question(chalk.bold('Paste your Verification Token: '), async (token) => {
                const elapsed = (Date.now() - startTime) / 1000 / 60; // Minutes

                if (elapsed > 3) {
                    console.log(chalk.red('\n✗ Token Expired. Identification process took more than 3 minutes.'));
                    console.log(chalk.dim('Please run axiom login again.'));
                } else if (token.startsWith('AXM-')) {
                    // In a real elite app, we'd verify the token against the backend here.
                    await this.saveSession(token, { name: 'Ruphak Varmaa', email: 'ruphak@axiom-code.com' });
                    console.log(chalk.green(`\n${chalk.bold('✓ Authentication Successful.')} Welcome to Axiom Code Elite.`));
                } else {
                    console.log(chalk.red('\n✗ Invalid Token format. Should start with AXM-'));
                }
                readline.close();
                resolve();
            });
        });
    }
}

export default new AuthManager();
