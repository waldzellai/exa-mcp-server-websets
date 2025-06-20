#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log debug info
const logFile = join(__dirname, 'mcp-debug.log');
const log = (msg) => {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
};

log('=== MCP Debug Wrapper Started ===');
log(`Process argv: ${JSON.stringify(process.argv)}`);
log(`Environment: ${JSON.stringify({
  NODE_ENV: process.env.NODE_ENV,
  EXA_API_KEY: process.env.EXA_API_KEY ? '[SET]' : '[NOT SET]',
  PATH: process.env.PATH?.split(':').slice(0, 3).join(':') + '...',
  PWD: process.env.PWD
})}`);
log(`CWD: ${process.cwd()}`);
log(`__dirname: ${__dirname}`);

// Spawn the actual server
const serverPath = join(__dirname, 'build', 'index.js');
log(`Spawning server at: ${serverPath}`);

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('error', (err) => {
  log(`Child process error: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  log(`Child process exited with code ${code}, signal ${signal}`);
  process.exit(code || 0);
});

// Forward signals
process.on('SIGTERM', () => {
  log('Received SIGTERM, forwarding to child');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  log('Received SIGINT, forwarding to child');
  child.kill('SIGINT');
});