'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Key paths of the plugin manifest in one place: if the portal renames a key, edit it here.
const SCHEMA_KEYS = {
  vendor: 'com.openai',
  interface: 'interface',
  review: 'review',
  publication: 'publication',
  testCases: 'test_cases',
  positive: 'positive',
  negative: 'negative',
  commerce: 'commerce',
  commerceDescription: 'commerce_description',
  demoUrl: 'demo_recording_url',
  releaseNotes: 'release_notes',
  countries: 'countries',
  mcpServers: 'mcpServers',
  auth: 'auth',
  caseDescription: 'description',
  casePrompt: 'prompt',
  caseTools: 'tools_triggered',
  caseBehavior: 'expected_behavior',
};

const LIMITS = {
  description: 1024,
  displayName: 30,
  shortDescription: 30,
  longDescription: 4000,
  capabilities: 20,
  capability: 120,
  defaultPrompts: 3,
  defaultPrompt: 128,
  positiveCases: 5,
  negativeCases: 3,
  minLogoSize: 48,
  pluginDisplayName: 'note1',
};

const MCP_SCHEMA_URL = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const URL_FIELDS = ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL'];
const ASSET_FIELDS = ['logo', 'logoDark', 'composerIcon', 'composerIconDark'];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const isHttps = value => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const readJsonFile = (dir, file, errors) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (error) {
    errors.push(`${file}: cannot read or parse (${error.message})`);
    return undefined;
  }
};

const checkString = (errors, label, value, max) => {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} is required`);
    return;
  }

  if (value.length > max) {
    errors.push(`${label} is ${value.length} characters; the limit is ${max}`);
  }
};

const readPngSize = file => {
  const data = fs.readFileSync(file);
  if (data.length < 24 || !data.subarray(0, 8).equals(PNG_SIGNATURE) || data.toString('ascii', 12, 16) !== 'IHDR') {
    return undefined;
  }

  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};

const checkAsset = (dir, errors, field, relative) => {
  if (typeof relative !== 'string' || relative === '') {
    errors.push(`${field} is required`);
    return;
  }

  const file = path.join(dir, relative);
  if (!fs.existsSync(file)) {
    errors.push(`${field}: ${relative} does not exist`);
    return;
  }

  const size = readPngSize(file);
  const name = path.basename(relative);
  if (!size) {
    errors.push(`${field}: ${name} is not a PNG`);
    return;
  }

  if (size.width !== size.height) {
    errors.push(`${field}: ${name} must be square, it is ${size.width}x${size.height}`);
  }

  if (Math.min(size.width, size.height) < LIMITS.minLogoSize) {
    errors.push(`${field}: ${name} must be at least ${LIMITS.minLogoSize}x${LIMITS.minLogoSize}, it is ${size.width}x${size.height}`);
  }
};

const checkCases = (errors, label, cases, expected, positive) => {
  if (!Array.isArray(cases) || cases.length !== expected) {
    errors.push(`${label} test cases: exactly ${expected} required, found ${Array.isArray(cases) ? cases.length : 0}`);
    return;
  }

  const required = [SCHEMA_KEYS.caseDescription, SCHEMA_KEYS.casePrompt];
  if (positive) {
    required.push(SCHEMA_KEYS.caseBehavior);
  }

  for (const [index, entry] of cases.entries()) {
    for (const key of required) {
      if (typeof entry?.[key] !== 'string' || entry[key].trim() === '') {
        errors.push(`${label}[${index}].${key} is required`);
      }
    }

    if (positive && (typeof entry?.[SCHEMA_KEYS.caseTools] !== 'string' || entry[SCHEMA_KEYS.caseTools].trim() === '')) {
      errors.push(`${label}[${index}].${SCHEMA_KEYS.caseTools} must be a non-empty string such as "search_notes, read_note"`);
    }

    for (const key of ['file_attachment_urls', 'expected_output_url']) {
      const value = entry?.[key];
      if (value === undefined) {
        continue;
      }

      const valid = key === 'file_attachment_urls' ? Array.isArray(value) && value.every(item => typeof item === 'string') : typeof value === 'string';
      if (!valid) {
        errors.push(`${label}[${index}].${key} has the wrong type`);
      }
    }

    if (typeof entry?.[SCHEMA_KEYS.caseDescription] === 'string' && entry[SCHEMA_KEYS.caseDescription].length > 4000) {
      errors.push(`${label}[${index}].${SCHEMA_KEYS.caseDescription} is longer than 4000 characters`);
    }
  }
};

const validateManifest = (dir, errors) => {
  const manifest = readJsonFile(dir, 'plugin.json', errors);
  if (!manifest) {
    return;
  }

  for (const field of ['name', 'version']) {
    checkString(errors, `plugin.json ${field}`, manifest[field], 100);
  }

  if (typeof manifest.name === 'string' && (manifest.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name))) {
    errors.push('plugin.json name must be lowercase letters, numbers and single hyphens, at most 64 characters');
  }

  checkString(errors, 'description', manifest.description, LIMITS.description);
  if (!isHttps(manifest.author?.url)) {
    errors.push('author.url must be an https URL');
  }

  const vendor = manifest.extensions?.[SCHEMA_KEYS.vendor];
  const ui = vendor?.[SCHEMA_KEYS.interface];
  if (!ui) {
    errors.push(`extensions.${SCHEMA_KEYS.vendor}.${SCHEMA_KEYS.interface} is required`);
    return;
  }

  checkString(errors, 'displayName', ui.displayName, LIMITS.displayName);
  if (ui.displayName !== LIMITS.pluginDisplayName) {
    errors.push(`displayName must be exactly "${LIMITS.pluginDisplayName}"`);
  }

  checkString(errors, 'shortDescription', ui.shortDescription, LIMITS.shortDescription);
  checkString(errors, 'longDescription', ui.longDescription, LIMITS.longDescription);
  for (const field of ['developerName', 'category']) {
    checkString(errors, field, ui[field], 100);
  }

  if (!Array.isArray(ui.capabilities) || ui.capabilities.length === 0) {
    errors.push('capabilities is required');
  } else {
    if (ui.capabilities.length > LIMITS.capabilities) {
      errors.push(`capabilities has ${ui.capabilities.length} entries; the limit is ${LIMITS.capabilities}`);
    }

    for (const [index, capability] of ui.capabilities.entries()) {
      checkString(errors, `capabilities[${index}]`, capability, LIMITS.capability);
    }
  }

  if (!Array.isArray(ui.defaultPrompt) || ui.defaultPrompt.length === 0) {
    errors.push('defaultPrompt is required');
  } else {
    if (ui.defaultPrompt.length > LIMITS.defaultPrompts) {
      errors.push(`defaultPrompt has ${ui.defaultPrompt.length} entries; the limit is ${LIMITS.defaultPrompts}`);
    }

    for (const [index, prompt] of ui.defaultPrompt.entries()) {
      checkString(errors, `defaultPrompt[${index}]`, prompt, LIMITS.defaultPrompt);
    }
  }

  for (const field of URL_FIELDS) {
    if (!isHttps(ui[field])) {
      errors.push(`${field} must be an https URL`);
    }
  }

  for (const field of ['brandColor', 'brandColorDark']) {
    if (!/^#[\da-f]{6}$/i.test(ui[field] ?? '')) {
      errors.push(`${field} must be a #RRGGBB color`);
    }
  }

  for (const field of ASSET_FIELDS) {
    checkAsset(dir, errors, field, ui[field]);
  }

  const review = vendor[SCHEMA_KEYS.review];
  const cases = review?.[SCHEMA_KEYS.testCases];
  checkCases(errors, 'positive', cases?.[SCHEMA_KEYS.positive], LIMITS.positiveCases, true);
  checkCases(errors, 'negative', cases?.[SCHEMA_KEYS.negative], LIMITS.negativeCases, false);
  if (typeof review?.[SCHEMA_KEYS.commerce] !== 'boolean') {
    errors.push(`${SCHEMA_KEYS.commerce} must be a boolean`);
  }

  const commerceDescription = review?.[SCHEMA_KEYS.commerceDescription];
  if (typeof commerceDescription !== 'string' || commerceDescription.trim() === '') {
    errors.push(`${SCHEMA_KEYS.commerceDescription} is required`);
  }

  const demo = review?.[SCHEMA_KEYS.demoUrl];
  if (!isHttps(demo)) {
    errors.push(`${SCHEMA_KEYS.demoUrl} must be an https URL`);
  } else if (/REPLACE-WITH/.test(demo)) {
    errors.push(`warn: ${SCHEMA_KEYS.demoUrl} is still the placeholder ${demo}; record the demo video and replace it before submitting`);
  }

  const publication = vendor[SCHEMA_KEYS.publication];
  checkString(errors, SCHEMA_KEYS.releaseNotes, publication?.[SCHEMA_KEYS.releaseNotes], 4000);
  const countries = publication?.[SCHEMA_KEYS.countries];
  if (!Array.isArray(countries)) {
    errors.push(`${SCHEMA_KEYS.countries} must be an array`);
  } else if (!countries.every(code => typeof code === 'string' && /^[A-Z]{2}$/.test(code))) {
    errors.push(`${SCHEMA_KEYS.countries} must contain uppercase two-letter country codes`);
  }
};

const validateMcp = (dir, errors) => {
  const mcp = readJsonFile(dir, 'mcp.json', errors);
  if (!mcp) {
    return;
  }

  if (mcp.$schema !== MCP_SCHEMA_URL) {
    errors.push(`mcp.json must declare "$schema": "${MCP_SCHEMA_URL}" (without it the portal detects no MCP server)`);
  }

  const servers = Object.values(mcp[SCHEMA_KEYS.mcpServers] ?? {});
  if (servers.length !== 1) {
    errors.push(`mcp.json must declare exactly one server, found ${servers.length}`);
    return;
  }

  const [server] = servers;
  if (server.type !== 'streamable-http') {
    errors.push('mcp.json server type must be streamable-http');
  }

  if (!isHttps(server.url)) {
    errors.push('mcp.json server url must be an https URL');
  }

  if (server.headers !== undefined && Object.keys(server.headers).length > 0) {
    errors.push('mcp.json server must not set headers (public submission rejects nonempty headers)');
  }

  const auth = server.extensions?.[SCHEMA_KEYS.vendor]?.[SCHEMA_KEYS.auth];
  if (auth?.type !== 'oauth' || !['cimd', 'dcr'].includes(auth?.client?.mode)) {
    errors.push('mcp.json server auth must be oauth with client mode cimd (preferred, falls back to dcr) or dcr');
  } else if (auth.client.clientId !== undefined || auth.client.tokenEndpointAuthMethod !== undefined) {
    errors.push('mcp.json auth.client must not set clientId or tokenEndpointAuthMethod for cimd/dcr');
  }

  if (JSON.stringify(mcp).includes('clientSecret')) {
    errors.push('mcp.json must not contain clientSecret');
  }
};

const validateSkills = (dir, errors) => {
  const skillsDir = path.join(dir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const file = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(file)) {
      errors.push(`skills/${entry.name}/SKILL.md is missing`);
      continue;
    }

    const match = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(fs.readFileSync(file, 'utf8'));
    if (!match) {
      errors.push(`skills/${entry.name}/SKILL.md needs name and description frontmatter`);
    } else if (match[1] !== entry.name) {
      errors.push(`skills/${entry.name}/SKILL.md name "${match[1]}" must match its folder`);
    } else if (match[2].length > 1024) {
      errors.push(`skills/${entry.name}/SKILL.md description is longer than 1024 characters`);
    }
  }
};

const validatePlugin = dir => {
  const errors = [];
  validateManifest(dir, errors);
  validateMcp(dir, errors);
  validateSkills(dir, errors);
  return errors;
};

module.exports = { validatePlugin, SCHEMA_KEYS };

if (require.main === module) {
  const dir = path.join(__dirname, '..');
  const results = validatePlugin(dir);
  for (const line of results) {
    console.log(line);
  }

  if (results.some(line => !line.startsWith('warn:'))) {
    process.exit(1);
  }
}
