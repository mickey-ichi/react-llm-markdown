# React Native example (Expo)

One screen that streams an answer into `MarkdownView` from `react-llm-markdown/native`. Text, lists, tables and
highlighted code are native views. Math, the Mermaid diagram and the ECharts chart draw in a sandboxed WebView. Code
blocks get a Copy button.

```bash
cd examples/react-native
npm install
npm start
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator. It works in Expo Go and in bare React Native.

| File | |
|---|---|
| [`App.tsx`](App.tsx) | The screen: a simulated stream, `<MarkdownView streaming webView={WebView} onCopyCode>` |

`npm run web` runs it in a browser too. `react-native-webview` has no web version, so there math, diagrams and charts
show their source.

In a real app, append your LLM API's text deltas to the string you pass as children, and set `streaming` until the
stream ends.
