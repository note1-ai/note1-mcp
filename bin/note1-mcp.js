#!/usr/bin/env node
'use strict';

/**
 * note1 MCP connector: a thin stdio bridge to the hosted note1 MCP server
 * (https://api.note1.ai/mcp) for clients that configure MCP servers as
 * commands. Without NOTE1_API_TOKEN it signs in through the browser (OAuth);
 * with a note1 Personal Access Token in NOTE1_API_TOKEN it sends that instead.
 *
 * Clients with native remote-MCP support (claude.ai, Cursor with headers)
 * can skip this package and connect to the URL directly.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const {
  browserSignInMessage, buildArgs, buildEnv, resolveConfig,
} = require('../lib/bridge.js');

const getBinEntry = pkg => {
  if (typeof pkg.bin === 'string') {
    return pkg.bin;
  }

  return pkg.bin['mcp-remote'];
};

const config = resolveConfig(process.env);
if ('error' in config) {
  console.error(config.error);
  process.exit(1);
}

const useToken = 'token' in config;
if (!useToken) {
  console.error(browserSignInMessage());
}

const mcpRemotePkg = require('mcp-remote/package.json');
const binEntry = getBinEntry(mcpRemotePkg);
const mcpRemoteBin = path.join(path.dirname(require.resolve('mcp-remote/package.json')), binEntry);

const child = spawn(
  process.execPath,
  buildArgs({
    mcpRemoteBin, url: config.url, useToken, extraArgs: process.argv.slice(2),
  }),
  { stdio: 'inherit', env: buildEnv(process.env, config.token) },
);

child.on('exit', code => process.exit(code ?? 1));
child.on('error', error => {
  console.error(`note1-mcp: failed to start connector: ${error.message}`);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
