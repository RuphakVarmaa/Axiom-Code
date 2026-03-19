import db from './db.js';
import auth from './auth.js';
import chalk from 'chalk';

/**
 * Axiom History Manager - Local Interaction Logging
 * (Privacy-First Data Management by Ruphak Varmaa)
 */

class HistoryManager {
    /**
     * Log a chat interaction to the local database
     */
    async log(query, response, model = 'unknown', tokensUsed = 0) {
        const user = auth.getUser();
        const userId = user ? user.email : 'guest';
        const sessionId = 'cli-session'; // Simplified for now

        try {
            await db.logChat(userId, sessionId, query, response, model, tokensUsed);
        } catch (e) {
            console.error('[HISTORY] Failed to log interaction:', e);
        }
    }

    /**
     * Retrieve and display the last N interactions
     */
    async displayHistory(limit = 5) {
        console.log(chalk.bold.cyan(`\n--- Local Chat History (Last ${limit}) ---`));
        
        try {
            const rows = await db.all('SELECT query, response, timestamp FROM chats ORDER BY timestamp DESC LIMIT ?', [limit]);
            
            if (rows.length === 0) {
                console.log(chalk.dim('  No local history found.'));
                return;
            }

            rows.reverse().forEach((row, i) => {
                console.log(chalk.dim(`\n[${new Date(row.timestamp).toLocaleString()}]`));
                console.log(chalk.yellow(`Q: ${row.query}`));
                console.log(chalk.white(`A: ${row.response.substring(0, 200)}${row.response.length > 200 ? '...' : ''}`));
            });
            console.log(chalk.cyan('\n------------------------------------------\n'));
        } catch (e) {
            console.error('[HISTORY] Failed to retrieve history:', e);
        }
    }
}

export default new HistoryManager();
