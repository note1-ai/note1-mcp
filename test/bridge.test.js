const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  SERVER_URL, browserSignInMessage, buildArgs, buildEnv, resolveConfig,
} = require('../lib/bridge.js');

const root = path.join(__dirname, '..');

test('always targets the hosted note1 server', () => {
  assert.equal(SERVER_URL, 'https://api.note1.ai/mcp');
  assert.deepEqual(resolveConfig({ NOTE1_API_TOKEN: 'n1_abc' }), { token: 'n1_abc', url: 'https://api.note1.ai/mcp' });
});

test('has no URL override', () => {
  const config = resolveConfig({ NOTE1_API_TOKEN: 'n1_abc', NOTE1_MCP_URL: 'https://evil.example/mcp' });
  assert.equal(config.url, 'https://api.note1.ai/mcp');
});

test('signs in through the browser when the token is missing', () => {
  assert.deepEqual(resolveConfig({}), { url: 'https://api.note1.ai/mcp' });
});

test('treats an empty token as missing', () => {
  assert.deepEqual(resolveConfig({ NOTE1_API_TOKEN: '' }), { url: 'https://api.note1.ai/mcp' });
});

test('the sign-in notice says how to use a token instead', () => {
  const message = browserSignInMessage();
  assert.match(message, /sign in to note1 in your browser/);
  assert.match(message, /NOTE1_API_TOKEN/);
  assert.match(message, /https:\/\/note1\.ai\/dashboard\/account\/tokens/);
});

test('rejects tokens that are not note1 personal access tokens', () => {
  const { error } = resolveConfig({ NOTE1_API_TOKEN: 'sk_other' });
  assert.match(error, /^note1-mcp: NOTE1_API_TOKEN must be a note1 personal access token \(n1_\.\.\.\)/);
});

test('passes only the URL to mcp-remote without a token', () => {
  const args = buildArgs({
    mcpRemoteBin: '/x/proxy.js', url: SERVER_URL, useToken: false, extraArgs: [],
  });
  assert.deepEqual(args, ['/x/proxy.js', 'https://api.note1.ai/mcp']);
});

test('passes the bearer header as an environment reference, never the token', () => {
  const args = buildArgs({
    mcpRemoteBin: '/x/proxy.js', url: SERVER_URL, useToken: true, extraArgs: [],
  });
  assert.deepEqual(args, ['/x/proxy.js', 'https://api.note1.ai/mcp', '--header', 'Authorization:${NOTE1_AUTH_HEADER}']);
  assert.ok(!args.join(' ').includes('n1_'));
});

test('forwards extra arguments to mcp-remote', () => {
  const withToken = buildArgs({
    mcpRemoteBin: '/x/proxy.js', url: SERVER_URL, useToken: true, extraArgs: ['--debug', '--silent'],
  });
  assert.deepEqual(withToken.slice(-2), ['--debug', '--silent']);
  const withoutToken = buildArgs({
    mcpRemoteBin: '/x/proxy.js', url: SERVER_URL, useToken: false, extraArgs: ['--debug'],
  });
  assert.deepEqual(withoutToken, ['/x/proxy.js', 'https://api.note1.ai/mcp', '--debug']);
});

test('puts the bearer header only in the child environment', () => {
  const env = buildEnv({ PATH: '/bin', NOTE1_API_TOKEN: 'n1_abc' }, 'n1_abc');
  assert.equal(env.NOTE1_AUTH_HEADER, 'Bearer n1_abc');
  assert.equal(env.PATH, '/bin');
});

test('adds no bearer header to the child environment without a token', () => {
  assert.deepEqual(buildEnv({ PATH: '/bin' }, undefined), { PATH: '/bin' });
});

test('the bin spawns mcp-remote with the token only in the environment', () => {
  const source = readFileSync(path.join(root, 'bin/note1-mcp.js'), 'utf8');
  assert.match(source, /env: buildEnv\(process\.env, config\.token\)/);
  assert.doesNotMatch(source, /token: config\.token/);
  assert.doesNotMatch(source, /Bearer \$\{/);
});

const runBin = (env, args = []) => spawnSync(process.execPath, [path.join(root, 'bin/note1-mcp.js'), ...args], {
  env: {
    PATH: process.env.PATH,
    NODE_OPTIONS: `--require ${path.join(__dirname, '..', 'test-support/spawn-stub.js')}`,
    ...env,
  },
  encoding: 'utf8',
  timeout: 15_000,
});

test('the bin starts mcp-remote with the URL only and prints the browser note when the token is missing', () => {
  const result = runBin({}, ['--debug']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /sign in to note1 in your browser/);
  assert.doesNotMatch(result.stderr, /missing NOTE1_API_TOKEN/);
  const spawned = JSON.parse(result.stdout);
  assert.equal(spawned.args[1], 'https://api.note1.ai/mcp');
  assert.deepEqual(spawned.args.slice(2), ['--debug']);
  assert.equal(spawned.authHeader, null);
});

test('the bin keeps the token out of argv and puts the bearer header in the child environment', () => {
  const result = runBin({ NOTE1_API_TOKEN: 'n1_secret123' }, ['--debug']);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /sign in to note1 in your browser/);
  const spawned = JSON.parse(result.stdout);
  assert.ok(!spawned.args.join(' ').includes('secret123'));
  assert.deepEqual(spawned.args.slice(1), ['https://api.note1.ai/mcp', '--header', 'Authorization:${NOTE1_AUTH_HEADER}', '--debug']);
  assert.equal(spawned.authHeader, 'Bearer n1_secret123');
});

test('the bin exits 1 for tokens that are not note1 tokens', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'bin/note1-mcp.js')], {
    env: {
      PATH: process.env.PATH,
      NOTE1_API_TOKEN: 'sk_other',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be a note1 personal access token/);
  assert.doesNotMatch(result.stderr, /sk_other/);
});
