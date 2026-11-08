#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/validate.js
mkdir -p dist
rm -f dist/note1-plugin.zip
if command -v zip >/dev/null 2>&1; then
  zip -r dist/note1-plugin.zip plugin.json mcp.json assets skills -x '*.DS_Store'
else
  python3 - <<'PY'
import os
import zipfile

with zipfile.ZipFile('dist/note1-plugin.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for entry in ['plugin.json', 'mcp.json', 'assets', 'skills']:
        if os.path.isfile(entry):
            archive.write(entry)
            continue
        for folder, _, names in os.walk(entry):
            for name in sorted(names):
                if name != '.DS_Store':
                    archive.write(os.path.join(folder, name))
PY
fi
ls -l dist/note1-plugin.zip
size=$(stat -c%s dist/note1-plugin.zip 2>/dev/null || stat -f%z dist/note1-plugin.zip)
if [ "$size" -gt 104857600 ]; then
  echo "error: dist/note1-plugin.zip is $size bytes; the limit is 100 MB" >&2
  exit 1
fi
