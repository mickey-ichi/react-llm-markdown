# Comparison

How react-llm-markdown compares with the Markdown renderers people usually reach for. Checked on 2026-11-07 against
each project's README, docs and published source; corrections are welcome in an
[issue](https://github.com/mickey-ichi/react-llm-markdown/issues).

On the web, react-llm-markdown is built **on** Streamdown, so it inherits its streaming and rendering core and adds the
rest on top.

## Web

| | react-llm-markdown | [Streamdown](https://streamdown.ai) | [react-markdown](https://github.com/remarkjs/react-markdown) |
|---|---|---|---|
| Repairs Markdown while streaming | ✅ incl. half tables and dangling markers | ✅ ([remend](https://github.com/vercel/streamdown)) | — |
| GFM tables, task lists, footnotes | ✅ | ✅ | with `remark-gfm` |
| Code highlighting | ✅ Shiki | with `@streamdown/code` (Shiki) | bring your own |
| Math | ✅ KaTeX, also `\( \)` / `\[ \]` | with `@streamdown/math` | with `remark-math` + `rehype-katex` |
| Mermaid diagrams | ✅ strict mode, directives stripped | with `@streamdown/mermaid` | — |
| Charts from a code fence | ✅ ECharts, with an option allowlist and limits | via a custom renderer | — |
| Raw HTML | sanitized | sanitized (GitHub schema) | off by default; `rehype-raw` + `rehype-sanitize` to opt in |
| `javascript:` links blocked | ✅ | ✅ | ✅ |
| Link / image allowlists | strict by default (http, https, mailto, relative); `isImageAllowed` hook | available, default `*` | custom `urlTransform` |
| Styling | prebuilt, prefixed CSS | Tailwind setup (`@source`) and shadcn/ui variables | unstyled |
| License | MIT | Apache-2.0 | MIT |

react-llm-markdown also runs [27 attack payloads](test-report) against both renderers in a real browser on every change.

## React Native

| | react-llm-markdown | [react-native-marked](https://github.com/gmsgowtham/react-native-marked) | [react-native-markdown-display (RonRadtke fork)](https://github.com/RonRadtke/react-native-markdown-display) |
|---|---|---|---|
| Native views | ✅ | ✅ | ✅ |
| Repairs Markdown while streaming | ✅ same rules as the web | — | closes open code fences |
| GFM tables / task lists / footnotes | ✅ / ✅ / ✅ | ✅ / — / — | ✅ / — / — |
| Code highlighting | ✅ Shiki (JS engine, Hermes) | custom renderer | ✅ prism-react-renderer |
| Math, Mermaid, charts | ✅ in sandboxed WebViews (CSP, pinned scripts with SRI) | — | — |
| Raw HTML | shown as text | shown as text | off |
| `javascript:` links blocked | ✅ (http, https, mailto only) | not documented | ✅ (markdown-it) |
| Image allowlist | `isImageAllowed` | — | `allowedImageHandlers` |
| Expo Go | ✅ | ✅ | needs icon fonts |
| Same parser and rules on web | ✅ | — | — |

The original `react-native-markdown-display` (last release 2023) says in its README that it is no longer actively
maintained.

## When to pick something else

- **react-markdown** — you render trusted, finished Markdown on the web and want the smallest, most established
  building block with the whole unified plugin ecosystem.
- **Streamdown** — your app already uses Tailwind and shadcn/ui, runs only on the web, and you want its defaults with
  your own policies.
- **react-native-marked** — you need plain Markdown text in a React Native app and nothing else (no streaming, no math
  or diagrams), with the fewest dependencies.

Choose react-llm-markdown when the Markdown comes from a model: it streams, it may be steered by a prompt injection, and
you want the same rich blocks and the same safety rules in the browser and on the phone.
