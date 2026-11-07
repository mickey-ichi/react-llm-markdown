# Security

react-llm-markdown renders text that a language model or a user wrote. That text is **untrusted**: a prompt injection
can make a model answer with HTML, links, diagrams or chart options built to run script, phone home or trick the reader.
The rule is simple: **nothing in the Markdown may run code, load from a host the reader did not choose, or change
the page outside the rendered block.**

Every rule below is tested in a real browser on the web renderer, the React Native renderer and the WebView documents:
see [test-report.md](test-report.md) (24 attack payloads) and `npm run e2e`.

## Where the rules live

All policies are in the DOM-free core (`react-llm-markdown/core`), so the web and React Native renderers enforce the same
ones. They are exported, so you can reuse them.

| Area | Function / constant | File |
|---|---|---|
| Links and images | `sanitizeMarkdownUrl`, `ALLOWED_URL_PROTOCOLS`, `stripProtocolRelativeMarkdownLinks` | [src/core/security.ts](../src/core/security.ts) |
| Raw HTML (web) | `ALLOWED_HTML_TAGS` on top of Streamdown's sanitizer, then `rehypeUrlPolicy` | [src/core/security.ts](../src/core/security.ts), [src/web/rehype-url-policy.ts](../src/web/rehype-url-policy.ts) |
| Mermaid | `MERMAID_CONFIG`, `stripMermaidConfigOverrides`, `withMermaidSourceGuard` | [src/core/security.ts](../src/core/security.ts) |
| KaTeX | `KATEX_SECURITY_OPTIONS`, `withKatexSecurity` | [src/core/security.ts](../src/core/security.ts) |
| ECharts | `parseEChartsSource`, `hardenEChartsOption`, `ECHARTS_LIMITS`, allowlists | [src/core/echarts-security.ts](../src/core/echarts-security.ts) |
| React Native WebView | CSP, SRI, `allowWebViewRequest` | [src/native/webview-html.ts](../src/native/webview-html.ts), [src/native/rich-block.tsx](../src/native/rich-block.tsx) |

## The rules

### 1. Raw HTML

- **Web:** HTML is parsed, sanitized, then the URL policy runs (rehype-raw → rehype-sanitize → `rehypeUrlPolicy`; the
  order is fixed in code and tested).
  `<script>`, `<iframe>`, `<style>`, `<meta>`, `<form>`, `<button>`, `<picture>`/`<source>` and every event handler
  (`onerror`, `onload`, …) are removed. Extra tags allowed because models use them: `br`, `sub`, `sup`, `mark`,
  `details`, `summary`. `<input>` survives only as a disabled checkbox (task lists), so a fake login form cannot be built.
- **React Native:** HTML is never rendered as HTML. Only its text is shown, with `<script>` and `<style>` contents
  dropped; `<mark>`, `<sub>`, `<sup>` and `<br>` are honored as styles.

### 2. Links and images

- Allowed: `http:`, `https:`, `mailto:`, and relative URLs / anchors. Everything else — `javascript:`, `vbscript:`,
  `file:`, `data:`, unknown schemes, and protocol-relative `//host` — is dropped. Upper case and leading spaces
  (`  JavaScript:`) do not get around it.
- `//host` destinations are rewritten to `#` before parsing, so no later step can mistake them for a path.
- Relative URLs are kept exactly as written (`guide.md`, `../img/a.png`), so links between documents work. (Streamdown's
  own rehype-harden is replaced by `rehypeUrlPolicy` for this reason: it resolved relative URLs against a dummy origin,
  turning `../guide.md` into `/guide.md` and blocking `guide.md`.)
- A refused link becomes plain text; a refused image is not rendered and **not requested**.
- External links open in a new tab with `rel="noopener noreferrer nofollow"` and no referrer; images load lazily with no
  referrer. Footnote links scroll inside their own view and do not change the page URL.
- On React Native, a link press goes to `onLinkPress` first; by default only http(s) / mailto open in the browser, and
  relative URLs only with a `baseUrl`.
- Images from any http(s) host are shown, like other Markdown renderers do: models attach generated and uploaded
  images. Restrict hosts with your own `components.img` (web) or a `baseUrl` + `onLinkPress` policy (native) if needed.

### 3. Mermaid

- `securityLevel: 'strict'` (sandboxed SVG, no click handlers) and `htmlLabels: false` (labels are SVG text, never HTML).
- `%%{init: …}%%` directives and frontmatter `config:` are removed from the exact code Mermaid renders — wherever the
  fence is (inside quotes and lists too), repeated until nothing changes, so a directive reassembled from pieces is
  removed as well. Otherwise a diagram could turn HTML labels or loose security back on.
- Sources over 50,000 characters are refused instead of freezing the page.

### 4. KaTeX

- `trust: false`: `\href`, `\url`, `\includegraphics`, `\htmlClass`, `\htmlId`, `\htmlStyle`, `\htmlData` render as
  errors, never as links, images or attributes.
- `maxExpand: 1000`: a macro-expansion bomb stops with an error instead of hanging.
- `maxSize: 20`: no size above 20em (`\rule{500em}{500em}` cannot cover the page).
- Set explicitly, so a library upgrade that changes defaults cannot loosen them.
- `\( … \)` / `\[ … \]` are converted to `$$`; single `$` is never math, so prices like "$5 and $10" stay text.

### 5. ECharts

A ```` ```echarts ```` fence is the riskiest input: ECharts draws outside the HTML sanitizer, inserts formatter strings as
HTML, and opens title / node links with `window.open`.

1. **JSON only.** The body is parsed with `JSON.parse`, never `eval`: functions cannot exist. Anything that is not a
   JSON object (JavaScript, `null`, arrays) is shown as source.
2. **Option allowlist.** Only `title`, `legend`, `grid`, axes, `polar`, `radar`, `singleAxis`, `parallel`, `calendar`,
   `dataZoom`, `visualMap`, `tooltip`, `axisPointer`, `dataset`, `series`, colors, `textStyle`, animation, `darkMode`,
   `aria`. Dropped: `graphic` (arbitrary images), `toolbox` (data view renders HTML, save-as-image downloads),
   `brush`, `geo`, `media` / `options` (alternate option sets that would bypass the list).
3. **Series allowlist.** `line`, `bar`, `pie`, `scatter`, `effectScatter`, `radar`, `funnel`, `gauge`, `heatmap`,
   `boxplot`, `candlestick`, `treemap`, `sunburst`, `sankey`, `graph`, `tree`, `parallel`, `themeRiver`. Dropped:
   `custom` (needs `renderItem` code), `pictorialBar` (image symbols), `map` / `lines` (geo registration).
4. **No links, images or CSS.** `link` / `sublink` (string) and title `target`s are removed at every depth, and
   `nodeClick: 'link'` becomes `false`; `image`, `extraCssText`, `image://…` symbols and `url(…)` values are removed.
5. **No HTML.** Every string loses its tags and stray `<` `>` (an unclosed `<img … onerror` would otherwise be closed
   by ECharts' own markup); every tooltip at any depth is forced to `renderMode: 'richText'`.
6. **Limits.** 1,000,000 characters, 50 series, 20,000 data points (series data, graph / sankey nodes, links and
   edges, nested `children`, `dataset.source`). Over a limit, the source is shown instead of a chart.

### 6. React Native WebView

Display math, Mermaid and ECharts are drawn in `react-native-webview` (only when you pass `webView`):

- The content is passed as JSON in a `<script type="application/json">` with `<`, `>`, `&`, U+2028/2029 escaped —
  never as markup.
- A Content-Security-Policy allows scripts only from the pinned script origin (math: KaTeX's stylesheet and fonts only from
  theirs), no other network access, `img-src data:`.
- Scripts and the KaTeX stylesheet load from pinned jsDelivr URLs with **Subresource Integrity** (a modified file is
  refused: diagrams and charts show their source, math falls back to MathML). Self-host with the `scripts` prop.
- No navigation away from the document, no file access, no new windows; the page can only report its height.
- Mermaid / ECharts options get the same hardening as on the web, applied in the app before the WebView sees them.
  Math is rendered by KaTeX in the app; its WebView runs no script from the network.

## Not covered

- What the model says. A safe renderer still shows a misleading answer or a phishing link with an http(s) URL; the
  link opens in a new tab without a referrer, but deciding whether to trust it is the reader's job.
- Content you inject yourself through `components` overrides.
- Mermaid's and ECharts' own vulnerabilities in the versions you install (keep them updated; `npm audit`).

Report a vulnerability privately: [SECURITY.md](../SECURITY.md).
