<div align="center">

<img alt="" src="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/icon.png" width="104">

# react-llm-markdown

**Safe, rich Markdown for React and React Native — built for text an LLM wrote.**

[![npm](https://img.shields.io/npm/v/react-llm-markdown)](https://www.npmjs.com/package/react-llm-markdown)
[![downloads](https://img.shields.io/npm/dm/react-llm-markdown)](https://www.npmjs.com/package/react-llm-markdown)
[![CI](https://github.com/mickey-ichi/react-llm-markdown/actions/workflows/ci.yml/badge.svg)](https://github.com/mickey-ichi/react-llm-markdown/actions/workflows/ci.yml)
[![provenance](https://img.shields.io/badge/npm-provenance-2f6bff)](https://www.npmjs.com/package/react-llm-markdown#provenance)
[![license](https://img.shields.io/npm/l/react-llm-markdown)](LICENSE)

[Playground](https://mickey-ichi.github.io/react-llm-markdown/) ·
[Documentation](https://mickey-ichi.github.io/react-llm-markdown/docs/introduction/) ·
[npm](https://www.npmjs.com/package/react-llm-markdown) ·
[Changelog](CHANGELOG.md)

**English** · [Tiếng Việt](README.vi.md) · [日本語](README.ja.md)

</div>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/web-dark.png">
    <img alt="Web renderer: a table, highlighted code, KaTeX math, a Mermaid diagram and an ECharts chart" src="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/web-light.png" width="620">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/ios-dark.png">
    <img alt="An iPhone (iOS 18 simulator): highlighted code, KaTeX math, a Mermaid diagram and an ECharts chart drawn in WebViews" src="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/ios-light.png" width="240">
  </picture>
  &nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/android-dark.png">
    <img alt="An Android 14 emulator: headings, a table, lists, highlighted code, math and a Mermaid diagram" src="https://raw.githubusercontent.com/mickey-ichi/react-llm-markdown/main/assets/android-light.png" width="240">
  </picture>
  <br>
  <sub>Web · iPhone (iOS 18 simulator) · Android 14 emulator — taken by the end-to-end tests</sub>
</p>

## Why

A model's answer is untrusted input. A prompt injection can make it reply with HTML, links, diagrams or chart options
built to run script, send data out or mislead the reader — and it streams in half-written. react-llm-markdown renders
the rich blocks models use, repairs Markdown as it streams, and neutralizes the rest, on the web and in React Native.

## Features

- **Rich blocks** — GFM tables, task lists and footnotes, Shiki code highlighting, KaTeX math, Mermaid diagrams,
  ECharts charts from a JSON fence, CJK-aware emphasis.
- **Streaming-ready** — half-written tables, code fences and emphasis render as if finished; no flashing `**`.
- **Hardened by default** — sanitized HTML, a URL allowlist, DOM-clobbering protection, locked-down Mermaid and KaTeX,
  an allowlist and limits for chart options, an image allowlist hook. [Tested with 27 attack payloads in a real browser](https://mickey-ichi.github.io/react-llm-markdown/docs/test-report/).
- **Web and React Native** — one package, one parser and one set of security rules; native views on the phone, with
  math, diagrams and charts in a sandboxed WebView. Works in Expo Go.
- **Drop-in** — prebuilt, prefixed CSS (no Tailwind setup), light and dark themes, server rendering, plugins loaded on
  demand.
- **CLI** — `npx react-llm-markdown README.md` opens any Markdown file in the browser with live reload.

## Quick start

### Web (React, Next.js, Vite)

```bash
npm install react-llm-markdown streamdown @streamdown/code @streamdown/math @streamdown/mermaid @streamdown/cjk echarts
```

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return <MarkdownView streaming={!done}>{text}</MarkdownView>;
}
```

### React Native and Expo

```bash
npm install react-llm-markdown
npx expo install react-native-webview   # optional: math, Mermaid and charts
```

```tsx
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return (
    <MarkdownView streaming={!done} webView={WebView}>
      {text}
    </MarkdownView>
  );
}
```

### Any Markdown file

```bash
npx react-llm-markdown README.md
```

### Examples

| | |
|---|---|
| [Next.js](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/nextjs) | App Router chat page: a route handler streams the answer, `MarkdownView` renders it |
| [React Native (Expo)](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/react-native) | One screen with a streamed answer, WebView blocks and a Copy button; runs in Expo Go |

## Documentation

| | |
|---|---|
| [Comparison](https://mickey-ichi.github.io/react-llm-markdown/docs/comparison/) | Next to react-markdown, Streamdown and the React Native renderers |
| [Getting started](https://mickey-ichi.github.io/react-llm-markdown/docs/getting-started/) | Install, streaming an answer |
| [Web renderer](https://mickey-ichi.github.io/react-llm-markdown/docs/web/) | Props, images, theming, element overrides, SSR |
| [React Native renderer](https://mickey-ichi.github.io/react-llm-markdown/docs/react-native/) | Props, WebView blocks, highlighting, links, self-hosting |
| [Code, math, diagrams, charts](https://mickey-ichi.github.io/react-llm-markdown/docs/rich-blocks/) | Live examples and the rules for each block |
| [Core API](https://mickey-ichi.github.io/react-llm-markdown/docs/core/) | The DOM-free parser and security policies |
| [CLI viewer](https://mickey-ichi.github.io/react-llm-markdown/docs/cli/) | Options and safety |
| [FAQ](https://mickey-ichi.github.io/react-llm-markdown/docs/faq/) | Tailwind, Next.js, Expo Go, offline, image leaks |

## Compatibility

| | Supported |
|---|---|
| React | 18, 19 |
| React Native | 0.74 and later (Expo SDK 51+, Expo Go) |
| Frameworks | Next.js (App Router and Pages), Vite, Remix, any React setup |
| TypeScript | Types included; `bundler`, `node16` and `node10` resolution |
| Node.js (CLI) | 20 and later |
| Tested on | Chromium (web and React Native Web), [an iOS 18 simulator and an Android 14 emulator](https://github.com/mickey-ichi/react-llm-markdown/actions/workflows/native-device.yml) on every change |

## Security

Untrusted Markdown cannot run script, load from a host you did not allow, or navigate the page. The full policy —
HTML, URLs, Mermaid, KaTeX, ECharts and React Native WebViews — is in
[docs/security.md](https://mickey-ichi.github.io/react-llm-markdown/docs/security/), and every rule is checked end to end
([test report](https://mickey-ichi.github.io/react-llm-markdown/docs/test-report/)).

Images from any http(s) host load by default, as in other renderers; pass `isImageAllowed` to allow only your hosts.

Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

## Contributing

Bug reports, docs fixes and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Support

If react-llm-markdown saves you time, you can support its development through
[GitHub Sponsors](https://github.com/sponsors/mickey-ichi). Bug reports and pull requests are just as welcome.

## License

[MIT](LICENSE) © mickey-ichi. The CLI viewer bundles third-party packages; their licenses ship in
`dist/viewer/THIRD_PARTY_LICENSES.txt`.
