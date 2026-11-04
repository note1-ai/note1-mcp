const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
  accessSync, constants, existsSync, readFileSync, readdirSync, statSync,
} = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readJson = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const pkg = readJson('package.json');
const server = readJson('server.json');
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');

const skillNames = readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

const readFrontmatter = file => {
  const content = readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
  assert.ok(match, `${file} starts with frontmatter`);
  const fields = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(': ');
    fields[line.slice(0, separator)] = line.slice(separator + 2);
  }

  return { fields, body: match[2] };
};

test('package.json is publishable', () => {
  assert.equal(pkg.name, '@note1ai/mcp');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.mcpName, 'ai.note1/mcp');
  assert.equal(pkg.homepage, 'https://note1.ai/docs/mcp-server');
  assert.equal(pkg.engines.node, '>=18');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.deepEqual(pkg.dependencies, { 'mcp-remote': '^0.1.0' });
});

test('the bin exists, is executable and has a shebang', () => {
  assert.deepEqual(pkg.bin, { 'note1-mcp': 'bin/note1-mcp.js' });
  const bin = path.join(root, pkg.bin['note1-mcp']);
  assert.ok(existsSync(bin));
  accessSync(bin, constants.X_OK);
  assert.ok(statSync(bin).mode % 0o1000 >= 0o100);
  assert.ok(readFileSync(bin, 'utf8').startsWith('#!/usr/bin/env node\n'));
});

test('files ship the bin and the bridge library only', () => {
  assert.deepEqual(pkg.files, ['bin', 'lib']);
  assert.ok(existsSync(path.join(root, 'lib/bridge.js')));
});

test('package.json, the lockfile and server.json agree on the version', () => {
  const lock = readJson('package-lock.json');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(server.version, pkg.version);
  assert.equal(server.packages[0].version, pkg.version);
  assert.equal(server.packages[0].identifier, pkg.name);
});

test('server.json names the same server as package.json mcpName', () => {
  assert.equal(server.name, pkg.mcpName);
  assert.equal(server.$schema, 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
  assert.equal(server.title, 'note1');
  assert.equal(server.websiteUrl, 'https://note1.ai/docs/mcp-server');
  assert.deepEqual(server.repository, { url: 'https://github.com/note1-ai/note1-mcp', source: 'github' });
  assert.ok(server.description.length > 0 && server.description.length <= 100, `description is ${server.description.length} chars`);
});

test('server.json lists the token as optional and the hosted remote', () => {
  const [pkgEntry] = server.packages;
  assert.equal(pkgEntry.registryType, 'npm');
  assert.deepEqual(pkgEntry.transport, { type: 'stdio' });
  assert.equal(pkgEntry.environmentVariables.length, 1);
  const [token] = pkgEntry.environmentVariables;
  assert.equal(token.name, 'NOTE1_API_TOKEN');
  assert.equal(token.isRequired, false);
  assert.equal(token.isSecret, true);
  assert.match(token.description, /Without it, you sign in through your browser/);
  assert.deepEqual(server.remotes, [{ type: 'streamable-http', url: 'https://api.note1.ai/mcp' }]);
});

test('license names the copyright holder', () => {
  assert.match(readFileSync(path.join(root, 'LICENSE'), 'utf8'), /Copyright \(c\) 2026 note1\.ai/);
});

test('npm pack tarball contains only the intended files', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const [packed] = JSON.parse(result.stdout);
  const files = packed.files.map(file => file.path).sort();
  assert.deepEqual(files, ['LICENSE', 'README.md', 'bin/note1-mcp.js', 'lib/bridge.js', 'package.json']);
});

test('five skills ship in skills/', () => {
  assert.deepEqual(skillNames, [
    'note1-action-items',
    'note1-integrations',
    'note1-meetings',
    'note1-notes-and-trackers',
    'note1-recordings',
  ]);
});

test('every skill has Agent Skills frontmatter matching its folder', () => {
  for (const name of skillNames) {
    const { fields, body } = readFrontmatter(path.join(root, 'skills', name, 'SKILL.md'));
    assert.deepEqual(Object.keys(fields).sort(), ['description', 'name'], name);
    assert.equal(fields.name, name);
    assert.match(fields.name, /^[a-z\d]+(?:-[a-z\d]+)*$/);
    assert.ok(fields.description.length > 0 && fields.description.length <= 1024, `${name} description length`);
    assert.ok(!fields.description.includes(': ') && !fields.description.includes(' #'), `${name} description is a plain YAML scalar`);
    assert.match(body, /## Example requests/, name);
  }
});

test('every skill only names tools that exist in the README tools table', () => {
  const documented = new Set([...readme.matchAll(/^\| `(note1_[a-z_]+)` \|/gm)].map(match => match[1]));
  assert.ok(documented.size > 0);
  for (const name of skillNames) {
    const { body } = readFrontmatter(path.join(root, 'skills', name, 'SKILL.md'));
    for (const [, tool] of body.matchAll(/`(note1_[a-z_]+)`/g)) {
      assert.ok(documented.has(tool), `${name} mentions ${tool}`);
    }
  }
});

test('the README skills table lists every skill and how to install them', () => {
  assert.match(readme, /## Agent Skills/);
  assert.ok(readme.includes('npx skills add note1-ai/note1-mcp'));
  assert.ok(readme.includes('~/.claude/skills/'));
  assert.ok(readme.includes('https://note1.ai/.well-known/agent-skills/index.json'));
  for (const name of skillNames) {
    assert.match(readme, new RegExp(`^\\| \\[\`${name}\`\\]\\(skills/${name}/SKILL\\.md\\) \\|`, 'm'), name);
  }
});

test('the README documents setup, configuration, support and pricing', () => {
  assert.match(readme, /## Connect without this package/);
  assert.match(readme, /## Setup with this package/);
  assert.match(readme, /## Configuration/);
  assert.match(readme, /\| `NOTE1_API_TOKEN` \| no \|/);
  assert.ok(readme.includes('claude mcp add --transport http note1 https://api.note1.ai/mcp'));
  assert.ok(readme.includes('claude mcp add note1 -- npx -y @note1ai/mcp'));
  assert.ok(readme.includes('~/.mcp-auth'));
  assert.ok(readme.includes('https://note1.ai/dashboard/account/tokens'));
  assert.ok(readme.includes('https://note1.ai/#pricing'));
  assert.ok(readme.includes('support@note1.ai'));
  assert.ok(readme.includes('MIT. Copyright (c) 2026 note1.ai (one1.dev)'));
  assert.ok(!readme.includes('Authorization: Bearer n1_'));
  assert.ok(!/glama|lobehub/i.test(readme));
});

test('the README lists the account tool', () => {
  assert.match(readme, /^\| `note1_get_account` \|/m);
});
