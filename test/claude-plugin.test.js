const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, lstatSync, readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pluginDir = path.join(root, 'claude-plugin');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const pkg = readJson(path.join(root, 'package.json'));

test('plugin manifest matches the package', () => {
  const manifest = readJson(path.join(pluginDir, '.claude-plugin', 'plugin.json'));
  assert.equal(manifest.name, 'note1');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.license, 'MIT');
  assert.ok(manifest.description);
  assert.ok(manifest.author?.name);
});

test('plugin points at the hosted server only', () => {
  const mcp = readJson(path.join(pluginDir, '.mcp.json'));
  assert.deepEqual(mcp, { mcpServers: { note1: { type: 'http', url: 'https://api.note1.ai/mcp' } } });
});

test('plugin skills are regular-file copies of skills/', () => {
  const source = readdirSync(path.join(root, 'skills')).sort();
  const copied = readdirSync(path.join(pluginDir, 'skills')).sort();
  assert.deepEqual(copied, source);
  for (const name of source) {
    const file = path.join(pluginDir, 'skills', name, 'SKILL.md');
    assert.ok(lstatSync(file).isFile(), `${name} must be a regular file`);
    assert.equal(
      readFileSync(file, 'utf8'),
      readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8'),
      `${name} is out of date; run npm run claude-plugin:sync`,
    );
  }
});

test('plugin folder has a README of at least 40 words and a license', () => {
  const readme = readFileSync(path.join(pluginDir, 'README.md'), 'utf8').replaceAll(/```[\s\S]*?```/g, '');
  assert.ok(readme.split(/\s+/).filter(Boolean).length >= 40);
  assert.ok(existsSync(path.join(pluginDir, 'LICENSE')));
});

test('plugin folder has no lockfile or package manifest', () => {
  for (const file of ['package.json', 'package-lock.json', '.npmrc']) {
    assert.ok(!existsSync(path.join(pluginDir, file)), `${file} would hold the plugin for review`);
  }
});

test('marketplace lists the plugin folder', () => {
  const marketplace = readJson(path.join(root, '.claude-plugin', 'marketplace.json'));
  const entry = marketplace.plugins.find(plugin => plugin.name === 'note1');
  assert.equal(entry.source, './claude-plugin');
  assert.equal(entry.version, pkg.version);
});
