# Getting started

## Web (React, Next.js, Vite)

Install the package and the web renderer's libraries (they are peer dependencies, so a React Native app never installs
them):

```bash
npm install react-llm-markdown \
  streamdown @streamdown/code @streamdown/math \
  @streamdown/mermaid @streamdown/cjk echarts
```

Import the styles once, then render:

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return <MarkdownView streaming={!done}>{text}</MarkdownView>;
}
```

- `streaming` is `true` while the text is still arriving: unfinished Markdown is repaired and new words fade in.
- No Tailwind setup is needed: `styles.css` is prebuilt, and its utility classes are prefixed `rlm:` so they never
  clash with yours.
- In the Next.js App Router, `MarkdownView` is a client component (`'use client'` is already in the package).

More: [Web renderer](web).

## React Native and Expo

```bash
npm install react-llm-markdown
npx expo install react-native-webview   # optional: math, Mermaid and charts
```

```tsx
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return (
    <MarkdownView streaming={!done} webView={WebView} onCopyCode={(code) => Clipboard.setStringAsync(code)}>
      {text}
    </MarkdownView>
  );
}
```

Works in Expo Go, Expo dev builds and bare React Native: plain JavaScript, no native module of its own. Without
`webView`, math, diagrams and charts show their source.

More: [React Native renderer](react-native).

## Any .md file, from the terminal

```bash
npx react-llm-markdown README.md
```

Opens the file in your browser and reloads it on every save. More: [CLI viewer](cli).

## Streaming an answer

Pass the text as it grows and `streaming` until the model is done:

```tsx
const [text, setText] = useState('');
const [done, setDone] = useState(false);

useEffect(() => {
  const stream = startAnswer(question); // your API
  stream.on('token', (token) => setText((t) => t + token));
  stream.on('end', () => setDone(true));
}, [question]);

return <MarkdownView streaming={!done}>{text}</MarkdownView>;
```

While streaming, an unclosed `**bold`, a half table or an open code fence render as if they were finished, and a marker
that has no text yet (`Hello **`) is hidden until its first character arrives.

## Examples

Complete apps to copy from, each with its own README:

- [Next.js](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/nextjs) — an App Router chat page. A route handler streams the answer; a client component reads the
  stream and renders it with `MarkdownView`.
- [React Native (Expo)](https://github.com/mickey-ichi/react-llm-markdown/tree/main/examples/react-native) — one screen with a streamed answer, math, a diagram and a chart in WebViews,
  and a Copy button on code. Runs in Expo Go.
