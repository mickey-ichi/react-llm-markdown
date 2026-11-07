# React Native renderer

```tsx
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

<MarkdownView streaming={!done} webView={WebView}>{text}</MarkdownView>;
```

Plain JavaScript on top of `react-native` — no native module of its own — so it works in Expo Go, Expo dev builds and
bare React Native.

## What is native, what is a WebView

- **Native views**: headings, paragraphs, emphasis, links, images, lists and task lists, quotes, tables (horizontal
  scroll), footnotes, inline code, and code blocks highlighted with Shiki on its JavaScript regex engine (no
  WebAssembly, runs on Hermes).
- **In a WebView, when you pass `webView`**: display math (KaTeX with its stylesheet; MathML when offline), Mermaid
  diagrams and ECharts charts. Without `webView` they show their source. Inline math always shows its source.
- **Raw HTML** is never rendered as HTML: only its text is shown (`<mark>`, `<sub>`, `<sup>` and `<br>` are honored).

## Props

| Prop | Default | |
|---|---|---|
| `children` | — | The Markdown source. |
| `streaming` | `false` | `true` while text is still arriving: incomplete Markdown is repaired; diagrams and charts show their source until done. |
| `webView` | — | `WebView` from `react-native-webview`, to draw math, Mermaid and charts. |
| `features` | all on | `{ code, math, mermaid, echarts, cjk }` — `false` turns one off. |
| `softBreaks` | `true` | A single newline becomes a line break. |
| `colorScheme` | device | `'light'` or `'dark'`. |
| `theme` | — | Override colors and sizes (`foreground`, `link`, `card`, `fontSize`, `lineHeight`, `monoFontFamily`, `chartHeight`, …). |
| `baseUrl` | — | Resolves relative links and images; without it they do not open or load. |
| `onLinkPress` | — | Called with the URL; return `false` to stop opening it in the browser. |
| `onCopyCode` | — | Shows a Copy button on code blocks and calls this with the code. |
| `isImageAllowed` | all | `(url) => boolean`. A refused image shows its alt text and is never requested. |
| `highlighter` | Shiki | A custom `(code, lang, scheme) => lines`, or `false` for plain code. |
| `scripts` | jsDelivr | `{ mermaid, echarts, katex }`: `{ url, integrity }` of what the WebViews load. |
| `style` | — | Style of the outer `View`. |

## Code highlighting

The default highlighter bundles these grammars (React Native loads everything up front, so the set is small):
JavaScript, TypeScript, JSX and TSX, JSON, shell, Python, HTML, CSS, SQL, YAML and diff. Add more from
`@shikijs/langs`:

```tsx
import { createCodeHighlighter, DEFAULT_LANGUAGES, MarkdownView } from 'react-llm-markdown/native';
import go from '@shikijs/langs/go';
import rust from '@shikijs/langs/rust';

const highlighter = createCodeHighlighter([...DEFAULT_LANGUAGES, go, rust]);

<MarkdownView highlighter={highlighter}>{text}</MarkdownView>;
```

## Links

Links open in the browser through `Linking` — only `http:`, `https:` and `mailto:`. Handle them yourself with
`onLinkPress`:

```tsx
<MarkdownView
  baseUrl="https://docs.example.com/guide/"
  onLinkPress={(url) => {
    if (url.startsWith('https://docs.example.com/')) {
      navigation.navigate('Doc', { url });
      return false; // handled
    }
  }}
>
  {text}
</MarkdownView>
```

## Self-hosting the WebView scripts

Mermaid, ECharts and KaTeX's stylesheet load from pinned jsDelivr URLs with Subresource Integrity. Serve them yourself
(offline apps, stricter networks):

```tsx
<MarkdownView
  webView={WebView}
  scripts={{
    mermaid: { url: 'https://assets.example.com/mermaid@11.17.2.min.js', integrity: 'sha384-…' },
    echarts: { url: 'https://assets.example.com/echarts@6.1.0.min.js', integrity: 'sha384-…' },
    katex: { url: 'https://assets.example.com/katex@0.19.1/katex.min.css', integrity: 'sha384-…' },
  }}
>
  {text}
</MarkdownView>
```

The WebView's Content-Security-Policy allows exactly these files and nothing else.

## Theme

`colorScheme` follows the device by default. Override any value:

```tsx
<MarkdownView theme={{ link: '#7c3aed', fontSize: 17, lineHeight: 26, chartHeight: 280 }}>{text}</MarkdownView>
```

`LIGHT_THEME` and `DARK_THEME` are exported if you want to start from them.
