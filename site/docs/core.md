# Core API

`react-llm-markdown/core` is the DOM-free part both renderers share. It runs anywhere JavaScript does — Node, a worker,
React Native — and every export is also available from the web and native entries.

## Parsing

```ts
import { parseMarkdown, prepareMarkdown } from 'react-llm-markdown/core';

const tree = parseMarkdown(text, { streaming: true });
```

| Function | |
|---|---|
| `parseMarkdown(source, options?)` | Parses into an [mdast](https://github.com/syntax-tree/mdast) tree: GFM, `$$` math, CJK emphasis, with the preparation below and the URL policy applied. Options: `streaming`, `softBreaks` (default `true`), `cjk` (default `true`). |
| `prepareMarkdown(source, { streaming? })` | The source-level pass every renderer runs: protocol-relative links neutralized, Mermaid config overrides removed, LaTeX delimiters converted and — while streaming — unfinished Markdown repaired. |
| `normalizeLatexDelimiters(source)` | `\( … \)` / `\[ … \]` → `$$`, only where the content looks like math, never inside code. |
| `stripDanglingMarker(text)` | Hides a `**`, `_`, `` ` `` or `~~` the stream has opened but not filled yet. |
| `remarkSoftBreaks()` | Remark plugin: a single newline becomes a line break, without breaking GFM tables. |

## Security policies

| Export | |
|---|---|
| `sanitizeMarkdownUrl(url)` | The URL allowlist: `http`, `https`, `mailto` and relative; `null` for anything else (judged as browsers read the URL). |
| `ALLOWED_URL_PROTOCOLS`, `ALLOWED_HTML_TAGS` | The lists behind the policy. |
| `MERMAID_CONFIG`, `stripMermaidConfigOverrides(md)`, `stripMermaidSourceOverrides(src)` | Mermaid's locked-down config and the directive / frontmatter stripping. |
| `KATEX_SECURITY_OPTIONS` | `trust: false`, `maxExpand: 1000`, `maxSize: 20`. |
| `parseEChartsSource(json)` | Parses and hardens a chart fence; throws when it is not a usable option. |
| `hardenEChartsOption(option)`, `sanitizeEChartsOption`, `restrictEChartsOption` | The steps of that hardening. |
| `ECHARTS_ALLOWED_OPTION_KEYS`, `ECHARTS_ALLOWED_SERIES_TYPES`, `ECHARTS_LIMITS`, `EChartsLimitError` | Its allowlists and limits. |
| `applyChartTextTheme(option, color)`, `applyLargeDataDefaults(option)` | Theme colors and large-data defaults the renderers add. |

Use them to apply the same rules elsewhere — for example, to check an answer on the server before storing it:

```ts
import { parseEChartsSource, sanitizeMarkdownUrl } from 'react-llm-markdown/core';

sanitizeMarkdownUrl('javascript:alert(1)'); // null
parseEChartsSource('{"series":[{"type":"custom"}]}'); // { series: [] }
```
