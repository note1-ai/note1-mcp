'use strict';

// Copies skills/ and LICENSE into claude-plugin/ and sets the plugin version from package.json.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pluginDir = path.join(root, 'claude-plugin');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const setVersion = (file, update) => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  update(data);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

fs.rmSync(path.join(pluginDir, 'skills'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'skills'), path.join(pluginDir, 'skills'), { recursive: true, dereference: true });
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(pluginDir, 'LICENSE'));

setVersion(path.join(pluginDir, '.claude-plugin', 'plugin.json'), data => {
  data.version = version;
});
setVersion(path.join(root, '.claude-plugin', 'marketplace.json'), data => {
  for (const plugin of data.plugins) {
    plugin.version = version;
  }
});

console.log(`claude-plugin synced at ${version}`);
