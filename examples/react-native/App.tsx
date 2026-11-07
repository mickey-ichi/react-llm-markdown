import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MarkdownView } from 'react-llm-markdown/native';

// A stand-in for your model's answer. In a real app, append the text deltas your LLM API streams instead.
const ANSWER = `Here is what **react-llm-markdown** draws on a phone.

## Code

\`\`\`ts
export async function* stream(text: string) {
  for (const word of text.split(' ')) yield word + ' ';
}
\`\`\`

## A table

| Renderer | Entry | Rich blocks |
|---|---|---|
| Web | \`react-llm-markdown\` | in the page |
| Native | \`react-llm-markdown/native\` | in a WebView |

- [x] native text, lists and tables
- [x] highlighted code with a Copy button
- [ ] nothing that runs script

## Math

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## A diagram

\`\`\`mermaid
flowchart LR
  Model -- stream --> App -- text --> MarkdownView
\`\`\`

## A chart

\`\`\`echarts
{"xAxis":{"type":"category","data":["Mon","Tue","Wed","Thu","Fri"]},"yAxis":{"type":"value"},"series":[{"type":"bar","data":[120,200,150,80,170]}]}
\`\`\`

A link a prompt injection might add, [like this](javascript:alert(1)), does nothing.
`;

/** Simulates an LLM stream: reveals `text` a few characters at a time after `start()`. */
function useFakeStream(text: string) {
  const [shown, setShown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setShown(0);
    timer.current = setInterval(() => {
      setShown((count) => {
        if (count >= text.length && timer.current) clearInterval(timer.current);
        return Math.min(count + 6, text.length);
      });
    }, 16);
  };
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);
  return { text: text.slice(0, shown), done: shown >= text.length, start };
}

export default function App() {
  const dark = useColorScheme() === 'dark';
  const answer = useFakeStream(ANSWER);
  useEffect(answer.start, []);

  const colors = dark
    ? { background: '#09090b', foreground: '#fafafa', bubble: '#27272a' }
    : { background: '#ffffff', foreground: '#18181b', bubble: '#f4f4f5' };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.question, { backgroundColor: colors.bubble, color: colors.foreground }]}>
          Show me what you can render.
        </Text>
        <MarkdownView
          onCopyCode={(code) => void Clipboard.setStringAsync(code)}
          streaming={!answer.done}
          // Math, Mermaid and charts draw in a sandboxed WebView. react-native-webview has no web version, so on the
          // web (`npm run web`) those blocks show their source instead.
          webView={Platform.OS === 'web' ? undefined : WebView}
        >
          {answer.text}
        </MarkdownView>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        disabled={!answer.done}
        onPress={answer.start}
        style={[styles.button, !answer.done && styles.disabled]}
      >
        <Text style={styles.buttonText}>{answer.done ? 'Stream again' : 'Streaming…'}</Text>
      </Pressable>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 64, paddingBottom: 96, gap: 12 },
  question: { alignSelf: 'flex-end', maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden' },
  button: { position: 'absolute', left: 16, right: 16, bottom: 32, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#facc15' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#18181b', fontWeight: '600' },
});
