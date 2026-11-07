// The documentation site: Markdown pages rendered with the library's own MarkdownView.
import { type MouseEvent, type ReactNode, StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { parseMarkdown } from '../src/core/index.ts';
import { MarkdownView } from '../src/web/index.ts';
import changelog from '../CHANGELOG.md';
import performance from '../docs/performance.md';
import security from '../docs/security.md';
import testReport from '../docs/test-report.md';
import cli from './docs/cli.md';
import faq from './docs/faq.md';
import core from './docs/core.md';
import gettingStarted from './docs/getting-started.md';
import introduction from './docs/introduction.md';
import reactNative from './docs/react-native.md';
import richBlocks from './docs/rich-blocks.md';
import web from './docs/web.md';

const REPO = 'https://github.com/mickey-ichi/react-llm-markdown';

interface Page {
  slug: string;
  title: string;
  markdown: string;
  /** Where the file lives in the repo, to resolve its relative links and for "Edit this page". */
  source: string;
}

const GROUPS: { title: string; pages: Page[] }[] = [
  {
    title: 'Guide',
    pages: [
      { slug: 'introduction', title: 'Introduction', markdown: introduction, source: 'site/docs/introduction.md' },
      { slug: 'getting-started', title: 'Getting started', markdown: gettingStarted, source: 'site/docs/getting-started.md' },
      { slug: 'web', title: 'Web renderer', markdown: web, source: 'site/docs/web.md' },
      { slug: 'react-native', title: 'React Native renderer', markdown: reactNative, source: 'site/docs/react-native.md' },
      { slug: 'rich-blocks', title: 'Code, math, diagrams, charts', markdown: richBlocks, source: 'site/docs/rich-blocks.md' },
      { slug: 'core', title: 'Core API', markdown: core, source: 'site/docs/core.md' },
      { slug: 'cli', title: 'CLI viewer', markdown: cli, source: 'site/docs/cli.md' },
      { slug: 'faq', title: 'FAQ', markdown: faq, source: 'site/docs/faq.md' },
    ],
  },
  {
    title: 'Project',
    pages: [
      { slug: 'security', title: 'Security', markdown: security, source: 'docs/security.md' },
      { slug: 'performance', title: 'Performance', markdown: performance, source: 'docs/performance.md' },
      { slug: 'test-report', title: 'Test report', markdown: testReport, source: 'docs/test-report.md' },
      { slug: 'changelog', title: 'Changelog', markdown: changelog, source: 'CHANGELOG.md' },
    ],
  },
];
const PAGES = GROUPS.flatMap((group) => group.pages);
const BY_SLUG = new Map(PAGES.map((page) => [page.slug, page]));
/** Repo files that are docs pages, so links between them stay on the site. */
const BY_SOURCE = new Map(PAGES.map((page) => [page.source, page]));

// ---------- URLs ----------

/** Everything before `/docs/` (the site's base path on GitHub Pages: `/react-llm-markdown/`). */
function siteBase(): string {
  const at = location.pathname.indexOf('/docs/');
  return at >= 0 ? location.pathname.slice(0, at + 1) : location.pathname.replace(/[^/]*$/, '');
}

function slugFromPath(): string {
  const slug = /\/docs\/([^/]+)\/?$/.exec(location.pathname)?.[1];
  return slug && BY_SLUG.has(slug) ? slug : 'introduction';
}

const pageUrl = (slug: string) => `${siteBase()}docs/${slug}/`;

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
 * (`security.md`, `../CHANGELOG.md`); both become site routes. Other relative paths go to the file on GitHub.
 */
function resolveLink(href: string, page: Page): { href: string; internal: boolean } {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return { href, internal: false };
  if (href.startsWith('#')) return { href, internal: true };
  const [path = '', hash = ''] = href.split('#');
  if (path === '../../' || path === '../..') return { href: siteBase(), internal: false };
  if (BY_SLUG.has(path.replace(/\/$/, ''))) return { href: pageUrl(path.replace(/\/$/, '')) + (hash ? `#${hash}` : ''), internal: true };
  const target = normalize(`${page.source.replace(/[^/]*$/, '')}${path}`);
  const doc = BY_SOURCE.get(target);
  if (doc) return { href: pageUrl(doc.slug) + (hash ? `#${hash}` : ''), internal: true };
  return { href: `${REPO}/blob/main/${target}${hash ? `#${hash}` : ''}`, internal: false };
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
  const walk = (node: { type: string; depth?: number; value?: string; children?: unknown[] }): string => {
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

function LiveExample({ source }: { source: string }) {
  const [tab, setTab] = useState<'preview' | 'markdown'>('preview');
  return (
    <div className="live">
      <div aria-label="Example" className="live-tabs" role="tablist">
        {(['preview', 'markdown'] as const).map((name) => (
          <button aria-selected={tab === name} key={name} onClick={() => setTab(name)} role="tab" type="button">
            {name === 'preview' ? 'Preview' : 'Markdown'}
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
  const [slug, setSlug] = useState(slugFromPath);
  const [dark, setDark] = useState(initialDark);
  const [menuOpen, setMenuOpen] = useState(false);
  const page = BY_SLUG.get(slug)!;
  const index = PAGES.indexOf(page);
  const headings = useMemo(() => headingsOf(page.markdown), [page]);

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
    if (!target || !BY_SLUG.has(target)) return;
    event.preventDefault();
    setMenuOpen(false);
    if (target === slug && url.hash) {
      history.pushState(null, '', url.pathname + url.hash);
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    history.pushState(null, '', url.pathname + url.hash);
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
            <a aria-label="Link to this section" className="doc-anchor" href={`#${id}`}>
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
        const link = resolveLink(href, page);
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
  }, [page, slug]);

  const base = siteBase();
  return (
    <>
      <header className="docs-bar">
        <a className="docs-brand" href={base}>
          <img alt="" height={32} src={`${base}icon-192.png`} width={32} />
          <span>react-llm-markdown</span>
        </a>
        <nav aria-label="Site" className="docs-links">
          <a href={base}>Playground</a>
          <a aria-current="page" href={pageUrl('introduction')} onClick={(e) => go(e, pageUrl('introduction'))}>
            Docs
          </a>
          <a href={REPO}>GitHub</a>
          <a href="https://www.npmjs.com/package/react-llm-markdown">npm</a>
        </nav>
        <button aria-label={dark ? 'Use light theme' : 'Use dark theme'} className="ghost square" onClick={() => setDark((d) => !d)} type="button">
          {dark ? '☀' : '☾'}
        </button>
      </header>

      <div className="docs">
        <button aria-expanded={menuOpen} className="docs-menu-button" onClick={() => setMenuOpen((open) => !open)} type="button">
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span> {page.title}
        </button>
        <nav aria-label="Documentation" className={`docs-nav ${menuOpen ? 'is-open' : ''}`}>
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="docs-nav-title">{group.title}</p>
              <ul>
                {group.pages.map((p) => (
                  <li key={p.slug}>
                    <a aria-current={p.slug === slug ? 'page' : undefined} href={pageUrl(p.slug)} onClick={(e) => go(e, pageUrl(p.slug))}>
                      {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <article className="docs-page">
          {chunksOf(page.markdown).map((chunk, i) =>
            chunk.live ? (
              <LiveExample key={`${slug}-${i}`} source={chunk.source} />
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
            {index > 0 ? (
              <a href={pageUrl(PAGES[index - 1]!.slug)} onClick={(e) => go(e, pageUrl(PAGES[index - 1]!.slug))}>
                <small>Previous</small>
                {PAGES[index - 1]!.title}
              </a>
            ) : (
              <span />
            )}
            {index < PAGES.length - 1 ? (
              <a className="next" href={pageUrl(PAGES[index + 1]!.slug)} onClick={(e) => go(e, pageUrl(PAGES[index + 1]!.slug))}>
                <small>Next</small>
                {PAGES[index + 1]!.title}
              </a>
            ) : null}
          </footer>
          <p className="docs-edit">
            <a href={`${REPO}/edit/main/${page.source}`} rel="noopener noreferrer" target="_blank">
              Edit this page on GitHub
            </a>
          </p>
        </article>

        <aside aria-label="On this page" className="docs-toc">
          {headings.length > 0 ? (
            <>
              <p className="docs-nav-title">On this page</p>
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
