// Packs this package exactly as npm would publish it, installs the tarball into e2e-app/ (the Expo test app), and exports
// the app for the web (e2e-app/dist-web), which the native end-to-end tests drive with Playwright.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLE = join(ROOT, 'e2e-app');
const PACK = join(EXAMPLE, '.pack');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

rmSync(PACK, { recursive: true, force: true });
mkdirSync(PACK, { recursive: true });
run(npm, ['pack', '--pack-destination', PACK], ROOT);
const tarball = readdirSync(PACK).find((name) => name.endsWith('.tgz'));
renameSync(join(PACK, tarball), join(PACK, 'react-llm-markdown.tgz'));

// The tarball changes on every pack while its file name stays the same: drop the cached copy first.
rmSync(join(EXAMPLE, 'node_modules', 'react-llm-markdown'), { recursive: true, force: true });
run(npm, ['install', '--no-audit', '--no-fund'], EXAMPLE);
// Installing the tarball by path refreshes its integrity in the lockfile, so npm cannot reuse an older pack.
run(npm, ['install', '--no-audit', '--no-fund', './.pack/react-llm-markdown.tgz'], EXAMPLE);
rmSync(join(EXAMPLE, 'dist-web'), { recursive: true, force: true });
run(npx, ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web'], EXAMPLE);
