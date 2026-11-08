const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validatePlugin } = require('../openai-plugin/scripts/validate.js');

const root = path.join(__dirname, '..');
const pluginDir = path.join(root, 'openai-plugin');
const readJson = (dir, file) => JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
const writeJson = (dir, file, value) => writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2));
const errorsOnly = list => list.filter(entry => !entry.startsWith('warn:'));

const copyPluginTo = tmp => {
  const dir = path.join(tmp, 'plugin');
  cpSync(pluginDir, dir, {
    recursive: true,
    filter: source => !source.includes(`${path.sep}dist`),
  });
  return dir;
};

const withTmp = run => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'note1-plugin-'));
  try {
    return run(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

// A PNG signature plus an IHDR chunk is all the validator reads.
const minimalPng = (width, height) => {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 6;
  return header;
};

test('shipped plugin.json is valid', () => {
  assert.deepEqual(errorsOnly(validatePlugin(pluginDir)), []);
});

test('plugin version matches the npm package version', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(readJson(pluginDir, 'plugin.json').version, pkg.version);
});

test('limits are enforced', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    p.extensions['com.openai'].interface.displayName = 'x'.repeat(31);
    p.extensions['com.openai'].interface.shortDescription = 'x'.repeat(31);
    p.extensions['com.openai'].interface.longDescription = 'x'.repeat(4001);
    p.description = 'x'.repeat(1025);
    p.extensions['com.openai'].interface.defaultPrompt.push('one too many');
    p.extensions['com.openai'].review.test_cases.positive.pop();
    writeJson(dir, 'plugin.json', p);
    const errors = validatePlugin(dir);
    for (const key of ['displayName', 'shortDescription', 'longDescription', 'description', 'defaultPrompt', 'positive']) {
      assert.ok(errors.some(e => e.includes(key)), key);
    }
  });
});

test('capabilities and default prompts have per-item and count limits', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    const ui = p.extensions['com.openai'].interface;
    ui.capabilities = Array.from({ length: 21 }, () => 'x'.repeat(121));
    ui.defaultPrompt[0] = 'x'.repeat(129);
    writeJson(dir, 'plugin.json', p);
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('capabilities') && e.includes('20')));
    assert.ok(errors.some(e => e.includes('capabilities[0]') && e.includes('120')));
    assert.ok(errors.some(e => e.includes('defaultPrompt[0]') && e.includes('128')));
  });
});

test('non-https URLs and a non-square or small logo fail', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    p.extensions['com.openai'].interface.websiteURL = 'http://note1.ai';
    writeJson(dir, 'plugin.json', p);
    writeFileSync(path.join(dir, 'assets/logo.png'), minimalPng(40, 48));
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('websiteURL')));
    assert.ok(errors.some(e => e.includes('logo.png') && e.includes('square')));
    assert.ok(errors.some(e => e.includes('logo.png') && e.includes('256')));
  });
});

test('a missing asset file fails', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    rmSync(path.join(dir, 'assets/composer-icon-dark.png'));
    assert.ok(validatePlugin(dir).some(e => e.includes('composer-icon-dark.png')));
  });
});

test('commerce, countries and the review cases are present', () => {
  const p = readJson(pluginDir, 'plugin.json');
  const ext = p.extensions['com.openai'];
  assert.equal(ext.review.commerce.enabled, false);
  assert.deepEqual(ext.publication.countries, []);
  assert.equal(ext.review.test_cases.positive.length, 5);
  assert.equal(ext.review.test_cases.negative.length, 3);
  const tools = ext.review.test_cases.positive.flatMap(c => c.expected_tools);
  for (const tool of [
    'note1_search_meetings', 'note1_list_action_items', 'note1_update_action_item',
    'note1_get_meeting_insights', 'note1_get_calendar', 'note1_create_topic_tracker',
  ]) {
    assert.ok(tools.includes(tool), tool);
  }
});

test('mcp.json declares one streamable-http server with dcr auth', () => {
  const mcp = readJson(pluginDir, 'mcp.json');
  const servers = Object.values(mcp.mcpServers ?? mcp.servers);
  assert.equal(servers.length, 1);
  assert.equal(servers[0].type, 'streamable-http');
  assert.equal(servers[0].url, 'https://api.note1.ai/mcp');
  assert.deepEqual(servers[0].extensions['com.openai'].auth, { type: 'oauth', client: { mode: 'dcr' } });
});

test('a bad mcp.json fails validation', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const mcp = readJson(dir, 'mcp.json');
    mcp.mcpServers.note1.url = 'http://api.note1.ai/mcp';
    writeJson(dir, 'mcp.json', mcp);
    assert.ok(validatePlugin(dir).some(e => e.includes('mcp.json')));
  });
});

test('the skill has frontmatter matching its folder', () => {
  const content = readFileSync(path.join(pluginDir, 'skills/note1/SKILL.md'), 'utf8');
  const match = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(content);
  assert.ok(match, 'frontmatter');
  assert.equal(match[1], 'note1');
  assert.ok(match[2].length <= 1024);
});

test('placeholder demo video is only a warning', () => {
  assert.ok(validatePlugin(pluginDir).some(e => e.startsWith('warn:') && e.includes('demo_recording_url')));
});
