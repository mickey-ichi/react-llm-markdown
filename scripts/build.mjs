// Builds dist/: the library and CLI (tsc), dist/styles.css (Tailwind, prefixed `rlm:`), the KaTeX
// fonts, and the browser bundle of the CLI viewer (esbuild).
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Scanner } from '@tailwindcss/oxide';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BUILD = join(ROOT, 'build');
const PREFIX = 'rlm';

const packageDir = (name) => join(ROOT, 'node_modules', name);
/** Runs a package's bin with this Node (no shell, works the same on every OS). */
const run = (pkg, bin, args) => {
  const { bin: bins } = JSON.parse(readFileSync(join(packageDir(pkg), 'package.json'), 'utf8'));
  const entry = typeof bins === 'string' ? bins : bins[bin];
  execFileSync(process.execPath, [join(packageDir(pkg), entry), ...args], { cwd: ROOT, stdio: 'inherit' });
};

rmSync(DIST, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });

// 1. Library + CLI.
run('typescript', 'tsc', ['-p', 'tsconfig.build.json']);

// 2. Tailwind candidates: the classes Tailwind's own scanner finds in Streamdown's JS, with our
//    prefix, because Streamdown prepends `rlm:` at runtime and Tailwind only generates what it sees.
const scanner = new Scanner({
  sources: ['streamdown', '@streamdown/code', '@streamdown/math', '@streamdown/mermaid', '@streamdown/cjk'].map(
    (pkg) => ({ base: join(packageDir(pkg), 'dist'), pattern: '**/*.js', negated: false }),
  ),
});
const tokens = new Set(scanner.scan());
writeFileSync(join(BUILD, 'candidates.txt'), [...tokens].map((token) => `${PREFIX}:${token}`).join('\n'));

// 3. styles.css. KaTeX's fonts: woff2 only (every supported browser reads it), from dist/fonts/.
run('@tailwindcss/cli', 'tailwindcss', ['-i', 'src/web/styles.css', '-o', 'build/styles.css', '--minify']);
const css = readFileSync(join(BUILD, 'styles.css'), 'utf8')
  .replace(/,\s*url\([^)]*KaTeX_[\w-]+\.(?:woff|ttf)\)\s*format\("(?:woff|truetype)"\)/g, '')
  .replace(/url\((["']?)[^)"']*?fonts\/(KaTeX_[\w-]+\.woff2)\1\)/g, 'url(fonts/$2)');
writeFileSync(join(DIST, 'styles.css'), css);
mkdirSync(join(DIST, 'fonts'), { recursive: true });
for (const font of readdirSync(join(packageDir('katex'), 'dist', 'fonts')).filter((name) => name.endsWith('.woff2'))) {
  cpSync(join(packageDir('katex'), 'dist', 'fonts', font), join(DIST, 'fonts', font));
}
const fontRefs = [...css.matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]);
if (fontRefs.length === 0) throw new Error('styles.css has no KaTeX font URLs - check the rewrite');

// 4. CLI viewer bundle.
const result = await build({
  entryPoints: ['src/viewer/client.tsx'],
  outdir: join(DIST, 'viewer'),
  absWorkingDir: ROOT,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  chunkNames: 'chunks/[name]-[hash]',
  logLevel: 'warning',
  metafile: true,
  legalComments: 'none', // license texts go to dist/viewer/THIRD_PARTY_LICENSES.txt instead
});
cpSync('src/viewer/viewer.css', join(DIST, 'viewer', 'viewer.css'));

// License texts of every package bundled into the viewer.
const bundled = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const match = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input.split('node_modules/').length > 2 ? input.slice(input.lastIndexOf('node_modules/')) : input);
  if (match) bundled.add(input.slice(0, input.lastIndexOf('node_modules/')) + 'node_modules/' + match[1]);
}
const notices = [...bundled].sort().map((pkgDir) => {
  const dir = join(ROOT, pkgDir);
  const { name, version, license } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = readdirSync(dir).find((entry) => /^(licen[cs]e|copying)(\.|$)/i.test(entry));
  const text = file ? readFileSync(join(dir, file), 'utf8').trim() : `License: ${license}`;
  return `${name}@${version} (${license})\n\n${text}`;
});
writeFileSync(join(DIST, 'viewer', 'THIRD_PARTY_LICENSES.txt'), `${[...new Set(notices)].join(`\n\n${'-'.repeat(72)}\n\n`)}\n`);

console.log(`built dist/ (${tokens.size} Tailwind candidates, ${(css.length / 1024).toFixed(0)} KB css)`);
