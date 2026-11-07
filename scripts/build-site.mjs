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

cpSync(join(ROOT, 'site', 'site.css'), join(OUT, 'site.css'));
for (const image of ['favicon-64.png', 'apple-touch-icon.png', 'icon-192.png', 'social-card.png']) cpSync(join(ROOT, 'site', image), join(OUT, image));
cpSync(join(ROOT, 'dist', 'styles.css'), join(OUT, 'styles.css'));
cpSync(join(ROOT, 'dist', 'fonts'), join(OUT, 'fonts'), { recursive: true });
// Documentation: one HTML file per page (docs/<slug>/index.html), so every page has its own URL, title, description
// and share card. They share the docs-app bundle, which picks the page from the path.
const SITE_URL = 'https://mickey-ichi.github.io/react-llm-markdown/';
const PAGES = {
  introduction: ['Introduction', 'Safe, rich Markdown for React and React Native, hardened for text an LLM wrote.'],
  'getting-started': ['Getting started', 'Install react-llm-markdown and render a streaming LLM answer on the web or in React Native.'],
  web: ['Web renderer', 'MarkdownView for React: props, image policy, theme tokens, element overrides and server rendering.'],
  'react-native': ['React Native renderer', 'Native-view Markdown for React Native and Expo, with math, Mermaid and charts in a hardened WebView.'],
  'rich-blocks': ['Code, math, diagrams, charts', 'Shiki code, KaTeX math, Mermaid diagrams and ECharts charts from Markdown, with live examples.'],
  core: ['Core API', 'The DOM-free parser, streaming repair and security policies shared by both renderers.'],
  cli: ['CLI viewer', 'npx react-llm-markdown file.md: view any Markdown file in the browser with live reload.'],
  faq: ['FAQ', 'Tailwind, Next.js, Expo Go, offline use, image leaks, raw HTML and more.'],
  security: ['Security', 'How react-llm-markdown neutralizes untrusted Markdown: HTML, URLs, Mermaid, KaTeX, ECharts and WebViews.'],
  performance: ['Performance', 'Render, responsiveness and memory budgets, measured in a real browser on both renderers.'],
  'test-report': ['Test report', 'The latest end-to-end run: attack payloads and performance cases on web and React Native.'],
  changelog: ['Changelog', 'Release notes for react-llm-markdown.'],
};
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (prefix, { title, description, url, script }) =>
  readFileSync(join(ROOT, 'site', 'index.html'), 'utf8')
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(
      '<meta property="og:image"',
      [
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="react-llm-markdown" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta property="og:image"`,
      ].join('\n    '),
    )
    .replaceAll('href="favicon-64.png"', `href="${prefix}favicon-64.png"`)
    .replaceAll('href="apple-touch-icon.png"', `href="${prefix}apple-touch-icon.png"`)
    .replaceAll('href="styles.css"', `href="${prefix}styles.css"`)
    .replaceAll('href="site.css"', `href="${prefix}site.css"`)
    .replace('src="main.js"', `src="${prefix}${script}"`);

writeFileSync(
  join(OUT, 'index.html'),
  page('', {
    title: 'react-llm-markdown — safe Markdown for React and React Native',
    description: PAGES.introduction[1] + ' Playground: paste or stream Markdown, see both renderers side by side.',
    url: SITE_URL,
    script: 'main.js',
  }),
);
mkdirSync(join(OUT, 'docs'), { recursive: true });
writeFileSync(join(OUT, 'docs', 'index.html'), page('../', { title: 'Docs — react-llm-markdown', description: PAGES.introduction[1], url: `${SITE_URL}docs/introduction/`, script: 'docs-app.js' }));
for (const [slug, [title, description]] of Object.entries(PAGES)) {
  mkdirSync(join(OUT, 'docs', slug), { recursive: true });
  writeFileSync(
    join(OUT, 'docs', slug, 'index.html'),
    page('../../', { title: `${title} — react-llm-markdown`, description, url: `${SITE_URL}docs/${slug}/`, script: 'docs-app.js' }),
  );
}

// Search engines: every page, and where the list is.
writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[SITE_URL, ...Object.keys(PAGES).map((slug) => `${SITE_URL}docs/${slug}/`)]
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);

// Unknown URLs: a real "not found" page (GitHub Pages serves 404.html at any depth, so its links are absolute).
writeFileSync(join(OUT, '404.html'), readFileSync(join(ROOT, 'site', '404.html'), 'utf8'));

// GitHub Pages: serve files as they are (no Jekyll).
writeFileSync(join(OUT, '.nojekyll'), '');
console.log('built site-dist/');
