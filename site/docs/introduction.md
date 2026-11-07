# Introduction

**react-llm-markdown** renders the Markdown a language model writes — in React on the web and in React Native — with
the rich blocks models like to use, and without letting that text run code.

A model's answer is untrusted input: a prompt injection can make it reply with HTML, links, diagrams or chart options
built to run script, phone home or mislead the reader. This library renders all of it and neutralizes the rest.

## What you get

- **Rich blocks**: GFM tables, task lists and footnotes, syntax highlighting (Shiki), math (KaTeX), Mermaid diagrams,
  ECharts charts from a JSON fence, CJK-aware emphasis.
- **Streaming**: half-written Markdown is repaired while an answer streams in, so a table or a code fence never breaks
  the layout and `**` never flashes on screen.
- **LLM habits handled**: `\( … \)` / `\[ … \]` math, a single newline as a line break.
- **Hardened by default**: sanitized HTML, a URL allowlist, locked-down Mermaid and KaTeX, an allowlist and limits for
  chart options — [tested with 27 attack payloads](test-report) on every renderer.
- **Web and native from one package**, sharing the same parser and security policies.

## Three entry points

| Import | For |
|---|---|
| `react-llm-markdown` (or `/web`) | React on the web, built on [Streamdown](https://streamdown.ai) |
| `react-llm-markdown/native` | React Native and Expo: native views, WebView for math, Mermaid and charts |
| `react-llm-markdown/core` | The DOM-free part both share: parsing, streaming repair, security policies |

On React Native, `import … from 'react-llm-markdown'` resolves to the native entry by itself.

There is also a CLI that opens any `.md` file in your browser with live reload:

```bash
npx react-llm-markdown README.md
```

## Next

- [Getting started](getting-started) — install and render your first answer
- [Playground](../../) — paste or stream Markdown and compare web and React Native
- [Security](security) — what is blocked, and why
