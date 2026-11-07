// Builds the playground published on GitHub Pages into site-dist/. Needs `npm run build` first (for dist/styles.css).
// The React Native preview runs the native renderer through react-native-web.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site-dist');
if (!existsSync(join(ROOT, 'dist', 'styles.css'))) throw new Error('Run `npm run build` first');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: [join(ROOT, 'site', 'main.tsx'), join(ROOT, 'site', 'docs-app.tsx')],
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
  loader: { '.js': 'jsx', '.md': 'text' },
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'globalThis' },
  chunkNames: 'chunks/[name]-[hash]',
  legalComments: 'none',
  logLevel: 'warning',
});

cpSync(join(ROOT, 'site', 'index.html'), join(OUT, 'index.html'));
cpSync(join(ROOT, 'site', 'site.css'), join(OUT, 'site.css'));
for (const image of ['favicon-64.png', 'apple-touch-icon.png', 'icon-192.png']) cpSync(join(ROOT, 'site', image), join(OUT, image));
cpSync(join(ROOT, 'dist', 'styles.css'), join(OUT, 'styles.css'));
cpSync(join(ROOT, 'dist', 'fonts'), join(OUT, 'fonts'), { recursive: true });
// Documentation: one HTML file per page (docs/<slug>/index.html), so every page has its own URL. They share the
// docs-app bundle, which picks the page from the path.
const docsHtml = (prefix, title) =>
  readFileSync(join(ROOT, 'site', 'index.html'), 'utf8')
    .replace(/<title>[^<]*<\/title>/, `<title>${title} — react-llm-markdown</title>`)
    .replaceAll('href="favicon-64.png"', `href="${prefix}favicon-64.png"`)
    .replaceAll('href="apple-touch-icon.png"', `href="${prefix}apple-touch-icon.png"`)
    .replaceAll('href="styles.css"', `href="${prefix}styles.css"`)
    .replaceAll('href="site.css"', `href="${prefix}site.css"`)
    .replace('src="main.js"', `src="${prefix}docs-app.js"`);
const SLUGS = {
  introduction: 'Introduction', 'getting-started': 'Getting started', web: 'Web renderer', 'react-native': 'React Native renderer',
  'rich-blocks': 'Code, math, diagrams, charts', core: 'Core API', cli: 'CLI viewer', security: 'Security',
  performance: 'Performance', 'test-report': 'Test report', changelog: 'Changelog',
};
mkdirSync(join(OUT, 'docs'), { recursive: true });
writeFileSync(join(OUT, 'docs', 'index.html'), docsHtml('../', 'Docs'));
for (const [slug, title] of Object.entries(SLUGS)) {
  mkdirSync(join(OUT, 'docs', slug), { recursive: true });
  writeFileSync(join(OUT, 'docs', slug, 'index.html'), docsHtml('../../', title));
}

// GitHub Pages: serve files as they are (no Jekyll).
cpSync(join(ROOT, 'site', 'index.html'), join(OUT, '404.html'));
writeFileSync(join(OUT, '.nojekyll'), '');
console.log('built site-dist/');
