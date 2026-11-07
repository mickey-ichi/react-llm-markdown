// The documentation site: Markdown pages rendered with the library's own MarkdownView, in English, Vietnamese and
// Japanese (/docs/…, /vi/docs/…, /ja/docs/…).
import { type MouseEvent, type ReactNode, StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { parseMarkdown } from '../src/core/index.ts';
import { MarkdownView } from '../src/web/index.ts';
import changelog from '../CHANGELOG.md';
import performance from '../docs/performance.md';
import security from '../docs/security.md';
import testReport from '../docs/test-report.md';
import cli from './docs/cli.md';
import core from './docs/core.md';
import faq from './docs/faq.md';
import gettingStarted from './docs/getting-started.md';
import introduction from './docs/introduction.md';
import jaCli from './docs/ja/cli.md';
import jaCore from './docs/ja/core.md';
import jaFaq from './docs/ja/faq.md';
import jaGettingStarted from './docs/ja/getting-started.md';
import jaIntroduction from './docs/ja/introduction.md';
import jaReactNative from './docs/ja/react-native.md';
import jaRichBlocks from './docs/ja/rich-blocks.md';
import jaWeb from './docs/ja/web.md';
import reactNative from './docs/react-native.md';
import richBlocks from './docs/rich-blocks.md';
import viCli from './docs/vi/cli.md';
import viCore from './docs/vi/core.md';
import viFaq from './docs/vi/faq.md';
import viGettingStarted from './docs/vi/getting-started.md';
import viIntroduction from './docs/vi/introduction.md';
import viReactNative from './docs/vi/react-native.md';
import viRichBlocks from './docs/vi/rich-blocks.md';
import viWeb from './docs/vi/web.md';
import web from './docs/web.md';
import { type Locale, LOCALE_NAMES, LOCALE_SHORT, LOCALES, localeFromPath, PAGE_META, STRINGS } from './i18n.ts';

const REPO = 'https://github.com/mickey-ichi/react-llm-markdown';

/** Guide pages exist in every language; project pages are the repo's English files. */
const GUIDE = ['introduction', 'getting-started', 'web', 'react-native', 'rich-blocks', 'core', 'cli', 'faq'] as const;
const PROJECT = ['security', 'performance', 'test-report', 'changelog'] as const;
const SLUGS: readonly string[] = [...GUIDE, ...PROJECT];
type GuideSlug = (typeof GUIDE)[number];
type ProjectSlug = (typeof PROJECT)[number];

const GUIDE_CONTENT: Record<Locale, Record<GuideSlug, string>> = {
  en: { introduction, 'getting-started': gettingStarted, web, 'react-native': reactNative, 'rich-blocks': richBlocks, core, cli, faq },
  vi: {
    introduction: viIntroduction,
    'getting-started': viGettingStarted,
    web: viWeb,
    'react-native': viReactNative,
    'rich-blocks': viRichBlocks,
    core: viCore,
    cli: viCli,
    faq: viFaq,
  },
  ja: {
    introduction: jaIntroduction,
    'getting-started': jaGettingStarted,
    web: jaWeb,
    'react-native': jaReactNative,
    'rich-blocks': jaRichBlocks,
    core: jaCore,
    cli: jaCli,
    faq: jaFaq,
  },
};
const PROJECT_CONTENT: Record<ProjectSlug, { markdown: string; source: string }> = {
  security: { markdown: security, source: 'docs/security.md' },
  performance: { markdown: performance, source: 'docs/performance.md' },
  'test-report': { markdown: testReport, source: 'docs/test-report.md' },
  changelog: { markdown: changelog, source: 'CHANGELOG.md' },
};

interface Page {
  slug: string;
  title: string;
  markdown: string;
  /** Where the file lives in the repo, to resolve its relative links and for "Edit this page". */
  source: string;
  /** A project page shown in English on a translated site. */
  englishOnly: boolean;
}

function pageFor(slug: string, locale: Locale): Page {
  const title = PAGE_META[slug]![locale][0];
  if ((GUIDE as readonly string[]).includes(slug)) {
    const name = slug as GuideSlug;
    return {
      slug,
      title,
      markdown: GUIDE_CONTENT[locale][name],
      source: locale === 'en' ? `site/docs/${name}.md` : `site/docs/${locale}/${name}.md`,
      englishOnly: false,
    };
  }
  const project = PROJECT_CONTENT[slug as ProjectSlug];
  return { slug, title, markdown: project.markdown, source: project.source, englishOnly: locale !== 'en' };
}

/** Repo files that are docs pages, so links between them stay on the site. */
const BY_SOURCE = new Map<string, string>([
  ...GUIDE.map((slug) => [`site/docs/${slug}.md`, slug] as const),
  ...PROJECT.map((slug) => [PROJECT_CONTENT[slug].source, slug] as const),
]);

// ---------- URLs ----------

/** The site's base path on GitHub Pages (`/react-llm-markdown/`), without a locale. */
function siteBase(): string {
  const path = location.pathname;
  const at = path.indexOf('/docs/');
  const before = at >= 0 ? path.slice(0, at + 1) : path.replace(/[^/]*$/, '');
  return before.replace(/(?:vi|ja)\/$/, '');
}

const localePrefix = (locale: Locale) => (locale === 'en' ? '' : `${locale}/`);
const pageUrl = (slug: string, locale: Locale) => `${siteBase()}${localePrefix(locale)}docs/${slug}/`;

function slugFromPath(): string {
  const slug = /\/docs\/([^/]+)\/?$/.exec(location.pathname)?.[1];
  return slug && SLUGS.includes(slug) ? slug : 'introduction';
}

/** `a/b/../c` → `a/c` */
function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return out.join('/');
}

/**
 * Where a link in a page goes. Pages link to each other by slug (`getting-started`) or, in repo files, by path
 * (`security.md`, `../CHANGELOG.md`); both become site routes in the current language. Other relative paths go to the
 * file on GitHub.
 */
function resolveLink(href: string, page: Page, locale: Locale): { href: string; internal: boolean } {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return { href, internal: false };
  if (href.startsWith('#')) return { href, internal: true };
  const [path = '', hash = ''] = href.split('#');
  const anchor = hash ? `#${hash}` : '';
  if (path === '../../' || path === '../..') return { href: siteBase() + localePrefix(locale), internal: false };
  const bare = path.replace(/\/$/, '');
  if (SLUGS.includes(bare)) return { href: pageUrl(bare, locale) + anchor, internal: true };
  // Translated pages link like the English ones; resolve them against the English file.
  const from = page.source.replace(/^site\/docs\/(?:vi|ja)\//, 'site/docs/');
  const target = normalize(`${from.replace(/[^/]*$/, '')}${path}`);
  const slug = BY_SOURCE.get(target);
  if (slug) return { href: pageUrl(slug, locale) + anchor, internal: true };
  return { href: `${REPO}/blob/main/${target}${anchor}`, internal: false };
}

// ---------- headings ----------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'props' in node) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

interface Heading {
  depth: number;
  text: string;
  id: string;
}

function headingsOf(markdown: string): Heading[] {
  const out: Heading[] = [];
  const walk = (node: { type: string; value?: string; children?: unknown[] }): string => {
    if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
    return (node.children ?? []).map((child) => walk(child as never)).join('');
  };
  for (const node of parseMarkdown(markdown, { softBreaks: false }).children) {
    if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
      const text = walk(node as never);
      out.push({ depth: node.depth, text, id: slugify(text) });
    }
  }
  return out;
}

// ---------- live examples ----------

/** ````markdown live fences: shown as a rendered preview with the source one tab away. */
const LIVE = /^````markdown live\n([\s\S]*?)\n````$/gm;

type Chunk = { live: false; markdown: string } | { live: true; source: string };

function chunksOf(markdown: string): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  for (const match of markdown.matchAll(LIVE)) {
    chunks.push({ live: false, markdown: markdown.slice(index, match.index) });
    chunks.push({ live: true, source: match[1]! });
    index = match.index + match[0].length;
  }
  chunks.push({ live: false, markdown: markdown.slice(index) });
  return chunks.filter((chunk) => chunk.live || chunk.markdown.trim() !== '');
}

function LiveExample({ source, locale }: { source: string; locale: Locale }) {
  const [tab, setTab] = useState<'preview' | 'markdown'>('preview');
  const t = STRINGS[locale];
  return (
    <div className="live">
      <div aria-label="Example" className="live-tabs" role="tablist">
        {(['preview', 'markdown'] as const).map((name) => (
          <button aria-selected={tab === name} key={name} onClick={() => setTab(name)} role="tab" type="button">
            {name === 'preview' ? t.livePreview : t.liveMarkdown}
          </button>
        ))}
      </div>
      <div className="live-body" role="tabpanel">
        <MarkdownView codeBlockMaxHeight={0} lineNumbers={false} softBreaks={false}>
          {tab === 'preview' ? source : `\`\`\`\`markdown\n${source}\n\`\`\`\``}
        </MarkdownView>
      </div>
    </div>
  );
}

// ---------- app ----------

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem('rlm-site-theme');
    if (saved) return saved === 'dark';
  } catch {
    // storage blocked
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function Docs() {
  const locale = useMemo(() => localeFromPath(location.pathname), []);
  const t = STRINGS[locale];
  const [slug, setSlug] = useState(slugFromPath);
  const [dark, setDark] = useState(initialDark);
  const [menuOpen, setMenuOpen] = useState(false);
  const page = useMemo(() => pageFor(slug, locale), [slug, locale]);
  const index = SLUGS.indexOf(slug);
  const headings = useMemo(() => headingsOf(page.markdown), [page]);
  const groups = [
    { title: t.guide, slugs: GUIDE as readonly string[] },
    { title: t.project, slugs: PROJECT as readonly string[] },
  ];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('rlm-site-theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);

  useEffect(() => {
    document.title = `${page.title} — react-llm-markdown`;
  }, [page]);

  useEffect(() => {
    const onPop = () => setSlug(slugFromPath());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  // After a page renders, jump to the #section in the URL (or the top).
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = setTimeout(() => {
      const target = id ? document.getElementById(id) : null;
      if (target) target.scrollIntoView();
      else scrollTo(0, 0);
    }, 50);
    return () => clearTimeout(timer);
  }, [slug]);

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const url = new URL(href, location.href);
    const target = /\/docs\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    if (!target || !SLUGS.includes(target) || localeFromPath(url.pathname) !== locale) return;
    event.preventDefault();
    setMenuOpen(false);
    history.pushState(null, '', url.pathname + url.hash);
    if (target === slug && url.hash) {
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setSlug(target);
  };

  const components = useMemo(() => {
    const heading =
      (Tag: 'h2' | 'h3') =>
      ({ children }: { children?: ReactNode }) => {
        const id = slugify(textOf(children));
        return (
          <Tag className="doc-heading" id={id}>
            {children}
            <a aria-label={t.linkToSection} className="doc-anchor" href={`#${id}`}>
              #
            </a>
          </Tag>
        );
      };
    return {
      h2: heading('h2'),
      h3: heading('h3'),
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        if (typeof href !== 'string' || href === '') return <span>{children}</span>;
        const link = resolveLink(href, page, locale);
        if (link.href.startsWith('#')) {
          return (
            <a
              className="rlm-link"
              href={link.href}
              onClick={(event) => {
                const target = document.getElementById(decodeURIComponent(link.href.slice(1)));
                if (!target) return;
                event.preventDefault();
                history.replaceState(null, '', link.href);
                target.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {children}
            </a>
          );
        }
        return link.internal ? (
          <a className="rlm-link" href={link.href} onClick={(event) => go(event, link.href)}>
            {children}
          </a>
        ) : (
          <a className="rlm-link" href={link.href} rel="noopener noreferrer" target="_blank">
            {children}
          </a>
        );
      },
    };
  }, [page, slug, locale]);

  const base = siteBase();
  const prev = index > 0 ? SLUGS[index - 1]! : null;
  const next = index < SLUGS.length - 1 ? SLUGS[index + 1]! : null;
  return (
    <>
      <header className="docs-bar">
        <a className="docs-brand" href={base + localePrefix(locale)}>
          <img alt="" height={32} src={`${base}icon-192.png`} width={32} />
          <span>react-llm-markdown</span>
        </a>
        <nav aria-label="Site" className="docs-links">
          <a href={base + localePrefix(locale)}>{t.playground}</a>
          <a aria-current="page" href={pageUrl('introduction', locale)} onClick={(e) => go(e, pageUrl('introduction', locale))}>
            {t.docs}
          </a>
          <a href={REPO}>{t.github}</a>
        </nav>
        <nav aria-label={t.language} className="lang-switch">
          {LOCALES.map((code) => (
            <a
              aria-current={code === locale ? 'true' : undefined}
              href={pageUrl(slug, code)}
              hrefLang={code}
              key={code}
              lang={code}
              title={LOCALE_NAMES[code]}
            >
              {LOCALE_SHORT[code]}
            </a>
          ))}
        </nav>
        <button aria-label={dark ? t.lightTheme : t.darkTheme} className="ghost square" onClick={() => setDark((d) => !d)} type="button">
          {dark ? '☀' : '☾'}
        </button>
      </header>

      <div className="docs">
        <button aria-expanded={menuOpen} className="docs-menu-button" onClick={() => setMenuOpen((open) => !open)} type="button">
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span> {page.title}
        </button>
        <nav aria-label="Documentation" className={`docs-nav ${menuOpen ? 'is-open' : ''}`}>
          {groups.map((group) => (
            <div key={group.title}>
              <p className="docs-nav-title">{group.title}</p>
              <ul>
                {group.slugs.map((s) => (
                  <li key={s}>
                    <a aria-current={s === slug ? 'page' : undefined} href={pageUrl(s, locale)} onClick={(e) => go(e, pageUrl(s, locale))}>
                      {PAGE_META[s]![locale][0]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <article className="docs-page">
          {page.englishOnly ? <p className="docs-notice">{t.englishOnly}</p> : null}
          {chunksOf(page.markdown).map((chunk, i) =>
            chunk.live ? (
              <LiveExample key={`${slug}-${i}`} locale={locale} source={chunk.source} />
            ) : (
              <MarkdownView
                codeBlockMaxHeight={0}
                components={components}
                key={`${slug}-${i}`}
                lineNumbers={false}
                softBreaks={false}
                tableMaxHeight={0}
              >
                {chunk.markdown}
              </MarkdownView>
            ),
          )}
          <footer className="docs-pager">
            {prev ? (
              <a href={pageUrl(prev, locale)} onClick={(e) => go(e, pageUrl(prev, locale))}>
                <small>{t.previous}</small>
                {PAGE_META[prev]![locale][0]}
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a className="next" href={pageUrl(next, locale)} onClick={(e) => go(e, pageUrl(next, locale))}>
                <small>{t.next}</small>
                {PAGE_META[next]![locale][0]}
              </a>
            ) : null}
          </footer>
          <p className="docs-edit">
            <a href={`${REPO}/edit/main/${page.source}`} rel="noopener noreferrer" target="_blank">
              {t.editPage}
            </a>
            {' · '}
            <a href="https://github.com/sponsors/mickey-ichi" rel="noopener noreferrer" target="_blank">
              ♥ {t.sponsor}
            </a>
          </p>
        </article>

        <aside aria-label={t.onThisPage} className="docs-toc">
          {headings.length > 0 ? (
            <>
              <p className="docs-nav-title">{t.onThisPage}</p>
              <ul>
                {headings.map((h) => (
                  <li className={h.depth === 3 ? 'sub' : undefined} key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        history.replaceState(null, '', `#${h.id}`);
                        document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Docs />
  </StrictMode>,
);
