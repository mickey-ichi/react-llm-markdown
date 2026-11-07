# FAQ

## How is this different from react-markdown or Streamdown?

On the web, `MarkdownView` is built on [Streamdown](https://streamdown.ai) (itself built on the same unified/remark
ecosystem as react-markdown). On top of it, this package adds:

- hardening for untrusted model output — Mermaid and KaTeX locked down, an ECharts allowlist with limits, a stricter URL
  policy, DOM-clobbering protection, an image allowlist hook — tested with 27 attack payloads;
- ECharts charts from a JSON fence, `\( \)` / `\[ \]` math, chat-style line breaks;
- prebuilt, prefixed CSS (no Tailwind setup);
- a **React Native** renderer with the same parser and policies, and a CLI viewer.

## Do I need Tailwind?

No. `react-llm-markdown/styles.css` is prebuilt. Its utility classes are prefixed `rlm:`, so they never clash with your
own Tailwind (or anything else).

## Does it work with Next.js, Remix, Vite?

Yes. `MarkdownView` is a client component (`'use client'` is included). On the server it renders plain Markdown; code
highlighting, math, diagrams and charts attach in the browser.

## Why do math, diagrams and charts use a WebView on React Native?

KaTeX, Mermaid and ECharts draw with the DOM (HTML, SVG, canvas), which React Native does not have. Everything else —
text, lists, tables, code with highlighting — is drawn with native views. The WebViews are sandboxed: a strict
Content-Security-Policy, exactly the pinned script files, no navigation. See [Security](security).

## Does the React Native renderer work offline?

Text, tables, lists and code do. Mermaid and ECharts load their script from a CDN; host them yourself with the `scripts`
prop (see [React Native renderer](react-native)). Math falls back to the system's MathML when KaTeX's stylesheet can't
load.

## Does it work in Expo Go?

Yes: it is plain JavaScript (Shiki runs on its JavaScript regex engine, no WebAssembly) and `react-native-webview` is
included in Expo Go.

## How do I stop a prompt injection from leaking data through images?

Pass `isImageAllowed` so only your own hosts load (web and native):

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

A refused image shows its alt text and is never requested.

## Is raw HTML supported?

On the web, it is parsed and sanitized: no scripts, iframes, styles, forms or event handlers; `br`, `sub`, `sup`,
`mark`, `details` and `summary` are allowed in addition to standard prose tags. On React Native, HTML is never rendered
as HTML — only its text.

## Why is `$5` not turned into math?

A single `$` is never math, so prices stay text. Use `$$ … $$`, `\( … \)` or `\[ … \]`.

## Can I add languages to code highlighting on React Native?

Yes, with `createCodeHighlighter([...DEFAULT_LANGUAGES, ...more])` and grammars from `@shikijs/langs`. On the web,
Shiki loads any language on demand.

## Can I use the parser or the security rules without React?

Yes: `react-llm-markdown/core` has no DOM or React dependency. See [Core API](core).

## Which versions are supported?

React 18 and 19; React Native 0.74 and later (Expo SDK 51+); Node.js 20+ for the CLI.

## How do I report a security issue?

Privately, through [GitHub Security Advisories](https://github.com/mickey-ichi/react-llm-markdown/security/advisories/new) —
never in a public issue.
