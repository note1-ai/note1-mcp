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
const errorsOnly = list => list.filter(entry => !entry.startsWith('warn:') && !entry.startsWith('info:'));

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
    assert.ok(errors.some(e => e.includes('logo.png') && e.includes('at least 48x48')));
  });
});

test('a square logo of 48px passes and one below 48px fails', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    writeFileSync(path.join(dir, 'assets/logo.png'), minimalPng(48, 48));
    assert.deepEqual(errorsOnly(validatePlugin(dir)), []);
    writeFileSync(path.join(dir, 'assets/logo.png'), minimalPng(40, 40));
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('logo.png') && e.includes('at least 48x48')));
    assert.ok(!errors.some(e => e.includes('logo.png') && e.includes('square')));
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
  assert.equal(ext.review.commerce, false);
  assert.equal(ext.review.commerce_description, 'No purchases. Plan limits are described only informationally.');
  assert.deepEqual(ext.publication.countries, []);
  assert.equal(ext.review.test_cases.positive.length, 5);
  assert.equal(ext.review.test_cases.negative.length, 3);
  assert.equal(ext.review.demo_recording_url, undefined);
  const tools = ext.review.test_cases.positive.flatMap(c => c.tools_triggered.split(', '));
  for (const tool of [
    'note1_search_meetings', 'note1_list_action_items', 'note1_update_action_item',
    'note1_get_meeting_insights', 'note1_list_topic_trackers', 'note1_create_topic_tracker',
  ]) {
    assert.ok(tools.includes(tool), tool);
  }
});

test('review cases use the documented field names', () => {
  const { positive, negative } = readJson(pluginDir, 'plugin.json').extensions['com.openai'].review.test_cases;
  for (const entry of positive) {
    assert.deepEqual(Object.keys(entry).sort(), ['description', 'expected_behavior', 'prompt', 'tools_triggered']);
  }

  for (const entry of negative) {
    assert.deepEqual(Object.keys(entry).sort(), ['description', 'prompt']);
  }
});

test('review case counts must be exactly 5 positive and 3 negative', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    const cases = p.extensions['com.openai'].review.test_cases;
    cases.positive.push({ ...cases.positive[0] });
    cases.negative.push({ ...cases.negative[0] });
    writeJson(dir, 'plugin.json', p);
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('positive') && e.includes('exactly 5')));
    assert.ok(errors.some(e => e.includes('negative') && e.includes('exactly 3')));
  });
});

test('review cases need description, and positives need tools_triggered and expected_behavior', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    const cases = p.extensions['com.openai'].review.test_cases;
    delete cases.positive[0].description;
    cases.positive[1].tools_triggered = [];
    delete cases.positive[2].expected_behavior;
    delete cases.negative[0].description;
    writeJson(dir, 'plugin.json', p);
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('positive[0].description')));
    assert.ok(errors.some(e => e.includes('positive[1].tools_triggered')));
    assert.ok(errors.some(e => e.includes('positive[2].expected_behavior')));
    assert.ok(errors.some(e => e.includes('negative[0].description')));
  });
});

test('commerce must be a boolean with a non-empty commerce_description', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    const { review } = p.extensions['com.openai'];
    review.commerce = { enabled: false };
    review.commerce_description = '  ';
    writeJson(dir, 'plugin.json', p);
    const errors = validatePlugin(dir);
    assert.ok(errors.some(e => e.includes('commerce must be a boolean')));
    assert.ok(errors.some(e => e.includes('commerce_description')));
  });
});

test('displayName must be exactly note1.ai', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const p = readJson(dir, 'plugin.json');
    p.extensions['com.openai'].interface.displayName = 'note1 MCP';
    writeJson(dir, 'plugin.json', p);
    assert.ok(validatePlugin(dir).some(e => e.includes('displayName') && e.includes('note1')));
  });
});

test('mcp.json declares one streamable-http server with cimd auth (dcr fallback)', () => {
  const mcp = readJson(pluginDir, 'mcp.json');
  const servers = Object.values(mcp.mcpServers ?? mcp.servers);
  assert.equal(servers.length, 1);
  assert.equal(servers[0].type, 'streamable-http');
  assert.equal(servers[0].url, 'https://api.note1.ai/mcp');
  assert.deepEqual(servers[0].extensions['com.openai'].auth, {
    type: 'oauth',
    client: { mode: 'cimd' },
    authorizationUrl: 'https://api.note1.ai/oauth/authorize',
    tokenUrl: 'https://api.note1.ai/oauth/token',
    registrationUrl: 'https://api.note1.ai/oauth/register',
    resource: 'https://api.note1.ai/mcp',
    defaultScopes: ['meetings:read', 'calendar:read', 'meetings:write', 'integrations:write'],
  });
});

test('mcp.json without explicit OAuth endpoints fails validation', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const mcp = readJson(dir, 'mcp.json');
    delete mcp.mcpServers.note1.extensions['com.openai'].auth.tokenUrl;
    writeJson(dir, 'mcp.json', mcp);
    assert.ok(validatePlugin(dir).some(e => e.includes('tokenUrl')));
  });
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

test('absent demo video is only an info line', () => {
  assert.ok(validatePlugin(pluginDir).some(e => e.startsWith('info:') && e.includes('demo_recording_url')));
});

test('placeholder demo video is an error', () => {
  withTmp(tmp => {
    const dir = copyPluginTo(tmp);
    const manifest = readJson(dir, 'plugin.json');
    manifest.extensions['com.openai'].review.demo_recording_url = 'https://example.com/REPLACE-WITH-DEMO-VIDEO';
    writeJson(dir, 'plugin.json', manifest);
    assert.ok(errorsOnly(validatePlugin(dir)).some(e => e.includes('demo_recording_url')));
  });
});
