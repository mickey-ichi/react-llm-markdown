import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, Platform, ScrollView, Text, useColorScheme, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

// The demo document (also used by the end-to-end tests in ../e2e/native.spec.ts).
const DOC = `# Native demo

Some **bold**, _italic_, ~~struck~~, \`inline code\`, <mark>highlight</mark> and a [link](https://example.com).
Footnote here[^1]. 日本語の**「強調」**です。

| Name | Value |
|---|---:|
| alpha | 1 |
| beta | 22 |

1. first
2. second

- [x] done
- [ ] todo

> A quote.

\`\`\`ts
export function hello(name: string): string {
  return \`Hello, \${name}\`;
}
\`\`\`

Inline math \\( E = mc^2 \\) and display math:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

\`\`\`mermaid
flowchart LR
  A[Start] --> B{OK?}
  B -- Yes --> C[Done]
\`\`\`

\`\`\`echarts
{"title":{"text":"Sales"},"xAxis":{"type":"category","data":["Mon","Tue","Wed"]},"yAxis":{"type":"value"},"series":[{"type":"bar","data":[5,20,36]}]}
\`\`\`

## Payloads

<img src="x" onerror="window.__pwned='img'">

<script>window.__pwned='script'</script>

[bad link](javascript:window.__pwned='link') and [relative](docs/page.md)

[^1]: The footnote.
`;

/**
 * Web build only: `?md=<url>` replaces the demo document with that Markdown file. The end-to-end tests use it to
 * feed payloads and large documents to the native renderer.
 */
function useDocumentFromUrl(fallback: string): string | null {
  const source = Platform.OS === 'web' ? new URLSearchParams(globalThis.location?.search ?? '').get('md') : null;
  const [text, setText] = useState<string | null>(source ? null : fallback);
  useEffect(() => {
    if (!source) return;
    void fetch(source)
      .then((response) => response.text())
      .then(setText);
  }, [source]);
  return text;
}

const STREAM = 'Streaming **bold text** and a table:\n\n| a | b |\n|---|---|\n| 1 | 2 |\n';

export default function App() {
  const device = useColorScheme();
  const [dark, setDark] = useState(device === 'dark');
  const [pressed, setPressed] = useState('');
  const [copied, setCopied] = useState('');
  const [streamed, setStreamed] = useState<string | null>(null);
  const doc = useDocumentFromUrl(DOC);
  const [renders, setRenders] = useState(1);

  // Simulate an LLM answer arriving a few characters at a time.
  useEffect(() => {
    if (streamed === null || streamed.length >= STREAM.length) return;
    const timer = setTimeout(() => setStreamed(STREAM.slice(0, streamed.length + 4)), 15);
    return () => clearTimeout(timer);
  }, [streamed]);

  const background = dark ? '#09090b' : '#ffffff';
  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button onPress={() => setDark((value) => !value)} testID="toggle-theme" title={dark ? 'Light' : 'Dark'} />
          <Button onPress={() => setStreamed('')} testID="start-stream" title="Stream" />
          <Button onPress={() => setRenders((count) => count + 1)} testID="rerender" title="Re-render" />
        </View>
        <Text style={{ color: dark ? '#fafafa' : '#18181b' }} testID="events">{`pressed:${pressed} copied:${copied} renders:${renders}`}</Text>
        {streamed !== null ? (
          <View testID="stream">
            <MarkdownView colorScheme={dark ? 'dark' : 'light'} streaming={streamed.length < STREAM.length}>
              {streamed}
            </MarkdownView>
            {streamed.length >= STREAM.length ? <Text testID="stream-done">done</Text> : null}
          </View>
        ) : null}
        <View testID="doc">
          {doc === null ? null : (
          <MarkdownView
            colorScheme={dark ? 'dark' : 'light'}
            // A new key remounts the view: "Re-render" shows the same document again from scratch.
            key={renders}
            onCopyCode={setCopied}
            onLinkPress={(url) => {
              setPressed(url);
              return false;
            }}
            // react-native-webview has no web implementation; on web these blocks show their source.
            webView={Platform.OS === 'web' ? undefined : WebView}
          >
            {doc}
          </MarkdownView>
          )}
        </View>
      </ScrollView>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </View>
  );
}
