# スタートガイド

## Web（React、Next.js、Vite）

パッケージと、Web レンダラーが使うライブラリをインストールします（これらは peer dependencies なので、React Native アプリが
インストールすることはありません）。

```bash
npm install react-llm-markdown \
  streamdown @streamdown/code @streamdown/math \
  @streamdown/mermaid @streamdown/cjk echarts
```

スタイルを一度だけインポートし、レンダリングします。

```tsx
import { MarkdownView } from 'react-llm-markdown';
import 'react-llm-markdown/styles.css';

export function Answer({ text, done }: { text: string; done: boolean }) {
  return <MarkdownView streaming={!done}>{text}</MarkdownView>;
}
```

- `streaming` はテキストがまだ届いている間は `true` にします。未完成の Markdown が補修され、新しい単語がフェードインします。
- Tailwind の設定は不要です。`styles.css` はビルド済みで、そのユーティリティクラスには `rlm:` というプレフィックスが付いているため、
  あなたのクラスと衝突することはありません。
- Next.js の App Router では、`MarkdownView` はクライアントコンポーネントです（`'use client'` はパッケージにすでに含まれています）。

詳しくは [Web レンダラー](web) をご覧ください。

## React Native と Expo

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

Expo Go、Expo の開発ビルド、素の React Native で動作します。純粋な JavaScript で、独自のネイティブモジュールは持ちません。
`webView` を渡さない場合、数式・ダイアグラム・チャートはソースのまま表示されます。

詳しくは [React Native レンダラー](react-native) をご覧ください。

## ターミナルから任意の .md ファイルを開く

```bash
npx react-llm-markdown README.md
```

ファイルをブラウザで開き、保存するたびに再読み込みします。詳しくは [CLI ビューアー](cli) をご覧ください。

## 回答をストリーミングする

テキストが増えるたびにそれを渡し、モデルの出力が終わるまで `streaming` を渡します。

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

ストリーミング中は、閉じられていない `**bold`、途中までのテーブル、開いたままのコードフェンスも完成しているかのようにレンダリングされます。
また、まだテキストが続いていない記号（`Hello **`）は、最初の文字が届くまで非表示になります。
