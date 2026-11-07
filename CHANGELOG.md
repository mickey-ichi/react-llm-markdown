# Changelog

## Unreleased

- README rewritten (overview, quick start, docs map, compatibility, support) and translated: [Tiếng Việt](README.vi.md),
  [日本語](README.ja.md).
- Docs and playground in English, Vietnamese and Japanese (`/vi/`, `/ja/`), with a language switch, `hreflang`
  alternates and localized titles and descriptions; project pages (security, performance, test report, changelog)
  stay in English.
- Docs: calmer navigation (padded items, a divider, a lighter active state), list indentation tuned for reading, a
  monospace code font on every page, a sponsor link.

## 0.1.1 — 2026-11-07

- React Native: math renders with KaTeX 0.19.1 (fixes [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7)),
  with the matching stylesheet pinned in the WebView. Web math still uses Streamdown's KaTeX 0.16 until
  `@streamdown/math` upgrades; `styles.css` now always carries that version's CSS (tested).
- Dependabot: Streamdown packages grouped; majors of Streamdown and Shiki are upgraded by hand.
- Security (from a review of 0.1.0):
  - `isImageAllowed` (web and native): restrict which image hosts load; refused images are never requested.
  - Web: `id` / `name` from raw HTML get a `user-content-` prefix (DOM clobbering).
  - URLs are judged as the browser reads them: `/\host`, tab/CR/LF tricks and `java\tscript:` are refused.
  - ECharts: `splitNumber` capped, axis tick steps removed (a gauge could freeze the page); string arrays under `link`
    removed.
  - React Native WebViews: the CSP allows exactly the pinned files, and no navigation except the initial document.
  - CLI viewer: requests whose `Host` is not `127.0.0.1` / `localhost` are refused (DNS rebinding).
- Project: CONTRIBUTING, Code of Conduct, issue and PR templates; CI checks the package with publint and
  are-the-types-wrong; `typesVersions` for TypeScript `moduleResolution: node10`.
- Docs: live examples (preview / source), FAQ, a 404 page, per-page titles, descriptions and share cards, sitemap.
- Documentation site: https://mickey-ichi.github.io/react-llm-markdown/docs/ (guide, web, React Native, rich blocks,
  core API, CLI, security, performance, test report, changelog), rendered with the library itself.
- Fixes:
  - Web: footnote links jump instead of animating when the reader prefers reduced motion.
  - LaTeX delimiters: escaped brackets in prose (`\[this\]`, `arr\[0\]`) are no longer turned into math, and `~~~`
    fences, nested fences and a fence still streaming are left alone.
  - React Native: relative links and images resolve correctly (React Native's `URL` cannot), Mermaid shows its
    source while streaming instead of reloading a WebView per chunk, highlighted code is cached.
  - package.json: `main`, `types` and `react-native` fields, for Metro without package exports (React Native < 0.79)
    and TypeScript `moduleResolution: node`.

## 0.1.0 — 2026-11-07

First release.

- `MarkdownView` React component: GFM, Shiki code highlighting, KaTeX math, Mermaid, ECharts fences and CJK emphasis,
  streaming-safe rendering, LaTeX delimiter normalization and optional soft line breaks.
- Security hardening for untrusted Markdown: sanitized HTML, URL protocol allowlist, strict Mermaid and KaTeX settings,
  ECharts option allowlist and size limits.
- `react-llm-markdown/styles.css`: prebuilt, prefixed styles with light and dark themes; no Tailwind needed in the app.
- React Native renderer (`react-llm-markdown/native`): native views for text, tables, lists, footnotes and Shiki-highlighted
  code; math, Mermaid and ECharts in an optional, hardened `react-native-webview`. Works in Expo and bare React Native.
- `react-llm-markdown/core`: the DOM-free parser (mdast), streaming repair and security policies both renderers share.
- End-to-end suite in Chromium (`npm run e2e`): web viewer, React Native renderer through the Expo example app, and the
  WebView documents; 24 attack payloads and performance budgets.
- Docs: [security](docs/security.md), [performance](docs/performance.md) and a generated
  [end-to-end test report](docs/test-report.md) (`npm run docs:report`).
- Playground on GitHub Pages: edit or stream Markdown and see the web and React Native renderers side by side.
- `react-llm-markdown` CLI: view a local `.md` file in the browser with live reload.
