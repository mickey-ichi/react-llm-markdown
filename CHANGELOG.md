# Changelog

## 0.1.0 — unreleased

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
