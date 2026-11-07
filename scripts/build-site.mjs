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
// Pages: the playground and one HTML file per docs page, in each language (/, /vi/, /ja/ and …/docs/<slug>/), each with
// its own title, description, canonical URL, alternate languages and share card. They share two bundles, which read
// the page and the language from the path.
const { LOCALES, PAGE_META } = await import('../site/i18n.ts');
const SITE_URL = 'https://mickey-ichi.github.io/react-llm-markdown/';
const PLAYGROUND = {
  en: ['react-llm-markdown — safe Markdown for React and React Native', 'Safe, rich Markdown for React and React Native, hardened for text an LLM wrote. Paste or stream Markdown and see both renderers side by side.'],
  vi: ['react-llm-markdown — Markdown an toàn cho React và React Native', 'Markdown an toàn, đầy đủ tính năng cho React và React Native, dành cho văn bản do LLM viết. Dán hoặc stream Markdown và xem cả hai renderer cạnh nhau.'],
  ja: ['react-llm-markdown — React と React Native のための安全な Markdown', 'LLM が書いたテキストのための、React と React Native 向けの安全でリッチな Markdown。Markdown を貼り付けるかストリーミングして、両レンダラーを並べて確認できます。'],
};
const prefixOf = (locale) => (locale === 'en' ? '' : `${locale}/`);
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (depth, locale, { title, description, path, script }) => {
  const up = '../'.repeat(depth);
  const alternates = LOCALES.map((code) => `<link rel="alternate" hreflang="${code}" href="${SITE_URL}${prefixOf(code)}${path}" />`);
  return readFileSync(join(ROOT, 'site', 'index.html'), 'utf8')
    .replace('<html lang="en">', `<html lang="${locale}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(
      '<meta property="og:image"',
      [
        `<link rel="canonical" href="${SITE_URL}${prefixOf(locale)}${path}" />`,
        ...alternates,
        `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="react-llm-markdown" />`,
        `<meta property="og:locale" content="${{ en: 'en_US', vi: 'vi_VN', ja: 'ja_JP' }[locale]}" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${SITE_URL}${prefixOf(locale)}${path}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta property="og:image"`,
      ].join('\n    '),
    )
    .replaceAll('href="favicon-64.png"', `href="${up}favicon-64.png"`)
    .replaceAll('href="apple-touch-icon.png"', `href="${up}apple-touch-icon.png"`)
    .replaceAll('href="styles.css"', `href="${up}styles.css"`)
    .replaceAll('href="site.css"', `href="${up}site.css"`)
    .replace('src="main.js"', `src="${up}${script}"`);
};

const urls = [];
for (const locale of LOCALES) {
  const root = join(OUT, ...(locale === 'en' ? [] : [locale]));
  const depth = locale === 'en' ? 0 : 1;
  mkdirSync(join(root, 'docs'), { recursive: true });
  const [title, description] = PLAYGROUND[locale];
  writeFileSync(join(root, 'index.html'), page(depth, locale, { title, description, path: '', script: 'main.js' }));
  urls.push(`${SITE_URL}${prefixOf(locale)}`);
  const intro = PAGE_META.introduction[locale];
  writeFileSync(join(root, 'docs', 'index.html'), page(depth + 1, locale, { title: `${intro[0]} — react-llm-markdown`, description: intro[1], path: 'docs/introduction/', script: 'docs-app.js' }));
  for (const [slug, meta] of Object.entries(PAGE_META)) {
    const [pageTitle, pageDescription] = meta[locale];
    mkdirSync(join(root, 'docs', slug), { recursive: true });
    writeFileSync(
      join(root, 'docs', slug, 'index.html'),
      page(depth + 2, locale, { title: `${pageTitle} — react-llm-markdown`, description: pageDescription, path: `docs/${slug}/`, script: 'docs-app.js' }),
    );
    urls.push(`${SITE_URL}${prefixOf(locale)}docs/${slug}/`);
  }
}

// Search engines: every page, and where the list is.
writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);

// Unknown URLs: a real "not found" page (GitHub Pages serves 404.html at any depth, so its links are absolute).
writeFileSync(join(OUT, '404.html'), readFileSync(join(ROOT, 'site', '404.html'), 'utf8'));

// GitHub Pages: serve files as they are (no Jekyll).
writeFileSync(join(OUT, '.nojekyll'), '');
console.log('built site-dist/');
