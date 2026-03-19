/**
 * Axiom — MCP Client
 * Implements JSON-RPC over STDIO for Model Context Protocol servers
 */

import { spawn } from 'child_process';
import { theme, icons } from '../ui/theme.js';

export class MCPClient {
  constructor(name, command, args = [], env = {}) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.env = { ...process.env, ...env };
    
    this.process = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.capabilities = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.command, this.args, {
          env: this.env,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let dataBuffer = '';
        this.process.stdout.on('data', (data) => {
          dataBuffer += data.toString();
          this._handleResponse(dataBuffer);
          dataBuffer = '';
        });

        this.process.stderr.on('data', (data) => {
          // Log errors but don't crash
          console.error(theme.dim(`[MCP:${this.name}] ${data.toString()}`));
        });

        this.process.on('close', (code) => {
          console.log(theme.dim(`[MCP:${this.name}] Process exited with code ${code}`));
        });

        // Initialize MCP connection
        this._sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'Axiom', version: '1.0.0' },
        }).then(res => {
            this.capabilities = res.capabilities;
            resolve(true);
        }).catch(reject);

      } catch (err) {
        reject(err);
      }
    });
  }

  async listTools() {
    const res = await this._sendRequest('tools/list', {});
    return res.tools || [];
  }

  async callTool(name, arguments_ = {}) {
    const res = await this._sendRequest('tools/call', { name, arguments: arguments_ });
    return res;
  }

  _sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = { jsonrpc: '2.0', id, method, params };
      
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  _handleResponse(data) {
    try {
      const lines = data.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const response = JSON.parse(line);
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id);
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || 'Unknown RPC error'));
          } else {
            resolve(response.result);
          }
        }
      }
    } catch (err) {
      // Ignore partial lines
    }
  }

  async close() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
