#!/usr/bin/env node
// The .md viewer lives in its own package (react-llm-markdown-viewer) so the library stays small.
// `npx react-llm-markdown README.md` keeps working: this forwards to the viewer of the same version.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const windows = process.platform === 'win32';
const result = spawnSync(
  windows ? 'npx.cmd' : 'npx',
  ['--yes', `react-llm-markdown-viewer@${version}`, ...process.argv.slice(2)],
  { stdio: 'inherit', shell: windows },
);
if (result.error) console.error(`Could not start the viewer: ${result.error.message}\nRun: npx react-llm-markdown-viewer`);
process.exitCode = result.status ?? 1;
