// Builds the playground published on GitHub Pages into site-dist/. Needs `npm run build` first (for dist/styles.css).
// The React Native preview runs the native renderer through react-native-web.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site-dist');
if (!existsSync(join(ROOT, 'dist', 'styles.css'))) throw new Error('Run `npm run build` first');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: [join(ROOT, 'site', 'main.tsx')],
  outdir: OUT,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  alias: { 'react-native': 'react-native-web' },
  // react-native-web ships some files with JSX in .js; Expo-style packages read __DEV__.
  loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'globalThis' },
  chunkNames: 'chunks/[name]-[hash]',
  legalComments: 'none',
  logLevel: 'warning',
});

cpSync(join(ROOT, 'site', 'index.html'), join(OUT, 'index.html'));
cpSync(join(ROOT, 'site', 'site.css'), join(OUT, 'site.css'));
cpSync(join(ROOT, 'dist', 'styles.css'), join(OUT, 'styles.css'));
cpSync(join(ROOT, 'dist', 'fonts'), join(OUT, 'fonts'), { recursive: true });
// GitHub Pages: serve files as they are (no Jekyll).
cpSync(join(ROOT, 'site', 'index.html'), join(OUT, '404.html'));
await import('node:fs').then(({ writeFileSync }) => writeFileSync(join(OUT, '.nojekyll'), ''));
console.log('built site-dist/');
